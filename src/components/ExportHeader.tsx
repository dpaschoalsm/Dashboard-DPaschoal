import React, { useState } from 'react';
import { Download, Upload, Edit3, RotateCcw, TrendingUp, Cloud, RefreshCw } from 'lucide-react';
import { toPng } from 'html-to-image';

interface ExportHeaderProps {
  exportRef: React.RefObject<HTMLDivElement | null>;
  onOpenCsvModal: () => void;
  onOpenEditModal: () => void;
  onOpenSharepointModal: () => void;
  onQuickSyncSharepoint: () => void;
  isSyncingSharepoint?: boolean;
  lastSyncTime?: string | null;
  onResetData: () => void;
}

export const ExportHeader: React.FC<ExportHeaderProps> = ({
  exportRef,
  onOpenCsvModal,
  onOpenEditModal,
  onOpenSharepointModal,
  onQuickSyncSharepoint,
  isSyncingSharepoint = false,
  lastSyncTime,
  onResetData,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPng = async () => {
    if (!exportRef.current) return;
    try {
      setIsExporting(true);

      // Brief delay to ensure any pending DOM/SVG renders settle
      await new Promise((resolve) => setTimeout(resolve, 150));

      const dataUrl = await toPng(exportRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#FFFFFF',
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = `dashboard_vendas_funil_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Erro ao exportar em PNG:', error);
      alert('Não foi possível gerar a imagem PNG. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 py-3 sm:px-8 shadow-2xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#DC2626] flex items-center justify-center text-white shadow-xs shrink-0">
            <TrendingUp className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              Dashboard de Vendas & Conversão
            </h1>
            <p className="text-xs text-gray-500">
              Visualização de funil e métricas financeiras
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {/* SharePoint Sync Button Group */}
          <div className="flex items-center rounded-lg border border-blue-200 bg-blue-50/60 p-0.5 shadow-2xs">
            <button
              onClick={onQuickSyncSharepoint}
              disabled={isSyncingSharepoint}
              title={lastSyncTime ? `Atualizar agora do SharePoint (Última: ${lastSyncTime})` : 'Sincronizar dados do SharePoint'}
              className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:bg-blue-100/70 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncingSharepoint ? 'animate-spin' : ''}`} />
              <span>{isSyncingSharepoint ? 'Sincronizando...' : 'Atualizar SharePoint'}</span>
            </button>
            <button
              onClick={onOpenSharepointModal}
              title="Configurações do link do SharePoint"
              className="px-1.5 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100/70 rounded-md transition-colors border-l border-blue-200"
            >
              <Cloud className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onResetData}
            title="Restaurar dados originais"
            className="px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5 border border-gray-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Restaurar</span>
          </button>

          <button
            onClick={onOpenEditModal}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 bg-gray-50 border border-gray-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#DC2626]" />
            Editar
          </button>

          <button
            onClick={onOpenCsvModal}
            className="px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100 bg-white border border-gray-300 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs hover:border-[#DC2626]"
          >
            <Upload className="w-3.5 h-3.5 text-[#DC2626]" />
            Upload Manual
          </button>

          <button
            onClick={handleExportPng}
            disabled={isExporting}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] active:scale-95 rounded-lg transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'Exportando...' : 'Exportar PNG'}
          </button>
        </div>
      </div>
    </header>
  );
};
