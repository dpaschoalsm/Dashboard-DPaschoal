import React, { useState, useEffect } from 'react';
import { Edit3, X, Check, Plus, Trash2 } from 'lucide-react';
import { PeriodData } from '../types';

interface ManualDataEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  periods: PeriodData[];
  onSave: (newPeriods: PeriodData[]) => void;
}

export const ManualDataEditorModal: React.FC<ManualDataEditorModalProps> = ({
  isOpen,
  onClose,
  periods,
  onSave,
}) => {
  const [editedPeriods, setEditedPeriods] = useState<PeriodData[]>(periods);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  useEffect(() => {
    setEditedPeriods(periods);
    setSelectedIdx(0);
  }, [periods, isOpen]);

  if (!isOpen || editedPeriods.length === 0) return null;

  const current = editedPeriods[selectedIdx] || editedPeriods[0];

  const handleFieldChange = (field: keyof PeriodData, value: string) => {
    setEditedPeriods((prev) => {
      const updated = [...prev];
      if (field === 'data') {
        updated[selectedIdx] = { ...updated[selectedIdx], data: value };
      } else {
        const num = parseFloat(value) || 0;
        updated[selectedIdx] = { ...updated[selectedIdx], [field]: num };
      }
      return updated;
    });
  };

  const handleAddPeriod = () => {
    const newPeriod: PeriodData = {
      id: `p_new_${Date.now()}`,
      data: `Novo Período ${editedPeriods.length + 1}`,
      impressoes: 33333,
      alcance: 22222,
      click: 11111,
      contatos: 1000,
      orcamentos: 500,
      vendas: 100,
      faturamento: 150000,
      lucroBruto: 50000,
      investimento: 25000,
    };
    setEditedPeriods((prev) => [...prev, newPeriod]);
    setSelectedIdx(editedPeriods.length);
  };

  const handleRemovePeriod = (idx: number) => {
    if (editedPeriods.length <= 1) return;
    const updated = editedPeriods.filter((_, i) => i !== idx);
    setEditedPeriods(updated);
    setSelectedIdx(Math.max(0, selectedIdx - 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedPeriods);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="p-2.5 bg-[#DC2626]/10 text-[#DC2626] rounded-xl">
            <Edit3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Editar Dados dos Períodos</h2>
            <p className="text-sm text-gray-500">
              Altere os valores dos períodos existentes ou adicione novos dados.
            </p>
          </div>
        </div>

        {/* Tabs for selecting period */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 border-b border-gray-200">
          {editedPeriods.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedIdx === idx
                  ? 'bg-[#DC2626] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{p.data || `Período ${idx + 1}`}</span>
              {editedPeriods.length > 1 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePeriod(idx);
                  }}
                  className="hover:text-red-200 p-0.5"
                  title="Remover período"
                >
                  <Trash2 className="w-3 h-3" />
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={handleAddPeriod}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-dashed border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626]/5 flex items-center gap-1 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Período
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Nome do Período / Data
            </label>
            <input
              type="text"
              value={current.data}
              onChange={(e) => handleFieldChange('data', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#DC2626] outline-none text-sm font-medium"
              placeholder="Ex: 08/07 a 05/08 ou 06/ago"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Impressões
              </label>
              <input
                type="number"
                value={current.impressoes}
                onChange={(e) => handleFieldChange('impressoes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#DC2626] outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Alcance
              </label>
              <input
                type="number"
                value={current.alcance}
                onChange={(e) => handleFieldChange('alcance', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#DC2626] outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Clicks
              </label>
              <input
                type="number"
                value={current.click}
                onChange={(e) => handleFieldChange('click', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#DC2626] outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Contatos
              </label>
              <input
                type="number"
                value={current.contatos}
                onChange={(e) => handleFieldChange('contatos', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#DC2626] outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Orçamentos
              </label>
              <input
                type="number"
                value={current.orcamentos}
                onChange={(e) => handleFieldChange('orcamentos', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#DC2626] outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Vendas
              </label>
              <input
                type="number"
                value={current.vendas}
                onChange={(e) => handleFieldChange('vendas', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#DC2626] outline-none text-sm"
              />
            </div>

            <div className="col-span-1 sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Investimento (R$)
              </label>
              <input
                type="number"
                step="any"
                value={current.investimento ?? 0}
                onChange={(e) => handleFieldChange('investimento', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#DC2626] outline-none text-sm font-semibold text-purple-700"
              />
            </div>

            <div className="col-span-1 sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Faturamento (R$)
              </label>
              <input
                type="number"
                step="any"
                value={current.faturamento}
                onChange={(e) => handleFieldChange('faturamento', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#DC2626] outline-none text-sm font-semibold text-emerald-700"
              />
            </div>

            <div className="col-span-1 sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Lucro Bruto (R$)
              </label>
              <input
                type="number"
                step="any"
                value={current.lucroBruto}
                onChange={(e) => handleFieldChange('lucroBruto', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#DC2626] outline-none text-sm font-semibold text-blue-700"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#DC2626] text-white text-sm font-semibold rounded-lg hover:bg-[#B91C1C] transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-4 h-4" /> Salvar Períodos
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
