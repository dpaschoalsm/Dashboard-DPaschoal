import React, { useState, useEffect } from 'react';
import { Edit3, X, Check } from 'lucide-react';
import { DashboardData } from '../types';

interface ManualDataEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DashboardData;
  onSave: (newData: DashboardData) => void;
}

export const ManualDataEditorModal: React.FC<ManualDataEditorModalProps> = ({
  isOpen,
  onClose,
  data,
  onSave,
}) => {
  const [formData, setFormData] = useState<DashboardData>(data);

  useEffect(() => {
    setFormData(data);
  }, [data, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof DashboardData, value: string) => {
    const num = parseFloat(value) || 0;
    setFormData((prev) => ({
      ...prev,
      [field]: num,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in duration-200">
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
            <h2 className="text-xl font-bold text-gray-900">Editar Métricas Manualmente</h2>
            <p className="text-sm text-gray-500">
              Altere os valores para atualizar os indicadores e gráficos instantaneamente.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Faturamento (R$)
              </label>
              <input
                type="number"
                step="any"
                value={formData.faturamento}
                onChange={(e) => handleChange('faturamento', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent outline-none text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Lucro Bruto (R$)
              </label>
              <input
                type="number"
                step="any"
                value={formData.lucroBruto}
                onChange={(e) => handleChange('lucroBruto', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent outline-none text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Contatos (Qtd)
              </label>
              <input
                type="number"
                value={formData.contatos}
                onChange={(e) => handleChange('contatos', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent outline-none text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Orçamentos (Qtd)
              </label>
              <input
                type="number"
                value={formData.orcamentos}
                onChange={(e) => handleChange('orcamentos', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent outline-none text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Vendas (Qtd)
              </label>
              <input
                type="number"
                value={formData.vendas}
                onChange={(e) => handleChange('vendas', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#DC2626] focus:border-transparent outline-none text-sm font-medium"
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
              <Check className="w-4 h-4" /> Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
