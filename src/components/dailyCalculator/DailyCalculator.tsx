import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { DashboardView } from './DashboardView';
import { CostMasterView } from './CostMasterView';
import { PlatformTableView } from './PlatformTableView';
import { SettingsModal } from './SettingsModal';
import { ExcelUploadModal } from './ExcelUploadModal';
import { QuickCostModal } from './QuickCostModal';

import {
  SettlementOrder,
  CostMasterItem,
  GlobalSettings,
} from '../../dailyCalculatorTypes';
import { DEFAULT_SETTINGS } from '../../dailyCalculatorData/initialData';
import { calculateOrderMetrics } from '../../dailyCalculatorUtils/calculator';

const STORAGE_KEYS = {
  ORDERS: 'seller_settlement_orders_v1',
  COST_MASTER: 'seller_cost_master_v1',
  SETTINGS: 'seller_global_settings_v1',
};

export default function DailyCalculator() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'platformTable' | 'costMaster'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedOrderForCost, setSelectedOrderForCost] = useState<SettlementOrder | null>(null);

  const [orders, setOrders] = useState<SettlementOrder[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return saved ? JSON.parse(saved) : [];
  });

  const [costMaster, setCostMaster] = useState<CostMasterItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COST_MASTER);
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<GlobalSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COST_MASTER, JSON.stringify(costMaster));
  }, [costMaster]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  const handleRecalculateAll = (currentOrders: SettlementOrder[], currentMaster: CostMasterItem[]) => {
    return currentOrders.map((order) => calculateOrderMetrics(order, currentMaster, order.adSpend));
  };

  const handleAddCostItem = (item: Omit<CostMasterItem, 'id' | 'updatedAt'>) => {
    const newItem: CostMasterItem = {
      ...item,
      id: `cost_${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    const newMaster = [newItem, ...costMaster];
    setCostMaster(newMaster);
    setOrders((prevOrders) => handleRecalculateAll(prevOrders, newMaster));
  };

  const handleUpdateCostItem = (id: string, updatedFields: Partial<CostMasterItem>) => {
    const newMaster = costMaster.map((item) => (item.id === id ? { ...item, ...updatedFields } : item));
    setCostMaster(newMaster);
    setOrders((prevOrders) => handleRecalculateAll(prevOrders, newMaster));
  };

  const handleDeleteCostItem = (id: string) => {
    const newMaster = costMaster.filter((item) => item.id !== id);
    setCostMaster(newMaster);
    setOrders((prevOrders) => handleRecalculateAll(prevOrders, newMaster));
  };

  const handleUploadSuccess = (newOrders: SettlementOrder[]) => {
    const combined = [...newOrders, ...orders];
    setOrders(handleRecalculateAll(combined, costMaster));
  };

  const handleSaveQuickCost = (orderId: string, costPerUnit: number, updateMaster: boolean) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    let newMaster = costMaster;

    if (updateMaster && targetOrder) {
      const existingIdx = costMaster.findIndex(
        (m) => m.productName === targetOrder.productName && m.optionName === targetOrder.optionName
      );
      if (existingIdx >= 0) {
        newMaster = costMaster.map((m, idx) =>
          idx === existingIdx
            ? { ...m, cost: costPerUnit, supplyPrice: Math.round(costPerUnit / 1.1), vat: costPerUnit - Math.round(costPerUnit / 1.1) }
            : m
        );
      } else {
        newMaster = [
          {
            id: `cost_${Date.now()}`,
            productName: targetOrder.productName,
            optionName: targetOrder.optionName || '',
            cost: costPerUnit,
            supplyPrice: Math.round(costPerUnit / 1.1),
            vat: costPerUnit - Math.round(costPerUnit / 1.1),
            updatedAt: new Date().toISOString(),
          },
          ...costMaster,
        ];
      }
      setCostMaster(newMaster);
    }

    const updatedOrders = orders.map((o) =>
      o.id === orderId ? calculateOrderMetrics({ ...o, costPerUnit }, newMaster, o.adSpend) : o
    );
    setOrders(handleRecalculateAll(updatedOrders, newMaster));
  };

  const handleDeleteOrder = (id: string) => {
    setOrders(orders.filter((o) => o.id !== id));
  };

  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      orders,
      costMaster,
      settings,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily_calculator_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.orders) setOrders(parsed.orders);
        if (parsed.costMaster) setCostMaster(parsed.costMaster);
        if (parsed.settings) setSettings(parsed.settings);
        alert('백업 데이터가 성공적으로 복구되었습니다!');
      } catch (err) {
        alert('올바르지 않은 백업 파일 형식입니다.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (confirm('정말로 모든 정산 및 원가 데이터를 초기화하시겠습니까?')) {
      setOrders([]);
      setCostMaster([]);
      localStorage.removeItem(STORAGE_KEYS.ORDERS);
      localStorage.removeItem(STORAGE_KEYS.COST_MASTER);
    }
  };

  const monthlyOrders = orders.filter((o) => o.orderDate.startsWith(selectedMonth));

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      <Header
        orders={monthlyOrders}
        costMaster={costMaster}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onResetData={handleResetData}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            📊 손익 대시보드
          </button>
          <button
            onClick={() => setActiveTab('platformTable')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'platformTable'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            📋 쇼핑몰별 정산 내역 ({monthlyOrders.length}건)
          </button>
          <button
            onClick={() => setActiveTab('costMaster')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'costMaster'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            📦 원가 마스터 관리 ({costMaster.length}개)
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <DashboardView orders={monthlyOrders} selectedMonth={selectedMonth} />
        )}

        {activeTab === 'platformTable' && (
          <PlatformTableView
            orders={monthlyOrders}
            onDeleteOrder={handleDeleteOrder}
            onOpenQuickCostModal={(order) => setSelectedOrderForCost(order)}
          />
        )}

        {activeTab === 'costMaster' && (
          <CostMasterView
            costMaster={costMaster}
            onAddCostItem={handleAddCostItem}
            onUpdateCostItem={handleUpdateCostItem}
            onDeleteCostItem={handleDeleteCostItem}
          />
        )}
      </main>

      <ExcelUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        costMaster={costMaster}
        onUploadSuccess={handleUploadSuccess}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
      />

      <QuickCostModal
        isOpen={!!selectedOrderForCost}
        onClose={() => setSelectedOrderForCost(null)}
        order={selectedOrderForCost}
        onSaveCost={handleSaveQuickCost}
      />
    </div>
  );
}
