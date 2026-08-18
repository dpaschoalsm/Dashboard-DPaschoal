import Papa from 'papaparse';
import { PeriodData } from '../types';
import { parseMatrixToPeriods } from './csvParser';

export const DEFAULT_SHAREPOINT_LINK =
  'https://dpaschoal-my.sharepoint.com/:x:/g/personal/giovana_gomes_dpaschoal_com_br/IQBvvDokxYFyQJ0jJrIb0k6ZAcXj5KIDaEJdkT_9YN2vQ6s?e=jpaBrg';

export const DEFAULT_SPREADSHEET_LINK = DEFAULT_SHAREPOINT_LINK;

export interface SyncResult {
  periods: PeriodData[];
  sheetName: string;
  provider: string;
}

/**
 * Extracts Google Spreadsheet ID from any standard Google Sheets sharing link
 */
export function extractGoogleSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match && match[1] ? match[1] : null;
}

/**
 * Fetches and parses an online spreadsheet (Google Sheets or SharePoint)
 * Handles direct public CSV export with automatic backend fallback
 */
export async function fetchAndParseOnlineSpreadsheet(targetUrl: string): Promise<SyncResult> {
  const cleanUrl = (targetUrl || DEFAULT_SPREADSHEET_LINK).trim();

  // 1. If Google Sheets link:
  const googleSheetId = extractGoogleSpreadsheetId(cleanUrl);
  if (googleSheetId) {
    try {
      // Direct CORS-enabled CSV export
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${googleSheetId}/gviz/tq?tqx=out:csv`;
      const gvizRes = await fetch(gvizUrl);
      
      if (gvizRes.ok) {
        const csvText = await gvizRes.text();
        // Check if response is actual CSV and not HTML login page
        if (!csvText.startsWith('<!DOCTYPE html') && !csvText.startsWith('<html')) {
          const parsed = Papa.parse<any[]>(csvText, { skipEmptyLines: true });
          if (parsed.data && parsed.data.length > 1) {
            const periods = parseMatrixToPeriods(parsed.data);
            return {
              periods,
              sheetName: 'Planilha1',
              provider: 'Google Planilhas (Direto)',
            };
          }
        }
      }
    } catch (gvizErr) {
      console.warn('[Sync] Direct Google Sheets CSV fetch failed, trying backend API:', gvizErr);
    }
  }

  // 2. Use backend sync proxy for SharePoint / Google Sheets XLSX
  const response = await fetch('/api/sync-sharepoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: cleanUrl }),
  });

  const responseText = await response.text();
  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(
      'A planilha retornou uma resposta inesperada. Verifique se o link possui permissão pública de compartilhamento (Qualquer pessoa com o link).'
    );
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Falha ao sincronizar com a planilha.');
  }

  if (!data.rows || data.rows.length === 0) {
    throw new Error('A planilha retornada não possui linhas de dados.');
  }

  const periods = parseMatrixToPeriods(data.rows);
  return {
    periods,
    sheetName: data.sheetName || 'Acompanhamento',
    provider: data.provider || (googleSheetId ? 'Google Planilhas' : 'SharePoint'),
  };
}
