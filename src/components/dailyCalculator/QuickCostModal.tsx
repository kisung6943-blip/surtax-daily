import React, { useState } from 'react';
import { X, Save, Edit3 } from 'lucide-react';
import { SettlementOrder } from '../../dailyCalculatorTypes';

interface QuickCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SettlementOrder | null;
  onSaveCost: (orderId: string, costPerUnit: number, updateMaster: boolean) => void;
}

export const QuickCostModal: React.FC<QuickCostModalProps> = ({
  isOpen,
  onClose,
  order,
  onSaveCost,
}) => {
  const [cost, setCost] = useState(order?.costPerUnit ? String(order.costPerUnit) : '');
  const [updateMaster, setUpdateMaster] = useState(true);

  React.useEffect(() => {
    if (order) {
      setCost(order.costPerUnit ? String(order.costPerUnit) : '');
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numCost = Number(cost.replace(/,/g, '')) || 0;
    onSaveCost(order.id, numCost, updateMaster);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center space-x-2">
            <Edit3 className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-lg">개당 매입원가 입력</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
            <div className="font-bold text-slate-900">{order.productName}</div>
            {order.optionName && <div className="text-slate-500 mt-0.5">{order.optionName}</div>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">개당 원가 (VAT 포함, 원)</label>
            <input
              type="number"
              required
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="예: 15000"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={updateMaster}
              onChange={(e) => setUpdateMaster(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <span className="text-xs font-bold text-slate-700">
              원가 마스터에도 저장 (동일 상품에 자동 적용)
            </span>
          </label>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all flex items-center space-x-1"
            >
              <Save className="w-4 h-4" />
              <span>원가 저장</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
