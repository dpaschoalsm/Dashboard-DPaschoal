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

    if (isGoogleSheets) {
      arrayBuffer = await fetchGoogleSpreadsheetBuffer(rawUrl);
    } else {
      arrayBuffer = await fetchSharePointWorkbookBuffer(rawUrl);
    }

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
  } catch (error: any) {
    console.error('[Spreadsheet Sync Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Falha ao sincronizar com a planilha.',
    });
  }
}

// API Routes - multiple aliases for serverless & reverse proxies
app.post('/api/sync-sharepoint', handleSpreadsheetSync);
app.get('/api/sync-sharepoint', handleSpreadsheetSync);
app.post('/api/sync', handleSpreadsheetSync);
app.get('/api/sync', handleSpreadsheetSync);
app.post('/api/sharepoint', handleSpreadsheetSync);
app.get('/api/sharepoint', handleSpreadsheetSync);
app.post('/api/fetch-spreadsheet', handleSpreadsheetSync);
app.get('/api/fetch-spreadsheet', handleSpreadsheetSync);

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
