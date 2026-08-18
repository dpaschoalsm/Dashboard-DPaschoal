import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, X } from 'lucide-react';
import { parseCSVContent, parseExcelBuffer, generateSampleExcelCSV } from '../utils/csvParser';
import { PeriodData } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface CsvUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (periods: PeriodData[]) => void;
}

export const CsvUploaderModal: React.FC<CsvUploaderModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [previewPeriods, setPreviewPeriods] = useState<PeriodData[] | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    setError(null);
    setFileName(file.name);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const parsed = parseExcelBuffer(buffer);
          setPreviewPeriods(parsed);
        } catch (err: any) {
          setError(err.message || 'Erro ao processar a planilha do Excel.');
          setPreviewPeriods(null);
        }
      };
      reader.onerror = () => {
        setError('Erro ao ler o arquivo Excel.');
        setPreviewPeriods(null);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = parseCSVContent(content);
          setPreviewPeriods(parsed);
        } catch (err: any) {
          setError(err.message || 'Erro ao processar o arquivo CSV.');
          setPreviewPeriods(null);
        }
      };
      reader.onerror = () => {
        setError('Erro ao ler o arquivo CSV.');
        setPreviewPeriods(null);
      };
      reader.readAsText(file, 'UTF-8');
    }
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

  const downloadSample = () => {
    const csvContent = generateSampleExcelCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `modelo_planilha_dpaschoal.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApply = () => {
    if (previewPeriods && previewPeriods.length > 0) {
      onDataLoaded(previewPeriods);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
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
            <h2 className="text-xl font-bold text-gray-900">Importar Planilha (Excel / CSV)</h2>
            <p className="text-sm text-gray-500">
              Envie o arquivo .xlsx, .xls ou .csv com as colunas de vendas e conversão.
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
          onClick={() => document.getElementById('excel-file-input')?.click()}
        >
          <input
            id="excel-file-input"
            type="file"
            accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-12 h-12 rounded-full bg-[#DC2626]/10 flex items-center justify-center text-[#DC2626]">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">
              Arraste e solte sua planilha Excel ou CSV aqui
            </p>
            <p className="text-xs text-gray-400 mt-1">Suporta arquivos .xlsx, .xls e .csv com múltiplas linhas</p>
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
        {previewPeriods && previewPeriods.length > 0 && (
          <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Pré-visualização ({previewPeriods.length} período{previewPeriods.length > 1 ? 's' : ''} carregado{previewPeriods.length > 1 ? 's' : ''})
            </h3>
            
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {previewPeriods.map((period, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 text-xs">
                  <div className="font-bold text-[#DC2626] mb-2 text-sm border-b pb-1">
                    {period.data}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div><span className="text-gray-400 block">Impressões:</span> <span className="font-semibold">{formatNumber(period.impressoes)}</span></div>
                    <div><span className="text-gray-400 block">Alcance:</span> <span className="font-semibold">{formatNumber(period.alcance)}</span></div>
                    <div><span className="text-gray-400 block">Click:</span> <span className="font-semibold">{formatNumber(period.click)}</span></div>
                    <div><span className="text-gray-400 block">Contatos:</span> <span className="font-semibold">{formatNumber(period.contatos)}</span></div>
                    <div><span className="text-gray-400 block">Orçamentos:</span> <span className="font-semibold">{formatNumber(period.orcamentos)}</span></div>
                    <div><span className="text-gray-400 block">Vendas:</span> <span className="font-semibold">{formatNumber(period.vendas)}</span></div>
                    <div><span className="text-gray-400 block">Investimento:</span> <span className="font-semibold text-purple-600">{formatCurrency(period.investimento ?? 0)}</span></div>
                    <div><span className="text-gray-400 block">Faturamento:</span> <span className="font-semibold text-emerald-600">{formatCurrency(period.faturamento)}</span></div>
                    <div><span className="text-gray-400 block">Lucro Bruto:</span> <span className="font-semibold text-blue-600">{formatCurrency(period.lucroBruto)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sample Download Links */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={downloadSample}
            className="text-xs text-[#DC2626] hover:underline flex items-center font-medium gap-1"
          >
            <Download className="w-3.5 h-3.5" /> Baixar Modelo de Planilha (.csv)
          </button>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              disabled={!previewPeriods || previewPeriods.length === 0}
              className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all shadow-xs ${
                previewPeriods && previewPeriods.length > 0
                  ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-sm'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Atualizar Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
