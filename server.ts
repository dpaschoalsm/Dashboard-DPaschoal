import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as XLSX from 'xlsx';

const app = express();
const PORT = 3000;

app.use(express.json());

const DEFAULT_SHAREPOINT_URL =
  'https://dpaschoal-my.sharepoint.com/:x:/g/personal/giovana_gomes_dpaschoal_com_br/IQBvvDokxYFyQJ0jJrIb0k6ZAcXj5KIDaEJdkT_9YN2vQ6s?e=jpaBrg';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';

/**
 * Safe fetch helper with 15s timeout
 */
async function safeFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Parses binary buffer with XLSX
 */
function parseExcelBuffer(buffer: Buffer): { rows: any[][]; sheetName: string } {
  if (!buffer || buffer.length < 100) {
    throw new Error('O arquivo da planilha está vazio ou corrompido.');
  }

  const headerPreview = buffer.subarray(0, 150).toString('utf8');
  if (
    headerPreview.includes('<html') ||
    headerPreview.includes('<!DOCTYPE') ||
    headerPreview.includes('<HTML') ||
    headerPreview.includes('<?xml')
  ) {
    throw new Error(
      'O SharePoint bloqueou o download e retornou um HTML em vez do arquivo Excel (.xlsx). Verifique as permissões de compartilhamento.'
    );
  }

  if (!(buffer[0] === 0x50 && buffer[1] === 0x4b)) {
    throw new Error('O arquivo retornado não é uma planilha Excel (.xlsx) válida.');
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
      throw new Error('Nenhuma aba encontrada na planilha Excel.');
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
    throw new Error(`Falha no parse do Excel: ${err.message || 'formato inválido'}`);
  }
}

/**
 * Downloads binary buffer from Google Sheets
 */
async function fetchGoogleSheetsBuffer(targetUrl: string): Promise<Buffer> {
  const match = targetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match || !match[1]) {
    throw new Error('Link do Google Planilhas inválido.');
  }
  const sheetId = match[1];
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;

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
 * Downloads binary buffer from SharePoint
 */
async function fetchSharePointBuffer(targetUrl: string): Promise<Buffer> {
  const downloadUrl = targetUrl.includes('?') ? `${targetUrl}&download=1` : `${targetUrl}?download=1`;
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

  const initialRes = await safeFetch(targetUrl, {
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
      const fastDownloadUrl = `${origin}${personalPath}/_layouts/15/download.aspx?UniqueId=${rawUuid}&Translate=false`;

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
        const fileRes = await safeFetch(wopiObj.FileGetUrl, {
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

// API Handler implementation
async function handleSpreadsheetSync(req: express.Request, res: express.Response) {
  try {
    const rawUrl = (req.body?.url || req.query?.url || DEFAULT_SHAREPOINT_URL).trim();
    if (!rawUrl) {
      return res.status(400).json({ success: false, error: 'URL da planilha não fornecida.' });
    }

    console.log(`[Spreadsheet Sync] Starting sync for: ${rawUrl}`);

    let fileBuffer: Buffer;
    const isGoogleSheets = rawUrl.includes('docs.google.com/spreadsheets');

    // Stage 1: Download
    try {
      fileBuffer = isGoogleSheets
        ? await fetchGoogleSheetsBuffer(rawUrl)
        : await fetchSharePointBuffer(rawUrl);
    } catch (fetchErr: any) {
      console.error('[Spreadsheet Sync Fetch Error]:', fetchErr);
      return res.status(500).json({
        success: false,
        stage: 'fetch',
        error: fetchErr.message || 'Falha ao baixar os dados da planilha.',
      });
    }

    // Stage 2: Parse
    try {
      const { rows, sheetName } = parseExcelBuffer(fileBuffer);
      console.log(`[Spreadsheet Sync] Successfully parsed ${rows.length} rows from sheet "${sheetName}".`);

      return res.json({
        success: true,
        provider: isGoogleSheets ? 'Google Sheets' : 'SharePoint',
        sheetName,
        rows,
        url: rawUrl,
        timestamp: new Date().toISOString(),
      });
    } catch (parseErr: any) {
      console.error('[Spreadsheet Sync Parse Error]:', parseErr);
      return res.status(500).json({
        success: false,
        stage: 'parse',
        error: parseErr.message || 'Falha no processamento da planilha Excel (.xlsx).',
      });
    }
  } catch (fatalErr: any) {
    console.error('[Spreadsheet Sync Fatal Error]:', fatalErr);
    return res.status(500).json({
      success: false,
      stage: 'fatal',
      error: fatalErr.message || 'Erro interno no servidor ao sincronizar planilha.',
    });
  }
}

// API Routes
app.post('/api/sync-sharepoint', handleSpreadsheetSync);
app.get('/api/sync-sharepoint', handleSpreadsheetSync);
app.post('/api/sync', handleSpreadsheetSync);
app.get('/api/sync', handleSpreadsheetSync);
app.post('/api/sharepoint', handleSpreadsheetSync);
app.get('/api/sharepoint', handleSpreadsheetSync);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Config endpoint
app.get('/api/config', (req, res) => {
  res.json({
    defaultSpreadsheetUrl: DEFAULT_SHAREPOINT_URL,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
