import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  DEFAULT_SHAREPOINT_URL,
  fetchGoogleSpreadsheetBuffer,
  fetchSharePointWorkbookBuffer,
  extractWorkbookRows,
} from './src/utils/workbookParser';

const app = express();
const PORT = 3000;

app.use(express.json());

// API Handler implementation
async function handleSpreadsheetSync(req: express.Request, res: express.Response) {
  try {
    const rawUrl = (req.body?.url || req.query?.url || DEFAULT_SHAREPOINT_URL).trim();
    if (!rawUrl) {
      return res.status(400).json({ success: false, error: 'URL da planilha não fornecida.' });
    }

    console.log(`[Spreadsheet Sync] Starting sync for: ${rawUrl}`);

    let arrayBuffer: ArrayBuffer;
    const isGoogleSheets = rawUrl.includes('docs.google.com/spreadsheets');

    // Stage 1: Download
    try {
      if (isGoogleSheets) {
        arrayBuffer = await fetchGoogleSpreadsheetBuffer(rawUrl);
      } else {
        arrayBuffer = await fetchSharePointWorkbookBuffer(rawUrl);
      }
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
      const { rows, sheetName } = extractWorkbookRows(arrayBuffer);
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
