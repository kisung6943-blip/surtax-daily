import React, { useState } from 'react';
import { Search, Trash2, ArrowUpDown } from 'lucide-react';
import { SettlementOrder, PlatformType } from '../../dailyCalculatorTypes';
import { PLATFORMS } from '../../dailyCalculatorData/initialData';
import { formatKRW } from '../../dailyCalculatorUtils/calculator';

interface PlatformTableViewProps {
  orders: SettlementOrder[];
  onDeleteOrder: (id: string) => void;
  onOpenQuickCostModal: (order: SettlementOrder) => void;
}

export const PlatformTableView: React.FC<PlatformTableViewProps> = ({
  orders,
  onDeleteOrder,
  onOpenQuickCostModal,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'orderDate' | 'salesAmount' | 'netProfit' | 'marginRate'>('orderDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredOrders = orders
    .filter((o) => (selectedPlatform === 'all' ? true : o.platform === selectedPlatform))
    .filter(
      (o) =>
        o.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.optionName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let valA = a[sortField] || 0;
      let valB = b[sortField] || 0;
      if (typeof valA === 'string') valA = valA.localeCompare(valB as string);
      return sortOrder === 'asc' ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
    });

  const toggleSort = (field: 'orderDate' | 'salesAmount' | 'netProfit' | 'marginRate') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-1 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedPlatform('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedPlatform === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            전체 ({orders.length})
          </button>
          {PLATFORMS.map((platform) => {
            const count = orders.filter((o) => o.platform === platform.id).length;
            return (
              <button
                key={platform.id}
                onClick={() => setSelectedPlatform(platform.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedPlatform === platform.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {platform.name} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-64">
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
              <th className="py-3 px-4">쇼핑몰</th>
              <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('orderDate')}>
                <div className="flex items-center space-x-1">
                  <span>주문일</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-6">상품명 / 옵션</th>
              <th className="py-3 px-3 text-center">수량</th>
              <th className="py-3 px-4 text-right cursor-pointer" onClick={() => toggleSort('salesAmount')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>매출액</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">정산예정액</th>
              <th className="py-3 px-4 text-right">개당 원가</th>
              <th className="py-3 px-4 text-right cursor-pointer" onClick={() => toggleSort('netProfit')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>순이익</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-right cursor-pointer" onClick={() => toggleSort('marginRate')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>마진율</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-center">삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400 text-sm">
                  조회된 주문 정산 내역이 없습니다.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const platformInfo = PLATFORMS.find((p) => p.id === order.platform);
                return (
                  <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                        {platformInfo?.name || order.platform}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-500 whitespace-nowrap">
                      {order.orderDate}
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="font-bold text-slate-900 line-clamp-1">{order.productName}</div>
                      {order.optionName && (
                        <div className="text-xs text-slate-400 line-clamp-1">{order.optionName}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-slate-700">{order.quantity}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                      {formatKRW(order.salesAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">
                      {formatKRW(order.settlementAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onOpenQuickCostModal(order)}
                        className={`text-xs font-bold px-2 py-1 rounded-md transition-colors cursor-pointer ${
                          order.costPerUnit > 0
                            ? 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                            : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                        }`}
                      >
                        {order.costPerUnit > 0 ? formatKRW(order.costPerUnit) : '원가 입력필요'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-indigo-700">
                      {formatKRW(order.netProfit)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-xs ${
                          order.marginRate >= 15
                            ? 'bg-emerald-50 text-emerald-700'
                            : order.marginRate >= 5
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {order.marginRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onDeleteOrder(order.id)}
                        className="p-1 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
