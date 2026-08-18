import React, { useState, useRef, useEffect } from 'react';
import { PeriodData } from '../types';
import {
  parsePeriodDate,
  formatHotelDate,
  formatShortDate,
  getMonthName,
  isSameDay,
  isBetweenDates,
  mapPeriodsToDates,
} from '../utils/dateHelpers';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Check,
  RotateCcw,
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

  // Mapped list of periods with parsed JS dates
  const periodDateList = React.useMemo(() => mapPeriodsToDates(periods), [periods]);

  // Find default reference date (latest period's date, or current date)
  const latestItem = periodDateList[periodDateList.length - 1];
  const defaultDate = latestItem ? latestItem.date : new Date();

  // Calendar viewed Month & Year state
  const [viewYear, setViewYear] = useState<number>(() => defaultDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => defaultDate.getMonth());

  // Interactive range selection in-flight state (while choosing start & end in the popup)
  const [pickingState, setPickingState] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({ startDate: null, endDate: null });

  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // Synchronize calendar view & pickingState with active selection whenever popover opens or selection changes
  useEffect(() => {
    if (periodDateList.length === 0) return;

    if (selection.mode === 'single') {
      const match = periodDateList.find((p) => p.period.id === selection.periodId);
      if (match) {
        setPickingState({ startDate: match.date, endDate: match.date });
        setViewMonth(match.date.getMonth());
        setViewYear(match.date.getFullYear());
      }
    } else if (selection.mode === 'range') {
      const startMatch = periodDateList.find((p) => p.period.id === selection.startPeriodId);
      const endMatch = periodDateList.find((p) => p.period.id === selection.endPeriodId);
      if (startMatch && endMatch) {
        setPickingState({ startDate: startMatch.date, endDate: endMatch.date });
        setViewMonth(endMatch.date.getMonth());
        setViewYear(endMatch.date.getFullYear());
      }
    } else if (selection.mode === 'consolidated') {
      const first = periodDateList[0];
      const last = periodDateList[periodDateList.length - 1];
      if (first && last) {
        setPickingState({ startDate: first.date, endDate: last.date });
        setViewMonth(last.date.getMonth());
        setViewYear(last.date.getFullYear());
      }
    }
  }, [selection, periods, isOpen]);

  // Close popover on click outside
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

  // Get active start & end dates from selection
  let activeStartDate: Date = defaultDate;
  let activeEndDate: Date = defaultDate;

  if (selection.mode === 'single') {
    const match = periodDateList.find((p) => p.period.id === selection.periodId);
    if (match) {
      activeStartDate = match.date;
      activeEndDate = match.date;
    }
  } else if (selection.mode === 'range') {
    const sMatch = periodDateList.find((p) => p.period.id === selection.startPeriodId);
    const eMatch = periodDateList.find((p) => p.period.id === selection.endPeriodId);
    if (sMatch && eMatch) {
      activeStartDate = sMatch.date;
      activeEndDate = eMatch.date;
    }
  } else if (selection.mode === 'consolidated') {
    if (periodDateList.length > 0) {
      activeStartDate = periodDateList[0].date;
      activeEndDate = periodDateList[periodDateList.length - 1].date;
    }
  }

  // Helper to find periods matching a date range
  const applyDateRangeSelection = (start: Date, end: Date) => {
    const minTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const maxTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();

    const startT = Math.min(minTime, maxTime);
    const endT = Math.max(minTime, maxTime);

    // Find all periods within this timestamp window
    const matching = periodDateList.filter((item) => {
      const itemT = new Date(item.date.getFullYear(), item.date.getMonth(), item.date.getDate()).getTime();
      return itemT >= startT && itemT <= endT;
    });

    if (matching.length === 0) {
      // Fallback to closest period
      if (periodDateList.length > 0) {
        onChangeSelection({ mode: 'single', periodId: periodDateList[periodDateList.length - 1].period.id });
      }
      return;
    }

    if (matching.length === 1 || startT === endT) {
      onChangeSelection({ mode: 'single', periodId: matching[0].period.id });
    } else {
      onChangeSelection({
        mode: 'range',
        startPeriodId: matching[0].period.id,
        endPeriodId: matching[matching.length - 1].period.id,
      });
    }
  };

  // Calendar Day Click Handler
  const handleCalendarDayClick = (clickedDate: Date) => {
    if (!pickingState.startDate || (pickingState.startDate && pickingState.endDate)) {
      // First click: sets start date and clears end date (waiting for second click)
      setPickingState({ startDate: clickedDate, endDate: null });
    } else {
      // Second click: sets end date and applies
      let start = pickingState.startDate;
      let end = clickedDate;
      if (end.getTime() < start.getTime()) {
        const temp = start;
        start = end;
        end = temp;
      }
      setPickingState({ startDate: start, endDate: end });
      applyDateRangeSelection(start, end);
    }
  };

  // Month navigation in calendar
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Calculate days in the current view month for standard 7-column calendar
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Create array of calendar day cells
  const calendarCells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(null); // empty leading slots
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push(new Date(viewYear, viewMonth, day));
  }

  // Count days in active selection
  const daysDifference =
    Math.round(
      Math.abs(activeEndDate.getTime() - activeStartDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

  // Stepper handlers
  const activeIndex = periods.findIndex((p) => p.id === (selection.mode === 'single' ? selection.periodId : ''));
  const canStepPrev = selection.mode === 'single' && activeIndex > 0;
  const canStepNext = selection.mode === 'single' && activeIndex < periods.length - 1;

  const handleStepPrev = () => {
    if (canStepPrev) {
      onChangeSelection({ mode: 'single', periodId: periods[activeIndex - 1].id });
    }
  };

  const handleStepNext = () => {
    if (canStepNext) {
      onChangeSelection({ mode: 'single', periodId: periods[activeIndex + 1].id });
    }
  };

  // Quick preset shortcuts
  const handlePresetLatest = () => {
    const latest = periods[periods.length - 1];
    onChangeSelection({ mode: 'single', periodId: latest.id });
    setIsOpen(false);
  };

  const handlePresetConsolidated = () => {
    onChangeSelection({ mode: 'consolidated' });
    setIsOpen(false);
  };

  const handlePresetLastNDays = (n: number) => {
    if (periods.length <= 1) {
      handlePresetLatest();
      return;
    }
    const startIdx = Math.max(0, periods.length - n);
    const endIdx = periods.length - 1;
    onChangeSelection({
      mode: 'range',
      startPeriodId: periods[startIdx].id,
      endPeriodId: periods[endIdx].id,
    });
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={popoverRef}>
      {/* Hotel-Style Date Inputs Trigger Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-2xs">
        {/* Left Side: 2 Side-by-Side Date Boxes (Hotel Style) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Start Date Box */}
          <button
            onClick={() => setIsOpen(true)}
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              isOpen
                ? 'bg-blue-50/70 border-[#2563EB] text-[#2563EB] ring-2 ring-[#2563EB]/20 shadow-xs'
                : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300 hover:border-gray-400 shadow-2xs'
            }`}
          >
            <CalendarIcon className="w-4 h-4 text-[#2563EB] shrink-0" />
            <span className="capitalize">{formatHotelDate(activeStartDate)}</span>
          </button>

          <span className="text-gray-400 font-medium text-xs hidden sm:inline">até</span>

          {/* End Date Box */}
          <button
            onClick={() => setIsOpen(true)}
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              isOpen
                ? 'bg-blue-50/70 border-[#2563EB] text-[#2563EB] ring-2 ring-[#2563EB]/20 shadow-xs'
                : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300 hover:border-gray-400 shadow-2xs'
            }`}
          >
            <CalendarIcon className="w-4 h-4 text-[#2563EB] shrink-0" />
            <span className="capitalize">
              {selection.mode === 'single' ? formatHotelDate(activeStartDate) : formatHotelDate(activeEndDate)}
            </span>
          </button>

          {/* Days summary pill */}
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200/80 font-bold hidden md:inline-flex items-center">
            {selection.mode === 'consolidated'
              ? 'Todo o Período'
              : daysDifference === 1
              ? '1 dia selecionado'
              : `${daysDifference} dias selecionados`}
          </span>

          {/* Steppers (< and >) */}
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
        </div>

        {/* Right Side: Quick Action Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={handlePresetLatest}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              selection.mode === 'single' && selection.periodId === periods[periods.length - 1]?.id
                ? 'bg-[#2563EB] text-white shadow-2xs font-bold'
                : 'bg-blue-50 text-[#2563EB] hover:bg-blue-100 border border-blue-200/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Último ({periods[periods.length - 1]?.data})
          </button>

          <button
            onClick={() => handlePresetLastNDays(7)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all cursor-pointer"
          >
            Últimos 7 dias
          </button>

          <button
            onClick={handlePresetConsolidated}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              selection.mode === 'consolidated'
                ? 'bg-gray-900 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Consolidado
          </button>
        </div>
      </div>

      {/* Popover Calendar Modal (Hotel Style with strong elevated shadow & contrast) */}
      {isOpen && (
        <>
          {/* Subtle backdrop to make popup pop out */}
          <div
            className="fixed inset-0 z-40 bg-black/15 backdrop-blur-[1px] transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute left-0 sm:left-2 top-full mt-3 z-50 w-full sm:w-[380px] bg-white rounded-3xl border border-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.22)] ring-1 ring-black/5 p-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Month Header with Navigation Arrows */}
            <div className="relative flex items-center justify-between pb-3 mb-2">
              <button
                onClick={handlePrevMonth}
                title="Mês anterior"
                className="w-8 h-8 rounded-full border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center text-gray-700 shadow-2xs transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <h3 className="text-sm sm:text-base font-bold text-gray-900 capitalize">
                {getMonthName(viewMonth)} {viewYear}
              </h3>

              <button
                onClick={handleNextMonth}
                title="Próximo mês"
                className="w-8 h-8 rounded-full border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center text-gray-700 shadow-2xs transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday Row (Hotel style: D S T Q Q S S) */}
            <div className="grid grid-cols-7 gap-0 bg-gray-100/80 rounded-xl py-1.5 mb-1.5 text-center text-xs font-semibold text-gray-600">
              <span>D</span>
              <span>S</span>
              <span>T</span>
              <span>Q</span>
              <span>Q</span>
              <span>S</span>
              <span>S</span>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-y-1 gap-x-0 py-1">
              {calendarCells.map((dateObj, idx) => {
                if (!dateObj) {
                  return <div key={`empty-${idx}`} className="h-10 w-full" />;
                }

                // Check if this date corresponds to a period in the spreadsheet
                const hasData = periodDateList.some((item) => isSameDay(item.date, dateObj));

                // Determine active range bounds for rendering
                const rangeStart = pickingState.startDate || activeStartDate;
                const effectiveEnd = pickingState.endDate || hoverDate || pickingState.startDate || activeEndDate;

                const isStart = isSameDay(dateObj, rangeStart);
                const isEnd = isSameDay(dateObj, effectiveEnd);
                const inRange = isBetweenDates(dateObj, rangeStart, effectiveEnd);
                const isSingleSelected = isStart && isEnd;

                // Visual connecting background for range strip
                let bgStripClass = '';
                if (inRange && !isSingleSelected) {
                  bgStripClass = 'bg-blue-100/80';
                  if (isStart) {
                    bgStripClass = 'bg-gradient-to-r from-transparent 50% to-blue-100/80 50%';
                  } else if (isEnd) {
                    bgStripClass = 'bg-gradient-to-r from-blue-100/80 50% to-transparent 50%';
                  }
                }

                return (
                  <div
                    key={`day-${dateObj.toISOString()}`}
                    className={`relative h-10 flex items-center justify-center ${bgStripClass}`}
                    onMouseEnter={() => {
                      if (pickingState.startDate && !pickingState.endDate) {
                        setHoverDate(dateObj);
                      }
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleCalendarDayClick(dateObj)}
                      className={`w-9 h-9 rounded-full flex flex-col items-center justify-center text-xs font-semibold transition-all relative z-10 cursor-pointer ${
                        isStart || isEnd
                          ? 'bg-[#2563EB] text-white font-bold shadow-sm scale-105'
                          : inRange
                          ? 'text-[#1E40AF] font-bold hover:bg-blue-200/80'
                          : hasData
                          ? 'text-gray-900 hover:bg-gray-200/80 font-medium'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      <span>{dateObj.getDate()}</span>
                      {hasData && !isStart && !isEnd && (
                        <span className="w-1 h-1 rounded-full bg-[#2563EB] -mt-0.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Quick Presets Row in Popup */}
            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5">
              <button
                onClick={handlePresetLatest}
                className="px-2 py-1 text-[11px] rounded-lg bg-blue-50 text-[#2563EB] hover:bg-blue-100 font-semibold"
              >
                🌟 Mais Recente
              </button>
              <button
                onClick={() => handlePresetLastNDays(7)}
                className="px-2 py-1 text-[11px] rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
              >
                7 dias
              </button>
              <button
                onClick={() => handlePresetLastNDays(14)}
                className="px-2 py-1 text-[11px] rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
              >
                14 dias
              </button>
              <button
                onClick={() => handlePresetLastNDays(30)}
                className="px-2 py-1 text-[11px] rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
              >
                30 dias
              </button>
              <button
                onClick={handlePresetConsolidated}
                className="px-2 py-1 text-[11px] rounded-lg bg-gray-900 text-white hover:bg-black font-medium"
              >
                Consolidado
              </button>
            </div>

            {/* Bottom Hotel-Style Footer Bar: [ "8 diárias" ] ... [ Concluído ] */}
            <div className="flex items-center justify-between pt-4 mt-3 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-600">
                {selection.mode === 'consolidated'
                  ? 'Todo o período'
                  : daysDifference === 1
                  ? '1 diária / dia'
                  : `${daysDifference} diárias / dias`}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (pickingState.startDate) {
                    applyDateRangeSelection(
                      pickingState.startDate,
                      pickingState.endDate || pickingState.startDate
                    );
                  }
                  setIsOpen(false);
                }}
                className="px-6 py-2 bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-full shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Concluído
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
