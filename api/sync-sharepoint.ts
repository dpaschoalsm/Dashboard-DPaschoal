import type { Request, Response } from 'express';
import {
  DEFAULT_SHAREPOINT_URL,
  fetchGoogleSpreadsheetBuffer,
  fetchSharePointWorkbookBuffer,
  extractWorkbookRows,
} from '../src/utils/workbookParser';

export default async function handler(req: any, res: any) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const rawUrl = (req.body?.url || req.query?.url || DEFAULT_SHAREPOINT_URL).trim();
    if (!rawUrl) {
      return res.status(400).json({ error: 'URL da planilha não fornecida.' });
    }

    const isGoogleSheets = rawUrl.includes('docs.google.com/spreadsheets');
    const arrayBuffer = isGoogleSheets
      ? await fetchGoogleSpreadsheetBuffer(rawUrl)
      : await fetchSharePointWorkbookBuffer(rawUrl);

    const { rows, sheetName } = extractWorkbookRows(arrayBuffer);

    return res.status(200).json({
      success: true,
      provider: isGoogleSheets ? 'Google Sheets' : 'SharePoint',
      sheetName,
      rows,
    });
  } catch (error: any) {
    console.error('[API Handler Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Falha ao processar a planilha.',
    });
  }
}
