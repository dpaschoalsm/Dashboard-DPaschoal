import * as XLSX from 'xlsx';

export const DEFAULT_SHAREPOINT_URL =
  'https://dpaschoal-my.sharepoint.com/:x:/g/personal/giovana_gomes_dpaschoal_com_br/IQBvvDokxYFyQJ0jJrIb0k6ZAcXj5KIDaEJdkT_9YN2vQ6s?e=jpaBrg';

export const DEFAULT_GOOGLE_SHEETS_URL =
  'https://docs.google.com/spreadsheets/d/1nHeeRDmtPySVts6qb6nO-YocGmhKrNRN_nbeYNNphCc/edit?usp=sharing';

/**
 * Downloads a spreadsheet from Google Sheets
 */
export async function fetchGoogleSpreadsheetBuffer(targetUrl: string): Promise<ArrayBuffer> {
  const match = targetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match || !match[1]) {
    throw new Error('Link do Google Planilhas inválido. Formato esperado: https://docs.google.com/spreadsheets/d/ID/edit');
  }
  const sheetId = match[1];
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;

  const res = await fetch(exportUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    },
    redirect: 'follow',
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403 || res.url.includes('accounts.google.com')) {
      throw new Error(
        'A planilha do Google Planilhas não está pública. No Google Planilhas, selecione "Qualquer pessoa com o link".'
      );
    }
    throw new Error(`Erro ao baixar Google Planilha (HTTP ${res.status}): ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength < 100) {
    throw new Error('A planilha do Google retornou vazia.');
  }

  return arrayBuffer;
}

/**
 * Downloads a spreadsheet from SharePoint / OneDrive
 */
export async function fetchSharePointWorkbookBuffer(targetUrl: string): Promise<ArrayBuffer> {
  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';

  // Strategy 1: Direct &download=1 with redirect: follow
  const downloadUrl = targetUrl.includes('?') ? `${targetUrl}&download=1` : `${targetUrl}?download=1`;
  try {
    const directRes = await fetch(downloadUrl, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
    });

    if (directRes.ok) {
      const directBuf = await directRes.arrayBuffer();
      const directBytes = new Uint8Array(directBuf);
      if (directBytes.length > 500 && directBytes[0] === 0x50 && directBytes[1] === 0x4b) {
        return directBuf;
      }
    }
  } catch (directErr) {
    // Continue to next strategy
  }

  // Strategy 2: Session-based WOPI / download.aspx extractor
  const initialRes = await fetch(targetUrl, {
    headers: {
      'User-Agent': userAgent,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    redirect: 'manual',
  });

  const getSetCookieHeaders = (res: Response): string => {
    try {
      if (typeof (res.headers as any).getSetCookie === 'function') {
        const cookies = (res.headers as any).getSetCookie();
        return cookies.map((c: string) => c.split(';')[0]).filter(Boolean).join('; ');
      }
    } catch {
      // fallback
    }
    const single = res.headers.get('set-cookie');
    return single ? single.split(';')[0] : '';
  };

  let cookieHeader = getSetCookieHeaders(initialRes);
  const location = initialRes.headers.get('location');

  if (location && (location.includes('login.microsoftonline.com') || location.includes('_forms/default.aspx'))) {
    throw new Error(
      'O link do SharePoint requer login na conta Microsoft. Certifique-se de que o link foi gerado como "Qualquer pessoa com o link".'
    );
  }

  const destinationUrl = location || targetUrl;

  // Fast direct download if sourcedoc or UniqueId is present
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

      const fastDlRes = await fetch(fastDownloadUrl, {
        headers: {
          'User-Agent': userAgent,
          Cookie: cookieHeader,
        },
        redirect: 'follow',
      });

      if (fastDlRes.ok) {
        const buf = await fastDlRes.arrayBuffer();
        const bytes = new Uint8Array(buf);
        if (bytes.length > 500 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
          return buf;
        }
      }
    } catch (fastErr) {
      // Continue to next strategy
    }
  }

  // Follow destination
  const docRes = await fetch(destinationUrl, {
    headers: {
      'User-Agent': userAgent,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Cookie: cookieHeader,
    },
    redirect: 'follow',
  });

  const step3Cookies = getSetCookieHeaders(docRes);
  if (step3Cookies) {
    cookieHeader = cookieHeader ? `${cookieHeader}; ${step3Cookies}` : step3Cookies;
  }

  const docContentType = docRes.headers.get('content-type') || '';
  if (
    docContentType.includes('spreadsheetml') ||
    docContentType.includes('ms-excel') ||
    docContentType.includes('octet-stream')
  ) {
    return await docRes.arrayBuffer();
  }

  const docText = await docRes.text();

  // Extract WOPI FileGetUrl
  const wopiMatch = docText.match(/var _wopiContextJson\s*=\s*(\{[\s\S]*?\});/);
  if (wopiMatch && wopiMatch[1]) {
    try {
      const wopiObj = JSON.parse(wopiMatch[1]);
      if (wopiObj.FileGetUrl) {
        const fileRes = await fetch(wopiObj.FileGetUrl, {
          headers: {
            'User-Agent': userAgent,
            Cookie: cookieHeader,
          },
          redirect: 'follow',
        });

        if (fileRes.ok) {
          const buf = await fileRes.arrayBuffer();
          if (buf.byteLength > 200) {
            return buf;
          }
        }
      }
    } catch (wopiErr) {
      // Continue
    }
  }

  // Fallback with download.aspx
  const fallbackSourcedocMatch = destinationUrl.match(/sourcedoc=([^&]+)/) || destinationUrl.match(/UniqueId=([^&]+)/);
  if (fallbackSourcedocMatch && fallbackSourcedocMatch[1]) {
    const rawId = fallbackSourcedocMatch[1];
    const origin = new URL(destinationUrl).origin;
    const downloadUrl = `${origin}/personal/giovana_gomes_dpaschoal_com_br/_layouts/15/download.aspx?sourcedoc=${rawId}`;

    const dlRes = await fetch(downloadUrl, {
      headers: {
        'User-Agent': userAgent,
        Cookie: cookieHeader,
      },
      redirect: 'follow',
    });

    if (dlRes.ok) {
      const buf = await dlRes.arrayBuffer();
      if (buf.byteLength > 200) {
        return buf;
      }
    }
  }

  throw new Error('Não foi possível obter o arquivo .xlsx da planilha.');
}

/**
 * Extracts 2D array rows and sheet name from ArrayBuffer
 */
export function extractWorkbookRows(arrayBuffer: ArrayBuffer): { rows: any[][]; sheetName: string } {
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
    type: 'array',
    cellDates: true,
    cellNF: true,
    cellText: true,
  });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Nenhuma aba encontrada na planilha.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
    header: 1,
    raw: false,
    dateNF: 'dd/mm/yyyy',
    defval: '',
  });

  return { rows, sheetName: firstSheetName };
}
