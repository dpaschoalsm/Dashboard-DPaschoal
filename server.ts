import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as XLSX from 'xlsx';

const app = express();
const PORT = 3000;

app.use(express.json());

// Default saved SharePoint URL provided by user
const DEFAULT_SHAREPOINT_URL =
  'https://dpaschoal-my.sharepoint.com/:x:/g/personal/giovana_gomes_dpaschoal_com_br/IQBvvDokxYFyQJ0jJrIb0k6ZAcXj5KIDaEJdkT_9YN2vQ6s?e=bh8fTe';

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

  console.log(`[SharePoint Sync] Step 1 status: ${initialRes.status}, location: ${location ? location.substring(0, 80) + '...' : 'none'}`);

  // If redirected to login without anonymous access
  if (location && (location.includes('login.microsoftonline.com') || location.includes('_forms/default.aspx'))) {
    throw new Error(
      'O link do SharePoint requer login na conta corporativa da Microsoft. Para sincronização sem login, certifique-se de que o link foi gerado como "Qualquer pessoa com o link".'
    );
  }

  const destinationUrl = location || targetUrl;

  // Step 2: Follow destination with cookies
  console.log(`[SharePoint Sync] Step 2: Requesting Doc.aspx / destination URL...`);
  const docRes = await fetch(destinationUrl, {
    headers: {
      'User-Agent': userAgent,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Cookie: cookieHeader,
    },
    redirect: 'follow',
  });

  // Append any new cookies from step 2
  const step2Cookies = getSetCookieHeaders(docRes);
  if (step2Cookies) {
    cookieHeader = cookieHeader ? `${cookieHeader}; ${step2Cookies}` : step2Cookies;
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
        console.log(`[SharePoint Sync] Step 3: Downloading from WOPI FileGetUrl...`);
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

  // Fallback Step 4: Extract UniqueId / sourcedoc and try download.aspx
  const sourcedocMatch = destinationUrl.match(/sourcedoc=([^&]+)/) || destinationUrl.match(/UniqueId=([^&]+)/);
  if (sourcedocMatch && sourcedocMatch[1]) {
    const rawId = sourcedocMatch[1];
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

// API Route: Sync / Fetch data from SharePoint
app.post('/api/sync-sharepoint', async (req, res) => {
  try {
    const rawUrl = (req.body.url || DEFAULT_SHAREPOINT_URL).trim();
    if (!rawUrl) {
      return res.status(400).json({ error: 'URL do SharePoint não fornecida.' });
    }

    console.log(`[SharePoint Sync] Starting sync for: ${rawUrl}`);

    const arrayBuffer = await fetchSharePointWorkbook(rawUrl);

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

    console.log(`[SharePoint Sync] Loaded sheet "${firstSheetName}" with ${rows.length} rows.`);

    return res.json({
      success: true,
      sheetName: firstSheetName,
      allSheets: workbook.SheetNames,
      rows,
      url: rawUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[SharePoint Sync] Fetch error:', err);
    return res.status(500).json({
      error: `Erro ao conectar com o SharePoint: ${err.message || 'erro interno'}`,
    });
  }
});

// API Route: Get default configuration
app.get('/api/config', (req, res) => {
  res.json({
    defaultSharepointUrl: DEFAULT_SHAREPOINT_URL,
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
