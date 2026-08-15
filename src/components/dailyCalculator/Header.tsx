import React from 'react';
import { Download, Upload, Settings, RefreshCw, Calculator } from 'lucide-react';
import { SettlementOrder, CostMasterItem } from '../../dailyCalculatorTypes';

interface HeaderProps {
  orders: SettlementOrder[];
  costMaster: CostMasterItem[];
  onOpenUpload: () => void;
  onOpenSettings: () => void;
  onExportBackup: () => void;
  onImportBackup: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onResetData: () => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  orders,
  costMaster,
  onOpenUpload,
  onOpenSettings,
  onExportBackup,
  onImportBackup,
  onResetData,
  selectedMonth,
  onMonthChange,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md text-white font-bold">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-extrabold tracking-tight text-white">
                  쇼핑몰 일일 정산 & 마진 계산기
                </h1>
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                  PRO v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                스마트스토어 · 쿠팡 · 오늘의집 · 자사몰 등 7대 쇼핑몰 정산 통합 관리
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center space-x-1.5 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-slate-400 font-medium">조회월:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => onMonthChange(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={onOpenUpload}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md flex items-center space-x-1.5 active:scale-95 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>정산 엑셀 업로드</span>
            </button>

            <button
              onClick={onExportBackup}
              title="백업 데이터 추출 (JSON)"
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs px-3 py-2 rounded-xl border border-slate-700 transition-all flex items-center space-x-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">백업 추출</span>
            </button>

            <label className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs px-3 py-2 rounded-xl border border-slate-700 transition-all flex items-center space-x-1 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">백업 복구</span>
              <input
                type="file"
                accept=".json"
                onChange={onImportBackup}
                className="hidden"
              />
            </label>

            <button
              onClick={onOpenSettings}
              title="수수료 및 정산 설정"
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-2 rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={onResetData}
              title="전체 데이터 초기화"
              className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 p-2 rounded-xl border border-rose-800/40 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
