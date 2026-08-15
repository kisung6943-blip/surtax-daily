import React from 'react';
import { DollarSign, TrendingUp, ShoppingBag, PieChart, Layers } from 'lucide-react';
import { SettlementOrder } from '../../dailyCalculatorTypes';
import { PLATFORMS } from '../../dailyCalculatorData/initialData';
import { formatKRW, formatNumber } from '../../dailyCalculatorUtils/calculator';

interface DashboardViewProps {
  orders: SettlementOrder[];
  selectedMonth: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ orders, selectedMonth }) => {
  const totalSales = orders.reduce((sum, o) => sum + o.salesAmount, 0);
  const totalSettlement = orders.reduce((sum, o) => sum + o.settlementAmount, 0);
  const totalCost = orders.reduce((sum, o) => sum + o.totalCost, 0);
  const totalAdSpend = orders.reduce((sum, o) => sum + o.adSpend, 0);
  const totalNetProfit = totalSettlement - totalCost - totalAdSpend;
  const overallMarginRate = totalSales > 0 ? (totalNetProfit / totalSales) * 100 : 0;
  const totalOrdersCount = orders.reduce((sum, o) => sum + o.quantity, 0);

  const platformStats = PLATFORMS.map((platform) => {
    const platformOrders = orders.filter((o) => o.platform === platform.id);
    const sales = platformOrders.reduce((sum, o) => sum + o.salesAmount, 0);
    const settlement = platformOrders.reduce((sum, o) => sum + o.settlementAmount, 0);
    const cost = platformOrders.reduce((sum, o) => sum + o.totalCost, 0);
    const adSpend = platformOrders.reduce((sum, o) => sum + o.adSpend, 0);
    const netProfit = settlement - cost - adSpend;
    const marginRate = sales > 0 ? (netProfit / sales) * 100 : 0;

    return {
      ...platform,
      orderCount: platformOrders.reduce((sum, o) => sum + o.quantity, 0),
      sales,
      settlement,
      cost,
      adSpend,
      netProfit,
      marginRate,
      share: totalSales > 0 ? (sales / totalSales) * 100 : 0,
    };
  }).filter((p) => p.orderCount > 0 || p.sales > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">총 매출액 (결제금액)</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-slate-900">{formatKRW(totalSales)}</h3>
            <p className="mt-1 text-xs text-slate-500">
              총 수량 <span className="font-bold text-slate-700">{formatNumber(totalOrdersCount)}</span>개 주문
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">정산 예정금액</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-slate-900">{formatKRW(totalSettlement)}</h3>
            <p className="mt-1 text-xs text-slate-500">
              평균 수수료율{' '}
              <span className="font-bold text-slate-700">
                {totalSales > 0 ? (((totalSales - totalSettlement) / totalSales) * 100).toFixed(1) : 0}%
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">총 매입원가 + 광고비</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-slate-900">{formatKRW(totalCost + totalAdSpend)}</h3>
            <p className="mt-1 text-xs text-slate-500">
              원가 {formatKRW(totalCost)} | 광고비 {formatKRW(totalAdSpend)}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">최종 순이익</span>
            <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-indigo-300">{formatKRW(totalNetProfit)}</h3>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-300">최종 순마진율</span>
              <span
                className={`font-black px-2 py-0.5 rounded-full ${
                  overallMarginRate >= 15
                    ? 'bg-emerald-500/30 text-emerald-300'
                    : overallMarginRate >= 5
                    ? 'bg-amber-500/30 text-amber-300'
                    : 'bg-rose-500/30 text-rose-300'
                }`}
              >
                {overallMarginRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PieChart className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">쇼핑몰별 손익 현황</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">조회 기준월: {selectedMonth}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-6">쇼핑몰</th>
                <th className="py-3.5 px-4 text-right">매출액</th>
                <th className="py-3.5 px-4 text-right">정산 예정액</th>
                <th className="py-3.5 px-4 text-right">매입 원가</th>
                <th className="py-3.5 px-4 text-right">광고비</th>
                <th className="py-3.5 px-4 text-right">순이익</th>
                <th className="py-3.5 px-4 text-right">마진율</th>
                <th className="py-3.5 px-6 text-right">매출 비중</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {platformStats.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                    업로드된 정산 데이터가 없습니다. 상단 [정산 엑셀 업로드] 버튼을 클릭해 보세요.
                  </td>
                </tr>
              ) : (
                platformStats.map((stat) => (
                  <tr key={stat.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900 flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <span>{stat.name}</span>
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-slate-800">{formatKRW(stat.sales)}</td>
                    <td className="py-4 px-4 text-right font-semibold text-emerald-600">{formatKRW(stat.settlement)}</td>
                    <td className="py-4 px-4 text-right text-slate-600">{formatKRW(stat.cost)}</td>
                    <td className="py-4 px-4 text-right text-slate-600">{formatKRW(stat.adSpend)}</td>
                    <td className="py-4 px-4 text-right font-extrabold text-indigo-700">{formatKRW(stat.netProfit)}</td>
                    <td className="py-4 px-4 text-right font-bold">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-xs ${
                          stat.marginRate >= 15
                            ? 'bg-emerald-50 text-emerald-700'
                            : stat.marginRate >= 5
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {stat.marginRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(stat.share, 100)}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 w-10">{stat.share.toFixed(1)}%</span>
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
