import React, { useState, useRef, useEffect } from 'react';
import { PeriodData } from '../types';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  Sparkles,
  Layers,
  Check,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';

export type DateFilterSelection =
  | { mode: 'single'; periodId: string }
  | { mode: 'range'; startPeriodId: string; endPeriodId: string }
  | { mode: 'consolidated' };

interface DateRangePickerProps {
  periods: PeriodData[];
  selection: DateFilterSelection;
  onChangeSelection: (newSel: DateFilterSelection) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  periods,
  selection,
  onChangeSelection,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (periods.length === 0) {
    return null;
  }

  const latestPeriod = periods[periods.length - 1];
  const firstPeriod = periods[0];

  // Helper to find index of a period by ID
  const getIndexById = (id: string) => periods.findIndex((p) => p.id === id);

  // Determine current active display label
  let displayTitle = '';
  let displaySubtitle = '';
  let activeIndexSingle = -1;

  if (selection.mode === 'consolidated') {
    displayTitle = 'Todo o Período (Consolidado)';
    displaySubtitle = `${periods.length} dias (${firstPeriod?.data} até ${latestPeriod?.data})`;
  } else if (selection.mode === 'single') {
    const p = periods.find((item) => item.id === selection.periodId) || latestPeriod;
    activeIndexSingle = getIndexById(p.id);
    displayTitle = p.data;
    displaySubtitle = 'Dia único';
  } else if (selection.mode === 'range') {
    const startP = periods.find((item) => item.id === selection.startPeriodId) || firstPeriod;
    const endP = periods.find((item) => item.id === selection.endPeriodId) || latestPeriod;
    const sIdx = getIndexById(startP.id);
    const eIdx = getIndexById(endP.id);
    const minIdx = Math.min(sIdx, eIdx);
    const maxIdx = Math.max(sIdx, eIdx);
    const count = maxIdx - minIdx + 1;
    displayTitle = `${periods[minIdx].data} até ${periods[maxIdx].data}`;
    displaySubtitle = `${count} ${count === 1 ? 'dia' : 'dias'}`;
  }

  // Stepper handlers
  const canStepPrev =
    selection.mode === 'single' && activeIndexSingle > 0;
  const canStepNext =
    selection.mode === 'single' && activeIndexSingle < periods.length - 1;

  const handleStepPrev = () => {
    if (selection.mode === 'single' && activeIndexSingle > 0) {
      onChangeSelection({ mode: 'single', periodId: periods[activeIndexSingle - 1].id });
    } else if (selection.mode === 'consolidated') {
      onChangeSelection({ mode: 'single', periodId: latestPeriod.id });
    }
  };

  const handleStepNext = () => {
    if (selection.mode === 'single' && activeIndexSingle < periods.length - 1) {
      onChangeSelection({ mode: 'single', periodId: periods[activeIndexSingle + 1].id });
    }
  };

  // Quick preset handlers
  const handleSelectLatest = () => {
    onChangeSelection({ mode: 'single', periodId: latestPeriod.id });
    setIsOpen(false);
  };

  const handleSelectConsolidated = () => {
    onChangeSelection({ mode: 'consolidated' });
    setIsOpen(false);
  };

  const handleSelectLastNDays = (n: number) => {
    if (periods.length <= 1) {
      onChangeSelection({ mode: 'single', periodId: latestPeriod.id });
      setIsOpen(false);
      return;
    }
    const startIdx = Math.max(0, periods.length - n);
    const endIdx = periods.length - 1;
    if (startIdx === endIdx) {
      onChangeSelection({ mode: 'single', periodId: periods[startIdx].id });
    } else {
      onChangeSelection({
        mode: 'range',
        startPeriodId: periods[startIdx].id,
        endPeriodId: periods[endIdx].id,
      });
    }
    setIsOpen(false);
  };

  const handleSelectMonth = (monthKeyword: string) => {
    const matching = periods.filter(
      (p) =>
        p.data.toLowerCase().includes(monthKeyword.toLowerCase()) ||
        p.data.includes(`/${monthKeyword}`)
    );
    if (matching.length > 0) {
      if (matching.length === 1) {
        onChangeSelection({ mode: 'single', periodId: matching[0].id });
      } else {
        onChangeSelection({
          mode: 'range',
          startPeriodId: matching[0].id,
          endPeriodId: matching[matching.length - 1].id,
        });
      }
      setIsOpen(false);
    }
  };

  // Range dropdown handlers
  const currentStartId =
    selection.mode === 'range'
      ? selection.startPeriodId
      : selection.mode === 'single'
      ? selection.periodId
      : firstPeriod?.id;

  const currentEndId =
    selection.mode === 'range'
      ? selection.endPeriodId
      : selection.mode === 'single'
      ? selection.periodId
      : latestPeriod?.id;

  const handleStartChange = (newStartId: string) => {
    const sIdx = getIndexById(newStartId);
    const eIdx = getIndexById(currentEndId);
    if (sIdx > eIdx) {
      // If start is after end, set end to start (single day) or swap
      onChangeSelection({
        mode: 'range',
        startPeriodId: newStartId,
        endPeriodId: newStartId,
      });
    } else if (sIdx === eIdx) {
      onChangeSelection({ mode: 'single', periodId: newStartId });
    } else {
      onChangeSelection({
        mode: 'range',
        startPeriodId: newStartId,
        endPeriodId: currentEndId,
      });
    }
  };

  const handleEndChange = (newEndId: string) => {
    const sIdx = getIndexById(currentStartId);
    const eIdx = getIndexById(newEndId);
    if (eIdx < sIdx) {
      // If end is before start, set start to end
      onChangeSelection({
        mode: 'range',
        startPeriodId: newEndId,
        endPeriodId: newEndId,
      });
    } else if (sIdx === eIdx) {
      onChangeSelection({ mode: 'single', periodId: newEndId });
    } else {
      onChangeSelection({
        mode: 'range',
        startPeriodId: currentStartId,
        endPeriodId: newEndId,
      });
    }
  };

  // Handle clicking a date cell in the visual grid
  const handleDateClickInGrid = (clickedId: string) => {
    if (selection.mode === 'single' || selection.mode === 'consolidated') {
      // Switch to single or start of a range
      onChangeSelection({ mode: 'single', periodId: clickedId });
    } else if (selection.mode === 'range') {
      const sIdx = getIndexById(selection.startPeriodId);
      const eIdx = getIndexById(selection.endPeriodId);
      const cIdx = getIndexById(clickedId);

      if (cIdx < sIdx) {
        // Expand start backwards
        onChangeSelection({ mode: 'range', startPeriodId: clickedId, endPeriodId: selection.endPeriodId });
      } else if (cIdx > eIdx) {
        // Expand end forwards
        onChangeSelection({ mode: 'range', startPeriodId: selection.startPeriodId, endPeriodId: clickedId });
      } else if (cIdx === sIdx && cIdx === eIdx) {
        // Single day clicked
        onChangeSelection({ mode: 'single', periodId: clickedId });
      } else {
        // Clicked inside existing range -> set end date to clicked date
        onChangeSelection({ mode: 'range', startPeriodId: selection.startPeriodId, endPeriodId: clickedId });
      }
    }
  };

  // Determine active range bounds for visual grid highlights
  let highlightStartIdx = -1;
  let highlightEndIdx = -1;
  if (selection.mode === 'single') {
    const idx = getIndexById(selection.periodId);
    highlightStartIdx = idx;
    highlightEndIdx = idx;
  } else if (selection.mode === 'range') {
    const sIdx = getIndexById(selection.startPeriodId);
    const eIdx = getIndexById(selection.endPeriodId);
    highlightStartIdx = Math.min(sIdx, eIdx);
    highlightEndIdx = Math.max(sIdx, eIdx);
  } else if (selection.mode === 'consolidated') {
    highlightStartIdx = 0;
    highlightEndIdx = periods.length - 1;
  }

  return (
    <div className="relative inline-block w-full" ref={popoverRef}>
      {/* Top Filter Bar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-2xs">
        {/* Left Side: Calendar Icon + Date Selector Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-[#DC2626]" />
            <span>Período:</span>
          </div>

          {/* Stepper buttons (prev/next day) */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
            <button
              onClick={handleStepPrev}
              disabled={!canStepPrev}
              title="Dia anterior"
              className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-md"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleStepNext}
              disabled={!canStepNext}
              title="Próximo dia"
              className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-md"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Date Range Display Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border flex items-center gap-2 transition-all cursor-pointer ${
              isOpen
                ? 'bg-red-50/80 border-[#DC2626] text-[#DC2626] ring-2 ring-[#DC2626]/20'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-800 border-gray-200 hover:border-gray-300'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-[#DC2626]" />
            <span className="font-bold text-gray-900">{displayTitle}</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-200/70 text-gray-600 font-medium">
              {displaySubtitle}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-[#DC2626]' : ''
              }`}
            />
          </button>
        </div>

        {/* Right Side: Quick Action Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Latest day button */}
          {latestPeriod && (
            <button
              onClick={handleSelectLatest}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                selection.mode === 'single' && selection.periodId === latestPeriod.id
                  ? 'bg-[#DC2626] text-white shadow-2xs font-bold'
                  : 'bg-red-50 text-[#DC2626] hover:bg-red-100 border border-red-200/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Último ({latestPeriod.data})
            </button>
          )}

          {/* 7 Days button */}
          <button
            onClick={() => handleSelectLastNDays(7)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selection.mode === 'range' &&
              selection.endPeriodId === latestPeriod.id &&
              getIndexById(selection.endPeriodId) - getIndexById(selection.startPeriodId) === 6
                ? 'bg-gray-900 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Últimos 7 dias
          </button>

          {/* Consolidated button */}
          <button
            onClick={handleSelectConsolidated}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              selection.mode === 'consolidated'
                ? 'bg-gray-900 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Consolidado
          </button>

          {/* Toggle Popover button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            title="Abrir calendário e intervalo personalizado"
            className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 border border-gray-200 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 sm:right-auto sm:w-[620px] mt-2 z-50 bg-white rounded-2xl border border-gray-200 shadow-xl p-5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#DC2626]" />
              <h4 className="text-sm font-bold text-gray-900">Selecionar Período ou Intervalo</h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100"
            >
              Fechar ✕
            </button>
          </div>

          {/* Presets Grid */}
          <div className="mb-4">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Atalhos Rápidos
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={handleSelectLatest}
                className="px-2.5 py-1 text-xs rounded-lg bg-red-50 text-[#DC2626] hover:bg-red-100 border border-red-200 font-medium"
              >
                🌟 Mais Recente ({latestPeriod?.data})
              </button>
              <button
                onClick={() => handleSelectLastNDays(7)}
                className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
              >
                Últimos 7 dias
              </button>
              <button
                onClick={() => handleSelectLastNDays(14)}
                className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
              >
                Últimos 14 dias
              </button>
              <button
                onClick={() => handleSelectLastNDays(30)}
                className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
              >
                Últimos 30 dias
              </button>
              <button
                onClick={() => handleSelectMonth('07')}
                className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
              >
                Mês Julho
              </button>
              <button
                onClick={() => handleSelectMonth('08')}
                className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
              >
                Mês Agosto
              </button>
              <button
                onClick={handleSelectConsolidated}
                className="px-2.5 py-1 text-xs rounded-lg bg-gray-900 text-white hover:bg-black font-medium"
              >
                Todo o Período
              </button>
            </div>
          </div>

          {/* Date Range Start & End Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200/80">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Data Inicial (De):
              </label>
              <select
                value={currentStartId}
                onChange={(e) => handleStartChange(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-medium bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#DC2626]/20 cursor-pointer"
              >
                {periods.map((p) => (
                  <option key={`start-${p.id}`} value={p.id}>
                    {p.data}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Data Final (Até):
              </label>
              <select
                value={currentEndId}
                onChange={(e) => handleEndChange(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-medium bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#DC2626]/20 cursor-pointer"
              >
                {periods.map((p) => (
                  <option key={`end-${p.id}`} value={p.id}>
                    {p.data}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Visual Date Grid / Timeline */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Clique nos dias para ajustar o intervalo:
              </label>
              <span className="text-xs font-semibold text-gray-600">{displaySubtitle}</span>
            </div>

            <div className="max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-200">
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-1.5">
                {periods.map((p, idx) => {
                  const isInRange =
                    highlightStartIdx !== -1 &&
                    highlightEndIdx !== -1 &&
                    idx >= highlightStartIdx &&
                    idx <= highlightEndIdx;

                  const isStart = idx === highlightStartIdx;
                  const isEnd = idx === highlightEndIdx;

                  return (
                    <button
                      key={p.id}
                      onClick={() => handleDateClickInGrid(p.id)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                        isStart || isEnd
                          ? 'bg-[#DC2626] text-white font-bold shadow-xs scale-102'
                          : isInRange
                          ? 'bg-red-100 text-[#DC2626] font-semibold'
                          : 'bg-white text-gray-700 hover:bg-gray-200/80 border border-gray-200/60'
                      }`}
                    >
                      <span>{p.data}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
            <div className="text-xs text-gray-600">
              Intervalo ativo: <strong className="text-gray-900">{displayTitle}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  handleSelectConsolidated();
                }}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                Limpar Filtro
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 text-xs font-bold bg-[#DC2626] hover:bg-[#b91c1c] text-white rounded-lg shadow-2xs cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
