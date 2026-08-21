import React, { useState, useRef, useEffect } from 'react';
import { PeriodData } from './types';
import { DEFAULT_PERIODS } from './utils/csvParser';
import { formatCurrency, formatPercent } from './utils/formatters';
import { MetricCard } from './components/MetricCard';
import { FunnelChart } from './components/FunnelChart';
import { FinancialComboChart } from './components/FinancialComboChart';
import { ConversionChart } from './components/ConversionChart';
import { ExportHeader } from './components/ExportHeader';
import { CsvUploaderModal } from './components/CsvUploaderModal';
import { ManualDataEditorModal } from './components/ManualDataEditorModal';
import {
  DateRangePicker,
  DateFilterSelection,
} from './components/DateRangePicker';
import {
  SharepointSyncModal,
  DEFAULT_SPREADSHEET_LINK,
} from './components/SharepointSyncModal';
import { fetchAndParseOnlineSpreadsheet } from './utils/spreadsheetSync';
import {
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

export default function App() {
  const [periods, setPeriods] = useState<PeriodData[]>(() => {
    try {
      const saved = localStorage.getItem('dpaschoal_dashboard_periods');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_PERIODS;
  });

  const [dateSelection, setDateSelection] = useState<DateFilterSelection>(() => {
    try {
      const saved = localStorage.getItem('dpaschoal_date_selection');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    const defaultLatest = DEFAULT_PERIODS[DEFAULT_PERIODS.length - 1]?.id || 'p2';
    return { mode: 'single', periodId: defaultLatest };
  });

  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSharepointModalOpen, setIsSharepointModalOpen] = useState(false);

  // Spreadsheet configuration state
  const [sharepointUrl, setSharepointUrl] = useState<string>(() => {
    const saved = localStorage.getItem('dpaschoal_sharepoint_url');
    if (saved && !saved.includes('eeYERK') && !saved.includes('bh8fTe') && saved.includes('jpaBrg')) {
      return saved;
    }
    localStorage.setItem('dpaschoal_sharepoint_url', DEFAULT_SPREADSHEET_LINK);
    return DEFAULT_SPREADSHEET_LINK;
  });

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('dpaschoal_last_sync_time') || null;
  });

  const [autoSyncOnLoad, setAutoSyncOnLoad] = useState<boolean>(() => {
    const val = localStorage.getItem('dpaschoal_autosync_onload');
    return val !== 'false'; // default to true for instant auto-sync
  });

  const [isSyncingSharepoint, setIsSyncingSharepoint] = useState(false);
  const [syncToast, setSyncToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const dashboardRef = useRef<HTMLDivElement>(null);

  // Save periods to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('dpaschoal_dashboard_periods', JSON.stringify(periods));
    } catch {
      // ignore
    }
  }, [periods]);

  // Save date selection to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dpaschoal_date_selection', JSON.stringify(dateSelection));
    } catch {
      // ignore
    }
  }, [dateSelection]);

  // Ensure date selection remains valid if periods change
  useEffect(() => {
    if (periods.length === 0) return;

    if (dateSelection.mode === 'single') {
      const exists = periods.some((p) => p.id === dateSelection.periodId);
      if (!exists) {
        setDateSelection({ mode: 'single', periodId: periods[periods.length - 1].id });
      }
    } else if (dateSelection.mode === 'range') {
      const startExists = periods.some((p) => p.id === dateSelection.startPeriodId);
      const endExists = periods.some((p) => p.id === dateSelection.endPeriodId);
      if (!startExists || !endExists) {
        setDateSelection({
          mode: 'range',
          startPeriodId: periods[0].id,
          endPeriodId: periods[periods.length - 1].id,
        });
      }
    }
  }, [periods]);

  const handleSaveSharepointUrl = (url: string) => {
    const cleanUrl = url.trim() || DEFAULT_SPREADSHEET_LINK;
    setSharepointUrl(cleanUrl);
    localStorage.setItem('dpaschoal_sharepoint_url', cleanUrl);
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    setAutoSyncOnLoad(enabled);
    localStorage.setItem('dpaschoal_autosync_onload', String(enabled));
  };

  const handleQuickSyncSharepoint = async () => {
    try {
      setIsSyncingSharepoint(true);
      setSyncToast(null);

      let targetUrl = (sharepointUrl || DEFAULT_SPREADSHEET_LINK).trim();
      if (targetUrl.includes('eeYERK')) {
        targetUrl = DEFAULT_SPREADSHEET_LINK;
        setSharepointUrl(DEFAULT_SPREADSHEET_LINK);
        localStorage.setItem('dpaschoal_sharepoint_url', DEFAULT_SPREADSHEET_LINK);
      }

      // Capture currently active date before updating
      let previousDate = '';
      if (dateSelection.mode === 'single') {
        const found = periods.find((p) => p.id === dateSelection.periodId);
        if (found) previousDate = found.data;
      }
      const previousCount = periods.length;

      const result = await fetchAndParseOnlineSpreadsheet(targetUrl);
      setPeriods(result.periods);

      let focusedPeriodName = '';

      if (dateSelection.mode === 'consolidated') {
        focusedPeriodName = 'Consolidado (Todos)';
      } else if (result.periods.length > previousCount) {
        // A new row was added to the spreadsheet! Focus on the newest row.
        const newest = result.periods[result.periods.length - 1];
        setDateSelection({ mode: 'single', periodId: newest.id });
        focusedPeriodName = `Novo período "${newest.data}"`;
      } else if (previousDate) {
        // Keep the exact same period date active so modifications are immediately visible!
        const matching = result.periods.find((p) => p.data === previousDate);
        if (matching) {
          setDateSelection({ mode: 'single', periodId: matching.id });
          focusedPeriodName = `Período "${matching.data}"`;
        } else if (result.periods.length > 0) {
          const latest = result.periods[result.periods.length - 1];
          setDateSelection({ mode: 'single', periodId: latest.id });
          focusedPeriodName = `Período "${latest.data}"`;
        }
      } else if (result.periods.length > 0) {
        const latest = result.periods[result.periods.length - 1];
        setDateSelection({ mode: 'single', periodId: latest.id });
        focusedPeriodName = `Período "${latest.data}"`;
      }

      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(timeStr);
      localStorage.setItem('dpaschoal_last_sync_time', timeStr);

      setSyncToast({
        type: 'success',
        message: `Planilha sincronizada! ${result.periods.length} períodos atualizados. Exibindo ${focusedPeriodName}.`,
      });

      // Auto dismiss success toast after 6s
      setTimeout(() => {
        setSyncToast((prev) => (prev?.type === 'success' ? null : prev));
      }, 6000);
    } catch (err: any) {
      console.error('Erro na sincronização rápida:', err);
      setSyncToast({
        type: 'error',
        message: `Erro ao sincronizar planilha: ${err.message || 'Verifique o link ou a conexão.'}`,
      });
    } finally {
      setIsSyncingSharepoint(false);
    }
  };

  // Auto-sync on mount if enabled
  useEffect(() => {
    if (autoSyncOnLoad) {
      handleQuickSyncSharepoint();
    }
  }, []);

  const handleReset = () => {
    setPeriods(DEFAULT_PERIODS);
    const lastP = DEFAULT_PERIODS[DEFAULT_PERIODS.length - 1];
    setDateSelection({ mode: 'single', periodId: lastP.id });
    localStorage.removeItem('dpaschoal_dashboard_periods');
  };

  // Calculate overall accumulated totals across ALL days/periods (Excel column averages for days with sales)
  const totalAccFaturamento = periods.reduce((acc, p) => acc + p.faturamento, 0);
  const totalAccLucroBruto = periods.reduce((acc, p) => acc + p.lucroBruto, 0);
  const totalAccInvestimento = periods.reduce((acc, p) => acc + (p.investimento ?? 0), 0);

  const totalPeriodsWithSales = periods.filter(
    (p) => (p.vendas && p.vendas > 0) || (p.ticketMedio && p.ticketMedio > 0)
  );

  const totalAccTicketMedio =
    totalPeriodsWithSales.length > 0
      ? totalPeriodsWithSales.reduce(
          (acc, p) => acc + (p.ticketMedio ?? (p.vendas > 0 ? p.faturamento / p.vendas : 0)),
          0
        ) / totalPeriodsWithSales.length
      : 0;

  const totalAccLucroBrutoMedio =
    totalPeriodsWithSales.length > 0
      ? totalPeriodsWithSales.reduce(
          (acc, p) => acc + (p.lucroBrutoMedio ?? (p.vendas > 0 ? p.lucroBruto / p.vendas : 0)),
          0
        ) / totalPeriodsWithSales.length
      : 0;

  const totalAccMargemBruta =
    totalPeriodsWithSales.length > 0
      ? totalPeriodsWithSales.reduce((acc, p) => {
          let val = p.margemBruta ?? (p.faturamento > 0 ? (p.lucroBruto / p.faturamento) * 100 : 0);
          if (Math.abs(val) <= 1.0 && val !== 0) val *= 100;
          return acc + val;
        }, 0) / totalPeriodsWithSales.length
      : 0;

  // Compute active slice & previous slice based on dateSelection
  let activeSlice: PeriodData[] = [];
  let prevSlice: PeriodData[] = [];
  let compLabel = 'vs. ant.';

  if (dateSelection.mode === 'consolidated') {
    activeSlice = periods;
    if (periods.length >= 2) {
      const last = periods[periods.length - 1];
      const prev = periods[periods.length - 2];
      prevSlice = [prev];
      compLabel = 'último dia';
    }
  } else if (dateSelection.mode === 'single') {
    const idx = periods.findIndex((p) => p.id === dateSelection.periodId);
    const activeP = idx >= 0 ? periods[idx] : periods[periods.length - 1] || periods[0];
    activeSlice = activeP ? [activeP] : [];
    if (idx > 0) {
      prevSlice = [periods[idx - 1]];
      compLabel = `vs ${periods[idx - 1].data}`;
    }
  } else if (dateSelection.mode === 'range') {
    const sIdx = periods.findIndex((p) => p.id === dateSelection.startPeriodId);
    const eIdx = periods.findIndex((p) => p.id === dateSelection.endPeriodId);
    const minIdx = Math.max(0, Math.min(sIdx, eIdx));
    const maxIdx = Math.min(periods.length - 1, Math.max(sIdx, eIdx));
    activeSlice = periods.slice(minIdx, maxIdx + 1);

    const rangeLen = maxIdx - minIdx + 1;
    const prevStartIdx = minIdx - rangeLen;
    if (prevStartIdx >= 0) {
      prevSlice = periods.slice(prevStartIdx, minIdx);
      compLabel = 'vs. per. anterior';
    } else if (minIdx > 0) {
      prevSlice = periods.slice(0, minIdx);
      compLabel = 'vs. período anterior';
    }
  }

  // Active slice aggregations
  const currentImpressoes = activeSlice.reduce((acc, p) => acc + p.impressoes, 0);
  const currentAlcance = activeSlice.reduce((acc, p) => acc + p.alcance, 0);
  const currentClick = activeSlice.reduce((acc, p) => acc + p.click, 0);
  const currentContatos = activeSlice.reduce((acc, p) => acc + p.contatos, 0);
  const currentOrcamentos = activeSlice.reduce((acc, p) => acc + p.orcamentos, 0);
  const currentVendas = activeSlice.reduce((acc, p) => acc + p.vendas, 0);
  const currentFaturamento = activeSlice.reduce((acc, p) => acc + p.faturamento, 0);
  const currentLucroBruto = activeSlice.reduce((acc, p) => acc + p.lucroBruto, 0);
  const currentInvestimento = activeSlice.reduce((acc, p) => acc + (p.investimento ?? 0), 0);

  const activeWithSales = activeSlice.filter(
    (p) => (p.vendas && p.vendas > 0) || (p.ticketMedio && p.ticketMedio > 0)
  );

  const currentTicketMedio =
    activeSlice.length === 1
      ? activeSlice[0].ticketMedio ?? (activeSlice[0].vendas > 0 ? activeSlice[0].faturamento / activeSlice[0].vendas : 0)
      : activeWithSales.length > 0
      ? activeWithSales.reduce(
          (acc, p) => acc + (p.ticketMedio ?? (p.vendas > 0 ? p.faturamento / p.vendas : 0)),
          0
        ) / activeWithSales.length
      : 0;

  const currentLucroBrutoMedio =
    activeSlice.length === 1
      ? activeSlice[0].lucroBrutoMedio ?? (activeSlice[0].vendas > 0 ? activeSlice[0].lucroBruto / activeSlice[0].vendas : 0)
      : activeWithSales.length > 0
      ? activeWithSales.reduce(
          (acc, p) => acc + (p.lucroBrutoMedio ?? (p.vendas > 0 ? p.lucroBruto / p.vendas : 0)),
          0
        ) / activeWithSales.length
      : 0;

  const currentMargemBruta =
    activeSlice.length === 1
      ? activeSlice[0].margemBruta ?? (activeSlice[0].faturamento > 0 ? (activeSlice[0].lucroBruto / activeSlice[0].faturamento) * 100 : 0)
      : activeWithSales.length > 0
      ? activeWithSales.reduce((acc, p) => {
          let val = p.margemBruta ?? (p.faturamento > 0 ? (p.lucroBruto / p.faturamento) * 100 : 0);
          if (Math.abs(val) <= 1.0 && val !== 0) val *= 100;
          return acc + val;
        }, 0) / activeWithSales.length
      : 0;

  // Percentage changes vs previous slice
  let changeFaturamento: number | null = null;
  let changeInvestimento: number | null = null;
  let changeTicketMedio: number | null = null;
  let changeLucroBruto: number | null = null;
  let changeLucroBrutoMedio: number | null = null;
  let changeMargemBruta: number | null = null;

  if (prevSlice.length > 0) {
    const prevFat = prevSlice.reduce((acc, p) => acc + p.faturamento, 0);
    const prevLucro = prevSlice.reduce((acc, p) => acc + p.lucroBruto, 0);
    const prevInv = prevSlice.reduce((acc, p) => acc + (p.investimento ?? 0), 0);

    const prevWithSales = prevSlice.filter(
      (p) => (p.vendas && p.vendas > 0) || (p.ticketMedio && p.ticketMedio > 0)
    );

    const prevTM =
      prevSlice.length === 1
        ? prevSlice[0].ticketMedio ?? (prevSlice[0].vendas > 0 ? prevSlice[0].faturamento / prevSlice[0].vendas : 0)
        : prevWithSales.length > 0
        ? prevWithSales.reduce((acc, p) => acc + (p.ticketMedio ?? 0), 0) / prevWithSales.length
        : 0;

    const prevLBM =
      prevSlice.length === 1
        ? prevSlice[0].lucroBrutoMedio ?? (prevSlice[0].vendas > 0 ? prevSlice[0].lucroBruto / prevSlice[0].vendas : 0)
        : prevWithSales.length > 0
        ? prevWithSales.reduce((acc, p) => acc + (p.lucroBrutoMedio ?? 0), 0) / prevWithSales.length
        : 0;

    const prevMB =
      prevSlice.length === 1
        ? prevSlice[0].margemBruta ?? (prevSlice[0].faturamento > 0 ? (prevSlice[0].lucroBruto / prevSlice[0].faturamento) * 100 : 0)
        : prevWithSales.length > 0
        ? prevWithSales.reduce((acc, p) => {
            let val = p.margemBruta ?? (p.faturamento > 0 ? (p.lucroBruto / p.faturamento) * 100 : 0);
            if (Math.abs(val) <= 1.0 && val !== 0) val *= 100;
            return acc + val;
          }, 0) / prevWithSales.length
        : 0;

    changeFaturamento = prevFat > 0 ? ((currentFaturamento - prevFat) / prevFat) * 100 : 0;
    changeLucroBruto = prevLucro > 0 ? ((currentLucroBruto - prevLucro) / prevLucro) * 100 : 0;
    changeInvestimento = prevInv > 0 ? ((currentInvestimento - prevInv) / prevInv) * 100 : currentInvestimento > 0 ? 100 : 0;
    changeTicketMedio = prevTM > 0 ? ((currentTicketMedio - prevTM) / prevTM) * 100 : 0;
    changeLucroBrutoMedio = prevLBM > 0 ? ((currentLucroBrutoMedio - prevLBM) / prevLBM) * 100 : 0;
    changeMargemBruta = prevMB > 0 ? ((currentMargemBruta - prevMB) / prevMB) * 100 : 0;
  }

  // Chart data: if filtered range is selected, pass the filtered slice; otherwise pass full periods
  const chartPeriods = activeSlice.length > 1 ? activeSlice : periods;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900 font-sans antialiased selection:bg-[#DC2626]/20">
      {/* Top Header Controls */}
      <ExportHeader
        exportRef={dashboardRef}
        onOpenCsvModal={() => setIsCsvModalOpen(true)}
        onOpenEditModal={() => setIsEditModalOpen(true)}
        onOpenSharepointModal={() => setIsSharepointModalOpen(true)}
        onQuickSyncSharepoint={handleQuickSyncSharepoint}
        isSyncingSharepoint={isSyncingSharepoint}
        lastSyncTime={lastSyncTime}
        onResetData={handleReset}
      />

      {/* Sync Status Toast Banner */}
      {syncToast && (
        <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3">
          <div
            className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200 ${
              syncToast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              {syncToast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{syncToast.message}</span>
            </div>
            <button
              onClick={() => setSyncToast(null)}
              className="text-gray-400 hover:text-gray-700 p-1 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Interactive Date Range & Period Picker Bar */}
        <div className="mb-6">
          <DateRangePicker
            periods={periods}
            selection={dateSelection}
            onChangeSelection={setDateSelection}
          />
        </div>

        {/* Exportable Dashboard Area */}
        <div
          ref={dashboardRef}
          className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-2xs space-y-8"
        >
          {/* Top Row: 6 Pill Metric Cards (Investimento as the 6th card, after Margem Bruta) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* 1. Faturamento */}
            <MetricCard
              label="Faturamento"
              value={formatCurrency(currentFaturamento)}
              accumulatedValue={formatCurrency(totalAccFaturamento)}
              changePercent={changeFaturamento}
              comparisonLabel={compLabel}
            />
            {/* 2. Lucro Bruto */}
            <MetricCard
              label="Lucro Bruto"
              value={formatCurrency(currentLucroBruto)}
              accumulatedValue={formatCurrency(totalAccLucroBruto)}
              changePercent={changeLucroBruto}
              comparisonLabel={compLabel}
            />
            {/* 3. Ticket Médio */}
            <MetricCard
              label="Ticket Médio"
              value={formatCurrency(currentTicketMedio)}
              accumulatedValue={formatCurrency(totalAccTicketMedio)}
              changePercent={changeTicketMedio}
              comparisonLabel={compLabel}
            />
            {/* 4. Lucro Bruto Médio */}
            <MetricCard
              label="Lucro Bruto Médio"
              value={formatCurrency(currentLucroBrutoMedio)}
              accumulatedValue={formatCurrency(totalAccLucroBrutoMedio)}
              changePercent={changeLucroBrutoMedio}
              comparisonLabel={compLabel}
            />
            {/* 5. Margem Bruta */}
            <MetricCard
              label="Margem Bruta"
              value={formatPercent(currentMargemBruta)}
              accumulatedValue={formatPercent(totalAccMargemBruta)}
              changePercent={changeMargemBruta}
              comparisonLabel={compLabel}
            />
            {/* 6. Investimento (Last card, after Margem Bruta) */}
            <MetricCard
              label="Investimento"
              value={formatCurrency(currentInvestimento)}
              accumulatedValue={formatCurrency(totalAccInvestimento)}
              changePercent={changeInvestimento}
              comparisonLabel={compLabel}
            />
          </div>

          {/* Middle Row: Funnel (Left 6 cols) + Faturamento x Lucro Bruto (Right 6 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-6 flex flex-col">
              <FunnelChart
                impressoes={currentImpressoes}
                alcance={currentAlcance}
                click={currentClick}
                contatos={currentContatos}
                orcamentos={currentOrcamentos}
                vendas={currentVendas}
              />
            </div>
            <div className="lg:col-span-6 flex flex-col">
              <FinancialComboChart periods={chartPeriods} />
            </div>
          </div>

          {/* Bottom Row: Taxas de Conversão (Full Width 12 cols) */}
          <div className="pt-2">
            <ConversionChart periods={chartPeriods} />
          </div>
        </div>
      </main>

      {/* CSV Uploader Modal */}
      <CsvUploaderModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onDataLoaded={(newPeriods) => {
          setPeriods(newPeriods);
          if (newPeriods.length > 0) {
            setDateSelection({ mode: 'single', periodId: newPeriods[newPeriods.length - 1].id });
          }
        }}
      />

      {/* Manual Data Editor Modal */}
      <ManualDataEditorModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        periods={periods}
        onSave={(updatedPeriods) => {
          setPeriods(updatedPeriods);
        }}
      />

      {/* SharePoint / OneDrive Sync Modal */}
      <SharepointSyncModal
        isOpen={isSharepointModalOpen}
        onClose={() => setIsSharepointModalOpen(false)}
        currentUrl={sharepointUrl}
        onSaveUrl={handleSaveSharepointUrl}
        onSyncSuccess={(newPeriods, sheetName) => {
          setPeriods(newPeriods);
          if (newPeriods.length > 0) {
            setDateSelection({ mode: 'single', periodId: newPeriods[newPeriods.length - 1].id });
          }
          const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          setLastSyncTime(timeStr);
          localStorage.setItem('dpaschoal_last_sync_time', timeStr);
          setSyncToast({
            type: 'success',
            message: `Planilha sincronizada (${newPeriods.length} períodos da aba "${sheetName}")!`,
          });
        }}
        lastSyncTime={lastSyncTime}
        autoSync={autoSyncOnLoad}
        onToggleAutoSync={handleToggleAutoSync}
      />
    </div>
  );
}
