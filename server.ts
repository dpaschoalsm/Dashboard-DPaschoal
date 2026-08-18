import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as XLSX from 'xlsx';

const app = express();
const PORT = 3000;

app.use(express.json());

// Default saved SharePoint URL provided by user
const DEFAULT_SHAREPOINT_URL =
  'https://dpaschoal-my.sharepoint.com/:x:/g/personal/giovana_gomes_dpaschoal_com_br/IQBvvDokxYFyQJ0jJrIb0k6ZAcXj5KIDaEJdkT_9YN2vQ6s?e=eeYERK';

/**
 * Transforms a SharePoint sharing link to a direct download link
 */
function getDirectDownloadUrl(rawUrl: string): string {
  let urlStr = rawUrl.trim();
  try {
    const urlObj = new URL(urlStr);
    // If it's a SharePoint link, ensure download=1 is present
    if (urlObj.hostname.includes('sharepoint.com') || urlObj.hostname.includes('1drv.ms') || urlObj.hostname.includes('onedrive.live.com')) {
      urlObj.searchParams.set('download', '1');
      return urlObj.toString();
    }
  } catch {
    // fallback string manipulation
    if (urlStr.includes('?')) {
      urlStr += '&download=1';
    } else {
      urlStr += '?download=1';
    }
  }
  return urlStr;
}

// API Route: Sync / Fetch data from SharePoint
app.post('/api/sync-sharepoint', async (req, res) => {
  try {
    const rawUrl = req.body.url || DEFAULT_SHAREPOINT_URL;
    if (!rawUrl) {
      return res.status(400).json({ error: 'URL do SharePoint não fornecida.' });
    }

    const downloadUrl = getDirectDownloadUrl(rawUrl);
    console.log(`[SharePoint Sync] Fetching from: ${downloadUrl}`);

    const response = await fetch(downloadUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/octet-stream, text/csv, */*',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Não foi possível baixar o arquivo do SharePoint (Status HTTP: ${response.status} ${response.statusText}). Verifique se o link possui permissões de compartilhamento adequadas.`,
      });
    }

    const contentType = response.headers.get('content-type') || '';
    const arrayBuffer = await response.arrayBuffer();

    if (arrayBuffer.byteLength < 50) {
      return res.status(400).json({
        error: 'O arquivo retornado pelo SharePoint está vazio ou requer autenticação interativa.',
      });
    }

    // Try reading as XLSX / XLS / CSV
    try {
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
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
        header: 1,
        raw: true,
        dateNF: 'dd/mm/yyyy',
      });

      return res.json({
        success: true,
        sheetName: firstSheetName,
        allSheets: workbook.SheetNames,
        rows,
        downloadUrl,
        timestamp: new Date().toISOString(),
      });
    } catch (parseErr: any) {
      console.error('[SharePoint Sync] Parsing error:', parseErr);
      return res.status(422).json({
        error: `Não foi possível ler os dados da planilha: ${parseErr.message || 'formato inválido'}.`,
      });
    }
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
