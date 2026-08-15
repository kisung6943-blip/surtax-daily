import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Search, Package } from 'lucide-react';
import { CostMasterItem } from '../../dailyCalculatorTypes';
import { formatKRW } from '../../dailyCalculatorUtils/calculator';

interface CostMasterViewProps {
  costMaster: CostMasterItem[];
  onAddCostItem: (item: Omit<CostMasterItem, 'id' | 'updatedAt'>) => void;
  onUpdateCostItem: (id: string, item: Partial<CostMasterItem>) => void;
  onDeleteCostItem: (id: string) => void;
}

export const CostMasterView: React.FC<CostMasterViewProps> = ({
  costMaster,
  onAddCostItem,
  onUpdateCostItem,
  onDeleteCostItem,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [productName, setProductName] = useState('');
  const [optionName, setOptionName] = useState('');
  const [cost, setCost] = useState('');
  const [supplyPrice, setSupplyPrice] = useState('');
  const [vat, setVat] = useState('');
  const [memo, setMemo] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) return;

    const numCost = Number(cost.replace(/,/g, '')) || 0;
    const numSupply = Number(supplyPrice.replace(/,/g, '')) || Math.round(numCost / 1.1);
    const numVat = Number(vat.replace(/,/g, '')) || numCost - numSupply;

    if (editingId) {
      onUpdateCostItem(editingId, {
        productName,
        optionName,
        cost: numCost,
        supplyPrice: numSupply,
        vat: numVat,
        memo,
        updatedAt: new Date().toISOString(),
      });
      setEditingId(null);
    } else {
      onAddCostItem({
        productName,
        optionName,
        cost: numCost,
        supplyPrice: numSupply,
        vat: numVat,
        memo,
      });
    }

    setProductName('');
    setOptionName('');
    setCost('');
    setSupplyPrice('');
    setVat('');
    setMemo('');
  };

  const handleEdit = (item: CostMasterItem) => {
    setEditingId(item.id);
    setProductName(item.productName);
    setOptionName(item.optionName);
    setCost(String(item.cost));
    setSupplyPrice(String(item.supplyPrice));
    setVat(String(item.vat));
    setMemo(item.memo || '');
  };

  const filteredMaster = costMaster.filter(
    (item) =>
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.optionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.memo && item.memo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center space-x-2 mb-4">
          <Package className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-900 text-base">
            {editingId ? '상품 매입원가 수정' : '신규 원가 등록'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">상품명 *</label>
            <input
              type="text"
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="예: 프리미엄 영양제 60정"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">옵션명</label>
            <input
              type="text"
              value={optionName}
              onChange={(e) => setOptionName(e.target.value)}
              placeholder="예: 1박스 / 단품"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">매입원가 (VAT 포함, 원) *</label>
            <input
              type="number"
              required
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="예: 12000"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900"
            />
          </div>

          <div className="flex items-end space-x-2">
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-2.5 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center space-x-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{editingId ? '수정 저장' : '원가 등록'}</span>
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setProductName('');
                  setOptionName('');
                  setCost('');
                  setSupplyPrice('');
                  setVat('');
                  setMemo('');
                }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-sm py-2.5 px-3 rounded-xl transition-all cursor-pointer"
              >
                취소
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">원가 마스터 목록 ({filteredMaster.length}개)</h3>
            <p className="text-xs text-slate-400 mt-0.5">정산 엑셀 업로드 시 이 목록의 원가가 자동으로 매칭되어 순이익이 계산됩니다.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="상품명/옵션 검색..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-6">상품명</th>
                <th className="py-3 px-4">옵션명</th>
                <th className="py-3 px-4 text-right">매입원가 (VAT포함)</th>
                <th className="py-3 px-4 text-right">공급가액</th>
                <th className="py-3 px-4 text-right">부가세</th>
                <th className="py-3 px-6 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMaster.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                    등록된 원가 항목이 없습니다. 상단에서 상품 원가를 등록해 보세요.
                  </td>
                </tr>
              ) : (
                filteredMaster.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-slate-900">{item.productName}</td>
                    <td className="py-3.5 px-4 text-slate-600">{item.optionName || '-'}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-indigo-600">
                      {formatKRW(item.cost)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 text-xs">
                      {formatKRW(item.supplyPrice || Math.round(item.cost / 1.1))}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 text-xs">
                      {formatKRW(item.vat || item.cost - Math.round(item.cost / 1.1))}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteCostItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
