import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as XLSX from 'xlsx';

const app = express();
const PORT = 3000;

app.use(express.json());

// Default saved spreadsheet URL provided by user (SharePoint / Google Sheets)
const DEFAULT_SPREADSHEET_URL =
  'https://dpaschoal-my.sharepoint.com/:x:/g/personal/giovana_gomes_dpaschoal_com_br/IQBvvDokxYFyQJ0jJrIb0k6ZAcXj5KIDaEJdkT_9YN2vQ6s?e=jpaBrg';

/**
 * Downloads a spreadsheet from Google Sheets
 */
async function fetchGoogleSpreadsheet(targetUrl: string): Promise<ArrayBuffer> {
  const match = targetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match || !match[1]) {
    throw new Error('Link do Google Planilhas inválido. Formato esperado: https://docs.google.com/spreadsheets/d/ID/edit');
  }
  const sheetId = match[1];
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;

  console.log(`[Spreadsheet Sync] Downloading Google Sheet from: ${exportUrl}`);
  const res = await fetch(exportUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
    redirect: 'follow',
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403 || res.url.includes('accounts.google.com')) {
      throw new Error(
        'A planilha do Google Planilhas não está pública. No Google Planilhas, clique em "Compartilhar" e selecione "Qualquer pessoa com o link pode ler".'
      );
    }
    throw new Error(`Erro ao baixar Google Planilha (HTTP ${res.status}): ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength < 100) {
    throw new Error('A planilha do Google retornou vazia ou requer permissões de visualização.');
  }

  return arrayBuffer;
}

/**
 * Downloads a spreadsheet from SharePoint / OneDrive using multi-step session token extraction
 */
async function fetchSharePointWorkbook(targetUrl: string): Promise<ArrayBuffer> {
  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  // Step 1: Hit raw sharing URL with manual redirect to capture FedAuth & session cookies
  console.log(`[SharePoint Sync] Step 1: Requesting initial sharing URL: ${targetUrl}`);
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

  console.log(
    `[SharePoint Sync] Step 1 status: ${initialRes.status}, location: ${
      location ? location.substring(0, 100) + '...' : 'none'
    }`
  );

  // If redirected to login without anonymous access
  if (location && (location.includes('login.microsoftonline.com') || location.includes('_forms/default.aspx'))) {
    throw new Error(
      'O link do SharePoint requer login na conta corporativa da Microsoft. Para sincronização sem login, certifique-se de que o link foi gerado como "Qualquer pessoa com o link".'
    );
  }

  const destinationUrl = location || targetUrl;

  // Step 2: Try fast direct download.aspx if sourcedoc or UniqueId is present in location URL
  const sourcedocMatch =
    destinationUrl.match(/sourcedoc=(%7B|\{)?([a-f0-9-]+)(%7D|\})?/i) ||
    destinationUrl.match(/UniqueId=([a-f0-9-]+)/i);

  if (sourcedocMatch && sourcedocMatch[2]) {
    const rawUuid = sourcedocMatch[2];
    try {
      const origin = new URL(destinationUrl).origin;
      // Extract pathname base (e.g. /personal/giovana_gomes_dpaschoal_com_br)
      const pathMatch = destinationUrl.match(/(\/personal\/[^\/]+)/);
      const personalPath = pathMatch ? pathMatch[1] : '';
      const fastDownloadUrl = `${origin}${personalPath}/_layouts/15/download.aspx?UniqueId=${rawUuid}&Translate=false`;

      console.log(`[SharePoint Sync] Trying fast direct download: ${fastDownloadUrl}`);
      const fastDlRes = await fetch(fastDownloadUrl, {
        headers: {
          'User-Agent': userAgent,
          Cookie: cookieHeader,
        },
        redirect: 'follow',
      });

      if (fastDlRes.ok) {
        const buf = await fastDlRes.arrayBuffer();
        if (buf.byteLength > 500) {
          console.log(`[SharePoint Sync] Fast direct download succeeded (${buf.byteLength} bytes).`);
          return buf;
        }
      }
    } catch (fastErr) {
      console.warn('[SharePoint Sync] Fast direct download attempt failed, falling back:', fastErr);
    }
  }

  // Step 3: Follow destination with cookies
  console.log(`[SharePoint Sync] Step 3: Requesting Doc.aspx / destination URL...`);
  const docRes = await fetch(destinationUrl, {
    headers: {
      'User-Agent': userAgent,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Cookie: cookieHeader,
    },
    redirect: 'follow',
  });

  // Append any new cookies from step 3
  const step3Cookies = getSetCookieHeaders(docRes);
  if (step3Cookies) {
    cookieHeader = cookieHeader ? `${cookieHeader}; ${step3Cookies}` : step3Cookies;
  }

  const docContentType = docRes.headers.get('content-type') || '';

  // If already returned a binary file
  if (
    docContentType.includes('spreadsheetml') ||
    docContentType.includes('ms-excel') ||
    docContentType.includes('octet-stream')
  ) {
    return await docRes.arrayBuffer();
  }

  const docText = await docRes.text();

  // Check if we can extract WOPI FileGetUrl (the direct binary download endpoint for Excel Online)
  const wopiMatch = docText.match(/var _wopiContextJson\s*=\s*(\{[\s\S]*?\});/);
  if (wopiMatch && wopiMatch[1]) {
    try {
      const wopiObj = JSON.parse(wopiMatch[1]);
      if (wopiObj.FileGetUrl) {
        console.log(`[SharePoint Sync] Step 4: Downloading from WOPI FileGetUrl...`);
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
            console.log(`[SharePoint Sync] Successfully downloaded ${buf.byteLength} bytes via WOPI FileGetUrl.`);
            return buf;
          }
        }
      }
    } catch (wopiErr) {
      console.warn('[SharePoint Sync] Could not parse _wopiContextJson:', wopiErr);
    }
  }

  // Fallback Step 5: Extract UniqueId / sourcedoc and try download.aspx
  const fallbackSourcedocMatch = destinationUrl.match(/sourcedoc=([^&]+)/) || destinationUrl.match(/UniqueId=([^&]+)/);
  if (fallbackSourcedocMatch && fallbackSourcedocMatch[1]) {
    const rawId = fallbackSourcedocMatch[1];
    const origin = new URL(destinationUrl).origin;
    const downloadUrl = `${origin}/personal/giovana_gomes_dpaschoal_com_br/_layouts/15/download.aspx?sourcedoc=${rawId}`;

    console.log(`[SharePoint Sync] Fallback: Trying direct download.aspx with sourcedoc...`);
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

  // Final fallback: try rawUrl with download=1
  const directUrl = targetUrl.includes('?') ? `${targetUrl}&download=1` : `${targetUrl}?download=1`;
  const rawDlRes = await fetch(directUrl, {
    headers: {
      'User-Agent': userAgent,
      Cookie: cookieHeader,
    },
    redirect: 'follow',
  });

  if (rawDlRes.ok) {
    const buf = await rawDlRes.arrayBuffer();
    if (buf.byteLength > 200) {
      return buf;
    }
  }

  throw new Error('Não foi possível obter o arquivo binário da planilha a partir do link fornecido.');
}

// API Route: Sync / Fetch data from Google Sheets or SharePoint
app.post('/api/sync-sharepoint', async (req, res) => {
  try {
    const rawUrl = (req.body.url || DEFAULT_SPREADSHEET_URL).trim();
    if (!rawUrl) {
      return res.status(400).json({ error: 'URL da planilha não fornecida.' });
    }

    console.log(`[Spreadsheet Sync] Starting sync for: ${rawUrl}`);

    let arrayBuffer: ArrayBuffer;
    const isGoogleSheets = rawUrl.includes('docs.google.com/spreadsheets');

    if (isGoogleSheets) {
      arrayBuffer = await fetchGoogleSpreadsheet(rawUrl);
    } else {
      arrayBuffer = await fetchSharePointWorkbook(rawUrl);
    }

    // Parse XLSX Workbook
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
      type: 'array',
      cellDates: true,
      cellNF: true,
      cellText: true,
    });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return res.status(400).json({ error: 'Nenhuma aba encontrada na planilha.' });
    }

    const sheet = workbook.Sheets[firstSheetName];
    // Use raw: false with dateNF so formatted values and numbers are easily parsed
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
      header: 1,
      raw: false,
      dateNF: 'yyyy-mm-dd',
    });

    console.log(`[Spreadsheet Sync] Loaded sheet "${firstSheetName}" with ${rows.length} rows.`);

    return res.json({
      success: true,
      provider: isGoogleSheets ? 'Google Sheets' : 'SharePoint',
      sheetName: firstSheetName,
      allSheets: workbook.SheetNames,
      rows,
      url: rawUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Spreadsheet Sync] Fetch error:', err);
    return res.status(500).json({
      error: `Erro ao conectar com a planilha: ${err.message || 'erro interno'}`,
    });
  }
});

// API Route: Get default configuration
app.get('/api/config', (req, res) => {
  res.json({
    defaultSpreadsheetUrl: DEFAULT_SPREADSHEET_URL,
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
