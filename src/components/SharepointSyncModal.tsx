import React, { useState } from 'react';
import { Cloud, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, X, Save } from 'lucide-react';
import { PeriodData } from '../types';
import { parseMatrixToPeriods } from '../utils/csvParser';

export const DEFAULT_SHAREPOINT_LINK =
  'https://dpaschoal-my.sharepoint.com/:x:/g/personal/giovana_gomes_dpaschoal_com_br/IQBvvDokxYFyQJ0jJrIb0k6ZAcXj5KIDaEJdkT_9YN2vQ6s?e=bh8fTe';

interface SharepointSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (periods: PeriodData[], info?: { sheetName?: string; syncTime?: string }) => void;
  currentUrl: string;
  onSaveUrl: (url: string) => void;
  lastSyncTime: string | null;
  autoSyncOnLoad: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
}

export const SharepointSyncModal: React.FC<SharepointSyncModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
  currentUrl,
  onSaveUrl,
  lastSyncTime,
  autoSyncOnLoad,
  onToggleAutoSync,
}) => {
  const [urlInput, setUrlInput] = useState(() => {
    if (currentUrl && !currentUrl.includes('eeYERK')) return currentUrl;
    return DEFAULT_SHAREPOINT_LINK;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (currentUrl) {
      if (currentUrl.includes('eeYERK')) {
        setUrlInput(DEFAULT_SHAREPOINT_LINK);
      } else {
        setUrlInput(currentUrl);
      }
    }
  }, [currentUrl, isOpen]);

  if (!isOpen) return null;

  const handleSync = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const response = await fetch('/api/sync-sharepoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      });

      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          'O link do SharePoint retornou uma página restrita de login da Microsoft. É necessário que o link seja gerado no SharePoint com permissão "Qualquer pessoa com o link" ou faça o upload manual do arquivo .xlsx/.csv no botão Upload.'
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Falha ao sincronizar com o SharePoint.');
      }

      if (!data.rows || data.rows.length === 0) {
        throw new Error('A planilha retornada está vazia.');
      }

      // Parse matrix into PeriodData[]
      const parsedPeriods = parseMatrixToPeriods(data.rows);

      // Save URL if valid
      onSaveUrl(urlInput);

      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setSuccessMsg(`Sincronização concluída com sucesso! ${parsedPeriods.length} período(s) carregados da aba "${data.sheetName}".`);

      onDataLoaded(parsedPeriods, {
        sheetName: data.sheetName,
        syncTime: timeStr,
      });
    } catch (err: any) {
      console.error('Erro na sincronização SharePoint:', err);
      setErrorMsg(err.message || 'Não foi possível baixar e processar os dados da planilha.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDefaultUrl = () => {
    setUrlInput(DEFAULT_SHAREPOINT_LINK);
    onSaveUrl(DEFAULT_SHAREPOINT_LINK);
    setErrorMsg(null);
    setSuccessMsg('Link restaurado para o padrão corporativo.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                Sincronização SharePoint / Excel Online
              </h2>
              <p className="text-xs text-blue-100 font-medium">
                Conecte a planilha para atualizar o dashboard automaticamente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Status info */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-900">
            <Cloud className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-blue-950">
                Link da Planilha Salvo
              </p>
              <p className="text-blue-800 leading-relaxed">
                O dashboard se conecta diretamente à planilha no SharePoint e processa as colunas de métricas financeiras e funil de conversão.
              </p>
              {lastSyncTime && (
                <p className="text-[11px] font-semibold text-blue-700 pt-0.5">
                  Última sincronização realizada às {lastSyncTime}
                </p>
              )}
            </div>
          </div>

          {/* URL Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800">
                URL de Compartilhamento do SharePoint
              </label>
              <button
                type="button"
                onClick={handleResetDefaultUrl}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold hover:underline"
              >
                Restaurar link padrão
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                placeholder="https://suaempresa-my.sharepoint.com/:x:/g/personal/..."
                className="w-full px-3.5 py-2.5 text-xs text-gray-800 font-mono bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all pr-10"
              />
              <a
                href={urlInput}
                target="_blank"
                rel="noreferrer"
                title="Abrir no SharePoint"
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-blue-600 p-0.5 rounded transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Auto sync option */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none bg-gray-50 p-3 rounded-xl border border-gray-200 hover:bg-gray-100/80 transition-colors">
            <input
              type="checkbox"
              checked={autoSyncOnLoad}
              onChange={(e) => onToggleAutoSync(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-xs font-semibold text-gray-700">
              Sincronizar automaticamente os dados ao carregar o dashboard
            </span>
          </label>

          {/* Messages */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold text-rose-900 mb-0.5">Erro na Sincronização</strong>
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{successMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              onSaveUrl(urlInput);
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onSaveUrl(urlInput);
                setSuccessMsg('Link salvo com sucesso!');
              }}
              className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              Salvar Link
            </button>

            <button
              onClick={handleSync}
              disabled={isLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Sincronizando...' : 'Sincronizar Agora'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
