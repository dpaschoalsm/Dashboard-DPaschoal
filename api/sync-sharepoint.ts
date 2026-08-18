import * as XLSX from 'xlsx';

// Explicitly define Node.js Serverless runtime for Vercel
export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

const DEFAULT_SHAREPOINT_URL =
  'https://dpaschoal-my.sharepoint.com/:x:/g/personal/giovana_gomes_dpaschoal_com_br/IQBvvDokxYFyQJ0jJrIb0k6ZAcXj5KIDaEJdkT_9YN2vQ6s?e=jpaBrg';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';

/**
 * Safe fetch helper with 15s timeout and cache prevention
 */
async function safeFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      ...options,
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extracts rows and sheet name from a raw binary Buffer
 */
function parseExcelBuffer(buffer: Buffer): { rows: any[][]; sheetName: string } {
  if (!buffer || buffer.length < 100) {
    throw new Error('O buffer da planilha está vazio ou incompleto.');
  }

  // Check if Microsoft or Google returned an HTML page (login / block screen)
  const headerPreview = buffer.subarray(0, 150).toString('utf8');
  if (
    headerPreview.includes('<html') ||
    headerPreview.includes('<!DOCTYPE') ||
    headerPreview.includes('<HTML') ||
    headerPreview.includes('<?xml')
  ) {
    throw new Error(
      'O SharePoint bloqueou o download e retornou um HTML em vez do arquivo Excel (.xlsx). Verifique se o link possui permissão pública.'
    );
  }

  // Validate ZIP / XLSX magic signature (PK\x03\x04: 0x50, 0x4b, 0x03, 0x04)
  if (!(buffer[0] === 0x50 && buffer[1] === 0x4b)) {
    throw new Error('O arquivo baixado não possui a assinatura binária de uma planilha Excel (.xlsx).');
  }

  try {
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true,
      cellNF: true,
      cellText: true,
    });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('Nenhuma aba foi encontrada na planilha Excel.');
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
      header: 1,
      raw: false,
      dateNF: 'dd/mm/yyyy',
      defval: '',
    });

    return { rows, sheetName: firstSheetName };
  } catch (err: any) {
    throw new Error(`Falha no parse do Excel: ${err.message || 'formato de arquivo inválido'}`);
  }
}

/**
 * Downloads binary buffer from Google Sheets with fresh cache buster
 */
async function fetchGoogleSheets(targetUrl: string): Promise<Buffer> {
  const match = targetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match || !match[1]) {
    throw new Error('Link do Google Planilhas inválido.');
  }
  const sheetId = match[1];
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx&_nocache=${Date.now()}`;

  const res = await safeFetch(exportUrl, {
    headers: { 'User-Agent': USER_AGENT },
    redirect: 'follow',
  });

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error('O Google Planilhas retornou uma tela HTML. Verifique se o link está público.');
  }

  if (!res.ok) {
    throw new Error(`Google Planilhas retornou status HTTP ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Downloads binary buffer from SharePoint / OneDrive with cache busting
 */
async function fetchSharePoint(targetUrl: string): Promise<Buffer> {
  const timestamp = Date.now();
  const downloadUrl = targetUrl.includes('?')
    ? `${targetUrl}&download=1&_nocache=${timestamp}`
    : `${targetUrl}?download=1&_nocache=${timestamp}`;

  try {
    const directRes = await safeFetch(downloadUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
    });

    const directContentType = directRes.headers.get('content-type') || '';
    if (directRes.ok && !directContentType.includes('text/html')) {
      const arrayBuffer = await directRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length > 500 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
        return buffer;
      }
    }
  } catch (e) {
    // Continue to strategy 2
  }

  const initialRes = await safeFetch(`${targetUrl}&_t=${timestamp}`, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    redirect: 'manual',
  });

  const getCookies = (res: Response): string => {
    try {
      if (typeof (res.headers as any).getSetCookie === 'function') {
        const cookies = (res.headers as any).getSetCookie();
        return cookies.map((c: string) => c.split(';')[0]).filter(Boolean).join('; ');
      }
    } catch {
      // ignore
    }
    const single = res.headers.get('set-cookie');
    return single ? single.split(';')[0] : '';
  };

  let cookieHeader = getCookies(initialRes);
  const location = initialRes.headers.get('location');

  if (location && (location.includes('login.microsoftonline.com') || location.includes('_forms/default.aspx'))) {
    throw new Error('O SharePoint exigiu login Microsoft. O link deve ter permissão "Qualquer pessoa com o link".');
  }

  const destinationUrl = location || targetUrl;

  const sourcedocMatch =
    destinationUrl.match(/sourcedoc=(%7B|\{)?([a-f0-9-]+)(%7D|\})?/i) ||
    destinationUrl.match(/UniqueId=([a-f0-9-]+)/i);

  if (sourcedocMatch && sourcedocMatch[2]) {
    const rawUuid = sourcedocMatch[2];
    try {
      const origin = new URL(destinationUrl).origin;
      const pathMatch = destinationUrl.match(/(\/personal\/[^\/]+)/);
      const personalPath = pathMatch ? pathMatch[1] : '';
      const fastDownloadUrl = `${origin}${personalPath}/_layouts/15/download.aspx?UniqueId=${rawUuid}&Translate=false&_nocache=${timestamp}`;

      const fastRes = await safeFetch(fastDownloadUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Cookie: cookieHeader,
        },
        redirect: 'follow',
      });

      const fastContentType = fastRes.headers.get('content-type') || '';
      if (fastRes.ok && !fastContentType.includes('text/html')) {
        const arrayBuffer = await fastRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        if (buffer.length > 500 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
          return buffer;
        }
      }
    } catch (e) {
      // Continue
    }
  }

  const docRes = await safeFetch(destinationUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Cookie: cookieHeader,
    },
    redirect: 'follow',
  });

  const step3Cookies = getCookies(docRes);
  if (step3Cookies) {
    cookieHeader = cookieHeader ? `${cookieHeader}; ${step3Cookies}` : step3Cookies;
  }

  const docContentType = docRes.headers.get('content-type') || '';
  if (
    docContentType.includes('spreadsheetml') ||
    docContentType.includes('ms-excel') ||
    docContentType.includes('octet-stream')
  ) {
    const arrayBuffer = await docRes.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const docText = await docRes.text();
  const wopiMatch = docText.match(/var _wopiContextJson\s*=\s*(\{[\s\S]*?\});/);
  if (wopiMatch && wopiMatch[1]) {
    try {
      const wopiObj = JSON.parse(wopiMatch[1]);
      if (wopiObj.FileGetUrl) {
        const wopiUrl = `${wopiObj.FileGetUrl}&_ts=${timestamp}`;
        const fileRes = await safeFetch(wopiUrl, {
          headers: {
            'User-Agent': USER_AGENT,
            Cookie: cookieHeader,
          },
          redirect: 'follow',
        });

        const fileContentType = fileRes.headers.get('content-type') || '';
        if (fileRes.ok && !fileContentType.includes('text/html')) {
          const arrayBuffer = await fileRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          if (buffer.length > 500 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
            return buffer;
          }
        }
      }
    } catch (e) {
      // Continue
    }
  }

  throw new Error('O SharePoint bloqueou o download e retornou um HTML em vez do arquivo Excel.');
}

/**
 * Main Serverless API Handler
 */
export default async function handler(req: any, res: any) {
  // CORS & Anti-Cache configuration
  try {
    if (res && typeof res.setHeader === 'function') {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
      );
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  } catch (corsErr) {
    console.warn('[API Handler] Header warning:', corsErr);
  }

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') {
      return res.status(200).end();
    }
    if (typeof res.writeHead === 'function') {
      res.writeHead(200);
      return res.end();
    }
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const rawUrl = (body?.url || req.query?.url || DEFAULT_SHAREPOINT_URL).trim();
    if (!rawUrl) {
      return res.status(400).json({ success: false, error: 'URL da planilha não fornecida.' });
    }

    const isGoogleSheets = rawUrl.includes('docs.google.com/spreadsheets');
    let fileBuffer: Buffer;

    // Step 1: Download binary buffer
    try {
      fileBuffer = isGoogleSheets ? await fetchGoogleSheets(rawUrl) : await fetchSharePoint(rawUrl);
    } catch (fetchErr: any) {
      console.error('[API Fetch Error]:', fetchErr);
      return res.status(500).json({
        success: false,
        stage: 'fetch',
        error: fetchErr.message || 'Falha ao baixar os dados da planilha.',
      });
    }

    // Step 2: Parse Excel buffer
    try {
      const { rows, sheetName } = parseExcelBuffer(fileBuffer);
      return res.status(200).json({
        success: true,
        provider: isGoogleSheets ? 'Google Sheets' : 'SharePoint',
        sheetName,
        rows,
        timestamp: new Date().toISOString(),
      });
    } catch (parseErr: any) {
      console.error('[API Parse Error]:', parseErr);
      return res.status(500).json({
        success: false,
        stage: 'parse',
        error: parseErr.message || 'Falha no processamento da planilha Excel (.xlsx).',
      });
    }
  } catch (fatalErr: any) {
    console.error('[API Fatal Error]:', fatalErr);
    return res.status(500).json({
      success: false,
      stage: 'fatal',
      error: fatalErr.message || 'Erro interno no servidor ao sincronizar planilha.',
    });
  }
}
