import {
  DEFAULT_SHAREPOINT_URL,
  fetchGoogleSpreadsheetBuffer,
  fetchSharePointWorkbookBuffer,
  extractWorkbookRows,
} from '../src/utils/workbookParser';

export default async function handler(req: any, res: any) {
  // CORS configuration
  try {
    if (res && typeof res.setHeader === 'function') {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
      );
    }
  } catch (corsErr) {
    console.warn('[API Handler] CORS header error:', corsErr);
  }

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') {
      return res.status(200).end();
    }
    res.writeHead(200);
    return res.end();
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
    let arrayBuffer: ArrayBuffer;

    // 1. Download stage (wrapped in try/catch with detailed message)
    try {
      arrayBuffer = isGoogleSheets
        ? await fetchGoogleSpreadsheetBuffer(rawUrl)
        : await fetchSharePointWorkbookBuffer(rawUrl);
    } catch (fetchErr: any) {
      console.error('[API Fetch Error]:', fetchErr);
      return res.status(500).json({
        success: false,
        stage: 'fetch',
        error: fetchErr.message || 'Falha ao baixar os dados da planilha.',
      });
    }

    // 2. Excel Parsing stage (wrapped in try/catch with detailed message)
    try {
      const { rows, sheetName } = extractWorkbookRows(arrayBuffer);
      return res.status(200).json({
        success: true,
        provider: isGoogleSheets ? 'Google Sheets' : 'SharePoint',
        sheetName,
        rows,
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
      error: fatalErr.message || 'Erro interno no servidor ao processar planilha.',
    });
  }
}
