import React, { useState } from 'react';
import { Upload, FileText, Download, CheckCircle, AlertCircle, X } from 'lucide-react';
import { parseCSVContent, generateSampleSummaryCSV, generateSampleHorizontalCSV } from '../utils/csvParser';
import { DashboardData } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface CsvUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (data: DashboardData) => void;
}

export const CsvUploaderModal: React.FC<CsvUploaderModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<DashboardData | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = parseCSVContent(content);
        setPreviewData(parsed);
      } catch (err: any) {
        setError(err.message || 'Erro ao processar o arquivo CSV.');
        setPreviewData(null);
      }
    };
    reader.onerror = () => {
      setError('Erro ao ler o arquivo.');
      setPreviewData(null);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const downloadSample = (type: 'key-value' | 'horizontal') => {
    const csvContent = type === 'key-value' ? generateSampleSummaryCSV() : generateSampleHorizontalCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `modelo_dashboard_${type}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApply = () => {
    if (previewData) {
      onDataLoaded(previewData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="p-2.5 bg-[#DC2626]/10 text-[#DC2626] rounded-xl">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Atualizar dados via CSV</h2>
            <p className="text-sm text-gray-500">
              Envie uma planilha CSV para atualizar o gráfico e os indicadores automaticamente.
            </p>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 ${
            dragActive
              ? 'border-[#DC2626] bg-[#DC2626]/5 scale-[0.99]'
              : 'border-gray-300 hover:border-[#DC2626] hover:bg-gray-50'
          }`}
          onClick={() => document.getElementById('csv-file-input')?.click()}
        >
          <input
            id="csv-file-input"
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-12 h-12 rounded-full bg-[#DC2626]/10 flex items-center justify-center text-[#DC2626]">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">
              Arraste e solte seu arquivo CSV aqui
            </p>
            <p className="text-xs text-gray-400 mt-1">ou clique para selecionar do seu computador</p>
          </div>
          {fileName && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              {fileName}
            </span>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Preview Section */}
        {previewData && (
          <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              Pré-visualização dos Dados Importados
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                <span className="text-gray-500 block">Contatos</span>
                <span className="font-bold text-gray-900 text-sm">{formatNumber(previewData.contatos)}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                <span className="text-gray-500 block">Orçamentos</span>
                <span className="font-bold text-gray-900 text-sm">{formatNumber(previewData.orcamentos)}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                <span className="text-gray-500 block">Vendas</span>
                <span className="font-bold text-gray-900 text-sm">{formatNumber(previewData.vendas)}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                <span className="text-gray-500 block">Faturamento</span>
                <span className="font-bold text-gray-900 text-sm">{formatCurrency(previewData.faturamento)}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                <span className="text-gray-500 block">Lucro Bruto</span>
                <span className="font-bold text-gray-900 text-sm">{formatCurrency(previewData.lucroBruto)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Sample Download Links */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Baixar modelos:</span>
            <button
              onClick={() => downloadSample('key-value')}
              className="text-xs text-[#DC2626] hover:underline flex items-center font-medium gap-1"
            >
              <Download className="w-3 h-3" /> Modelo Vertical
            </button>
            <span className="text-gray-300">•</span>
            <button
              onClick={() => downloadSample('horizontal')}
              className="text-xs text-[#DC2626] hover:underline flex items-center font-medium gap-1"
            >
              <Download className="w-3 h-3" /> Modelo Horizontal
            </button>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              disabled={!previewData}
              className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all shadow-xs ${
                previewData
                  ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-sm'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Atualizar Gráfico
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
