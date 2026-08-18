import Papa from 'papaparse';
import { PeriodData } from '../types';
import { parseMatrixToPeriods } from './csvParser';
import { extractWorkbookRows } from './workbookParser';

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
 * Candidate API endpoints in order of preference
 */
const API_ENDPOINTS = ['/api/sync-sharepoint', '/api/sync', '/api/sharepoint'];

/**
 * Fetches and parses an online spreadsheet (Google Sheets or SharePoint)
 * Handles direct public CSV export with automatic backend fallback and CORS proxy fallback
 */
export async function fetchAndParseOnlineSpreadsheet(targetUrl: string): Promise<SyncResult> {
  const cleanUrl = (targetUrl || DEFAULT_SPREADSHEET_LINK).trim();

  // 1. If Google Sheets link, try direct browser CSV export first (zero server dependency)
  const googleSheetId = extractGoogleSpreadsheetId(cleanUrl);
  if (googleSheetId) {
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${googleSheetId}/gviz/tq?tqx=out:csv`;
      const gvizRes = await fetch(gvizUrl);

      if (gvizRes.ok) {
        const csvText = await gvizRes.text();
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

  // 2. Try backend API endpoints (/api/sync-sharepoint, /api/sync, etc.)
  let lastApiError: any = null;
  for (const endpoint of API_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl }),
      });

      // If 404 or 405 (route doesn't exist on this host), try next candidate
      if (response.status === 404 || response.status === 405) {
        continue;
      }

      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch {
        // Not JSON - check if it's a Vercel/Cloud error
        if (responseText.includes('FUNCTION_INVOCATION_FAILED')) {
          console.warn(`[Sync] Serverless invocation error on ${endpoint}. Trying fallback...`);
          lastApiError = new Error('Falha na execução da função no servidor (FUNCTION_INVOCATION_FAILED).');
          continue;
        }
        if (!response.ok) {
          throw new Error(`Erro HTTP ${response.status}: ${responseText.slice(0, 100)}`);
        }
        throw new Error('Resposta não-JSON recebida do servidor.');
      }

      if (!response.ok || !data.success) {
        const errorMsg = data.error || `Falha na sincronização (HTTP ${response.status}).`;
        throw new Error(errorMsg);
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
    } catch (err: any) {
      lastApiError = err;
      // If we got a specific error from the server (like "O SharePoint bloqueou..."), stop trying other endpoints and throw
      if (err.message && (err.message.includes('SharePoint') || err.message.includes('Google Planilhas') || err.message.includes('login'))) {
        throw err;
      }
    }
  }

  // 3. Fallback for Static / Edge environments (Vercel edge, GitHub Pages, etc.)
  // If backend endpoints failed, attempt download via CORS proxy in browser
  console.log('[Sync] Attempting direct client-side download fallback...');
  const directDownloadUrl = cleanUrl.includes('?') ? `${cleanUrl}&download=1` : `${cleanUrl}?download=1`;
  const corsProxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(directDownloadUrl)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(directDownloadUrl)}`,
  ];

  for (const proxyUrl of corsProxies) {
    try {
      const proxyRes = await fetch(proxyUrl);
      if (proxyRes.ok) {
        const arrayBuf = await proxyRes.arrayBuffer();
        const bytes = new Uint8Array(arrayBuf);
        // Check ZIP/XLSX header
        if (bytes.length > 500 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
          const { rows, sheetName } = extractWorkbookRows(arrayBuf);
          const periods = parseMatrixToPeriods(rows);
          return {
            periods,
            sheetName,
            provider: 'SharePoint (Navegador)',
          };
        }
      }
    } catch (proxyErr) {
      console.warn('[Sync] Proxy fallback failed:', proxyErr);
    }
  }

  throw lastApiError || new Error('Não foi possível conectar com a planilha. Verifique o link e as permissões.');
}
