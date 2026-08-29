import DailyCalculator from './components/dailyCalculator/DailyCalculator';
import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { DollarSign, TrendingDown, TrendingUp, Plus, Trash2, Calendar, Percent, ChevronRight, Lock, KeyRound, Unlock, Download, Upload, History, RotateCcw, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type RevenueCategory = "계산서 매출" | "현금영수증" | "기타";

type RevenueEntry = {
  id: string;
  vendor: string;
  amount: number;
  category: RevenueCategory;
  date: string; // e.g. "01" (day)
};

type Expense = {
  id: string;
  vendor: string;
  amount: number;
  date: string; // e.g. "01" (day)
};

type MonthData = {
  month: number;
  revenues: RevenueEntry[];
  expenses: Expense[]; // 매입
  expenditures: Expense[]; // 지출
};

type Company = {
  id: string;
  name: string;
};

const getInitialData = (): MonthData[] => Array.from({ length: 12 }, (_, i) => ({
  month: i + 1,
  revenues: [],
  expenses: [],
  expenditures: [],
}));

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [savedPassword, setSavedPassword] = useState<string | null>(null);
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string>("");
  const [data, setData] = useState<MonthData[]>(getInitialData());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');

  // Initial Authentication Check
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("surtax_app_password");
      if (saved) {
        setSavedPassword(saved);
        setIsSettingPassword(false);
      } else {
        setIsSettingPassword(true);
      }
    } catch (e) {
      console.error("Auth check failed", e);
      setIsSettingPassword(true);
    }
  }, []);

  // Sales form state
  const [newRevVendor, setNewRevVendor] = useState("");
  const [newRevAmount, setNewRevAmount] = useState("");
  const [newRevCategory, setNewRevCategory] = useState<RevenueCategory>("계산서 매출");
  const [newRevDay, setNewRevDay] = useState(new Date().getDate().toString().padStart(2, '0'));

  // Expense (Purchase) form state
  const [newExpVendor, setNewExpVendor] = useState("");
  const [newExpAmount, setNewExpAmount] = useState("");
  const [newExpDay, setNewExpDay] = useState(new Date().getDate().toString().padStart(2, '0'));

  // Expenditure form state
  const [newExpenVendor, setNewExpenVendor] = useState("");
  const [newExpenAmount, setNewExpenAmount] = useState("");
  const [newExpenDay, setNewExpenDay] = useState(new Date().getDate().toString().padStart(2, '0'));

  // Synchronous Local Load on Mount / Auth + Non-blocking Supabase Sync
  useEffect(() => {
    if (!isAuthenticated) return;

    // Step 1: Immediately load local companies and data synchronously from LocalStorage
    let activeId = localStorage.getItem("surtax_daily_active_id");
    let loadedCompanies: Company[] = [];

    const localCompStr = localStorage.getItem("surtax_daily_companies");
    if (localCompStr) {
      try {
        const parsed = JSON.parse(localCompStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedCompanies = parsed;
        }
      } catch (e) {}
    }

    if (loadedCompanies.length === 0) {
      // Find any surtax_daily_data_ key in localStorage
      let foundKeyId: string | null = null;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("surtax_daily_data_")) {
          foundKeyId = k.replace("surtax_daily_data_", "");
          break;
        }
      }
      activeId = activeId || foundKeyId || "company_default";
      loadedCompanies = [{ id: activeId, name: "기본 업체" }];
    }

    if (!activeId || !loadedCompanies.find(c => c.id === activeId)) {
      activeId = loadedCompanies[0].id;
    }

    setCompanies(loadedCompanies);
    setActiveCompanyId(activeId);

    // Immediately load data for activeId from LocalStorage
    let localSaved = localStorage.getItem(`surtax_daily_data_${activeId}`);
    if (!localSaved) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("surtax_daily_data_")) {
          const val = localStorage.getItem(k);
          if (val) {
            try {
              const parsed = JSON.parse(val);
              const hasEntries = Array.isArray(parsed) && parsed.some((m: any) => 
                (m.revenues && m.revenues.length > 0) || 
                (m.expenses && m.expenses.length > 0) || 
                (m.expenditures && m.expenditures.length > 0)
              );
              if (hasEntries) {
                localSaved = val;
                activeId = k.replace("surtax_daily_data_", "");
                setActiveCompanyId(activeId);
                break;
              }
            } catch (e) {}
          }
        }
      }
    }

    if (localSaved) {
      try {
        setData(JSON.parse(localSaved));
      } catch (e) {
        setData(getInitialData());
      }
    } else {
      setData(getInitialData());
    }

    setIsLoading(false);
    setIsDataLoaded(true);

    // Step 2: Non-blocking background Supabase sync attempt (2s timeout)
    const syncWithSupabase = async () => {
      setSyncStatus('syncing');
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Supabase Timeout")), 2000)
        );

        const fetchPromise = supabase.from('surtax_daily_companies').select('*').order('created_at', { ascending: true });
        const { data: dbCompanies, error }: any = await Promise.race([fetchPromise, timeoutPromise]);

        if (error) throw error;
        if (dbCompanies && dbCompanies.length > 0) {
          setCompanies(dbCompanies);
        }

        const dataPromise = supabase.from('surtax_daily_data').select('month_data').eq('company_id', activeId).single();
        const { data: dbData }: any = await Promise.race([dataPromise, timeoutPromise]);
        
        if (dbData && Array.isArray(dbData.month_data)) {
          const safeData = dbData.month_data.map((m: any) => ({
            month: m.month,
            revenues: Array.isArray(m.revenues) ? m.revenues : [],
            expenses: Array.isArray(m.expenses) ? m.expenses : (Array.isArray(m.purchases) ? m.purchases : []),
            expenditures: Array.isArray(m.expenditures) ? m.expenditures : [],
          }));
          setData(safeData);
        }
        setSyncStatus('done');
      } catch (e) {
        // Fast fallback to LocalStorage mode on failure or timeout
        setSyncStatus('error');
      }
    };

    syncWithSupabase();
  }, [isAuthenticated]);

  // Auto-save data to Supabase and LocalStorage when it changes
  useEffect(() => {
    const saveData = async () => {
      if (!activeCompanyId || !isAuthenticated || isLoading || !isDataLoaded) return;
      
      setSyncStatus('syncing');
      // Save to LocalStorage immediately
      localStorage.setItem(`surtax_daily_data_${activeCompanyId}`, JSON.stringify(data));
      if (companies.length > 0) {
        localStorage.setItem("surtax_daily_companies", JSON.stringify(companies));
      }

      try {
        const { error } = await supabase
          .from('surtax_daily_data')
          .upsert({ 
            company_id: activeCompanyId, 
            month_data: data,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
        setSyncStatus('done');
      } catch (e) {
        console.error("Save data to Supabase failed", e);
        setSyncStatus('error');
      }
    };

    const timeoutId = setTimeout(saveData, 1500); // Debounce saves
    return () => clearTimeout(timeoutId);
  }, [data, activeCompanyId, isAuthenticated, isLoading, isDataLoaded, companies]);

  const handleAddCompany = async () => {
    const name = window.prompt("새 업체 이름을 입력하세요:");
    if (name && name.trim()) {
      const newId = "company_" + Date.now();
      const newCompany = { id: newId, name: name.trim() };
      
      try {
        const { error } = await supabase.from('surtax_daily_companies').insert([newCompany]);
        if (error) throw error;
        setCompanies(prev => [...prev, newCompany]);
        setActiveCompanyId(newId);
      } catch (e) {
        alert("업체 추가에 실패했습니다.");
      }
    }
  };

  const handleRenameCompany = async (id: string, newName: string) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
    try {
      await supabase.from('surtax_daily_companies').update({ name: newName }).eq('id', id);
    } catch (e) {
      console.error("Rename failed", e);
    }
  };

  const handleDeleteCompany = async () => {
    if (companies.length <= 1) {
      alert("최소 한 개의 업체는 유지해야 합니다.");
      return;
    }
    const currentCompany = companies.find(c => c.id === activeCompanyId);
    if (window.confirm(`'${currentCompany?.name}' 업체의 모든 데이터를 삭제하시겠습니까?`)) {
      try {
        const { error } = await supabase.from('surtax_daily_companies').delete().eq('id', activeCompanyId);
        if (error) throw error;
        const remaining = companies.filter(c => c.id !== activeCompanyId);
        setCompanies(remaining);
        setActiveCompanyId(remaining[0].id);
      } catch (e) {
        alert("삭제에 실패했습니다.");
      }
    }
  };

  const handleReset = async () => {
    if (window.confirm("현재 업체의 모든 데이터를 초기화하시겠습니까?")) {
      setData(getInitialData());
      try {
        await supabase.from('surtax_daily_data').delete().eq('company_id', activeCompanyId);
      } catch (e) {
        console.error("Reset failed", e);
      }
    }
  };

  type SavedSnapshot = {
    key: string;
    label?: string;
    totalRev: number;
    totalExp: number;
    count: number;
    data: MonthData[];
    isCurrent?: boolean;
  };

  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [savedSnapshots, setSavedSnapshots] = useState<SavedSnapshot[]>([]);

  const handleOpenRecoveryModal = () => {
    const list: SavedSnapshot[] = [];

    // Calculate current active data sum
    let activeRevSum = 0;
    let activeExpSum = 0;
    let activeCount = 0;
    data.forEach((m: any) => {
      if (Array.isArray(m.revenues)) {
        m.revenues.forEach((r: any) => { activeRevSum += r.amount || 0; activeCount++; });
      }
      if (Array.isArray(m.expenses)) {
        m.expenses.forEach((e: any) => { activeExpSum += e.amount || 0; activeCount++; });
      }
      if (Array.isArray(m.expenditures)) {
        m.expenditures.forEach((ex: any) => { activeExpSum += ex.amount || 0; activeCount++; });
      }
    });

    list.push({
      key: "current_active_data",
      label: "현재 적용 중인 최신 데이터",
      totalRev: activeRevSum,
      totalExp: activeExpSum,
      count: activeCount,
      data: data,
      isCurrent: true
    });

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("surtax_daily_data_") || key === "surtax_daily_data")) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              let revSum = 0;
              let expSum = 0;
              let entryCount = 0;
              parsed.forEach((m: any) => {
                if (Array.isArray(m.revenues)) {
                  m.revenues.forEach((r: any) => { revSum += r.amount || 0; entryCount++; });
                }
                if (Array.isArray(m.expenses)) {
                  m.expenses.forEach((e: any) => { expSum += e.amount || 0; entryCount++; });
                }
                if (Array.isArray(m.expenditures)) {
                  m.expenditures.forEach((ex: any) => { expSum += ex.amount || 0; entryCount++; });
                }
              });
              list.push({
                key,
                label: `저장 기록 스냅샷 (${key})`,
                totalRev: revSum,
                totalExp: expSum,
                count: entryCount,
                data: parsed,
                isCurrent: false
              });
            }
          } catch (e) {}
        }
      }
    }
    setSavedSnapshots(list);
    setIsRecoveryModalOpen(true);
  };

  const handleRestoreSnapshot = (snapshot: SavedSnapshot) => {
    setData(snapshot.data);
    const compId = snapshot.key.replace("surtax_daily_data_", "");
    if (compId && compId !== "surtax_daily_data") {
      setActiveCompanyId(compId);
    }
    setIsRecoveryModalOpen(false);
    alert(`복원 완료! (총 매출 ${formatCurrency(snapshot.totalRev)}, 총 ${snapshot.count}건 내역)`);
  };

  const handleExportBackup = () => {
    const backupData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      activeCompanyId,
      companies,
      data
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `surtax_daily_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.data)) {
          setData(parsed.data);
          if (Array.isArray(parsed.companies) && parsed.companies.length > 0) {
            setCompanies(parsed.companies);
          }
          alert("백업 데이터를 성공적으로 복원했습니다!");
        } else {
          alert("올바르지 않은 백업 파일 형식입니다.");
        }
      } catch (err) {
        alert("백업 파일을 읽는 중 오류가 발생했습니다.");
      }
    };
    reader.readAsText(file);
  };

  const handleSetPassword = () => {
    if (inputPassword.length < 4) {
      alert("비밀번호는 최소 4자리 이상이어야 합니다.");
      return;
    }
    localStorage.setItem("surtax_app_password", inputPassword);
    setSavedPassword(inputPassword);
    setIsSettingPassword(false);
    setIsAuthenticated(true);
    setInputPassword("");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassword === savedPassword) {
      setIsAuthenticated(true);
      setInputPassword("");
    } else {
      alert("비밀번호가 일치하지 않습니다.");
      setInputPassword("");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Revenue Handlers
  const handleAddRevenue = (month: number) => {
    if (!newRevVendor.trim() || !newRevAmount.trim()) return;
    const amount = parseInt(newRevAmount.replace(/[^0-9]/g, ""), 10) || 0;

    setData(prev => prev.map(d => {
      if (d.month === month) {
        return {
          ...d,
          revenues: [...(d.revenues || []), { 
            id: Date.now().toString() + Math.random().toString(), 
            vendor: newRevVendor.trim(), 
            amount, 
            category: newRevCategory,
            date: newRevDay.padStart(2, '0')
          }].sort((a, b) => a.date.localeCompare(b.date))
        };
      }
      return d;
    }));
    setNewRevVendor("");
    setNewRevAmount("");
  };

  const handleRemoveRevenue = (month: number, revId: string) => {
    setData(prev => prev.map(d => {
      if (d.month === month) {
        return {
          ...d,
          revenues: d.revenues.filter(r => r.id !== revId)
        };
      }
      return d;
    }));
  };

  // Expense Handlers
  const handleAddExpense = (month: number) => {
    if (!newExpVendor.trim() || !newExpAmount.trim()) return;
    const amount = parseInt(newExpAmount.replace(/[^0-9]/g, ""), 10) || 0;

    setData(prev => prev.map(d => {
      if (d.month === month) {
        return {
          ...d,
          expenses: [...d.expenses, { 
            id: Date.now().toString() + Math.random().toString(), 
            vendor: newExpVendor.trim(), 
            amount,
            date: newExpDay.padStart(2, '0')
          }].sort((a, b) => a.date.localeCompare(b.date))
        };
      }
      return d;
    }));
    setNewExpVendor("");
    setNewExpAmount("");
  };

  const handleRemoveExpense = (month: number, expenseId: string) => {
    setData(prev => prev.map(d => {
      if (d.month === month) {
        return {
          ...d,
          expenses: d.expenses.filter(e => e.id !== expenseId)
        };
      }
      return d;
    }));
  };

  // Expenditure Handlers
  const handleAddExpenditure = (month: number) => {
    if (!newExpenVendor.trim() || !newExpenAmount.trim()) return;
    const amount = parseInt(newExpenAmount.replace(/[^0-9]/g, ""), 10) || 0;

    setData(prev => prev.map(d => {
      if (d.month === month) {
        return {
          ...d,
          expenditures: [...(d.expenditures || []), { 
            id: Date.now().toString() + Math.random().toString(), 
            vendor: newExpenVendor.trim(), 
            amount,
            date: newExpenDay.padStart(2, '0')
          }].sort((a, b) => a.date.localeCompare(b.date))
        };
      }
      return d;
    }));
    setNewExpenVendor("");
    setNewExpenAmount("");
  };

  const handleRemoveExpenditure = (month: number, expenditureId: string) => {
    setData(prev => prev.map(d => {
      if (d.month === month) {
        return {
          ...d,
          expenditures: d.expenditures.filter(e => e.id !== expenditureId)
        };
      }
      return d;
    }));
  };

  // Calculations
  const calculateTotal = (items: any[]) => items?.reduce((sum, r) => sum + r.amount, 0) || 0;

  const yearlyRevenue = useMemo(() => data.reduce((sum, m) => sum + calculateTotal(m.revenues), 0), [data]);
  const yearlyExpense = useMemo(() => data.reduce((sum, m) => sum + calculateTotal(m.expenses), 0), [data]);
  const yearlyExpenditure = useMemo(() => data.reduce((sum, m) => sum + calculateTotal(m.expenditures), 0), [data]);
  const yearlyNetProfit = yearlyRevenue - (yearlyExpense + yearlyExpenditure);
  const yearlyExpenseRatio = yearlyRevenue > 0 ? ((yearlyExpense + yearlyExpenditure) / yearlyRevenue) * 100 : 0;
  const yearlyPurchaseRate = yearlyRevenue > 0 ? (yearlyExpense / yearlyRevenue) * 100 : 0;

  const chartData = useMemo(() => data.map(m => ({
    month: m.month,
    revenue: calculateTotal(m.revenues),
    expense: calculateTotal(m.expenses),
    expenditure: calculateTotal(m.expenditures),
  })), [data]);

  const currentMonthData = data.find(d => d.month === selectedMonth) || getInitialData()[0];
  const currentMonthRevenue = calculateTotal(currentMonthData?.revenues || []);
  const currentMonthExpenseTotal = calculateTotal(currentMonthData?.expenses || []);
  const currentMonthExpenditureTotal = calculateTotal(currentMonthData?.expenditures || []);
  const currentMonthExpenseRatio = currentMonthRevenue > 0 ? (currentMonthExpenseTotal / currentMonthRevenue) * 100 : 0;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans space-y-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md my-auto"
        >
          <Card className="border-none shadow-2xl shadow-blue-500/10 rounded-[2.5rem] overflow-hidden bg-slate-900 text-white">
            <CardContent className="p-10 text-center">
              <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-600/30">
                {isSettingPassword ? <Lock className="w-10 h-10 text-white" /> : <KeyRound className="w-10 h-10 text-white" />}
              </div>
              
              <h2 className="text-3xl font-black mb-3 tracking-tight">
                {isSettingPassword ? "보안 비밀번호 설정" : "보호된 장부"}
              </h2>
              <p className="text-slate-400 text-sm mb-10 font-medium leading-relaxed whitespace-pre-line">
                {isSettingPassword 
                  ? "장부 데이터를 안전하게 보호하기 위해\n새로운 비밀번호를 설정해 주세요." 
                  : "이 앱은 비밀번호로 보호되어 있습니다.\n접근하려면 비밀번호를 입력하세요."}
              </p>

              <form onSubmit={isSettingPassword ? (e) => { e.preventDefault(); handleSetPassword(); } : handleLogin} className="space-y-4">
                <div className="relative">
                  <input 
                    type="password" 
                    value={inputPassword}
                    onChange={(e) => setInputPassword(e.target.value)}
                    placeholder="비밀번호 입력"
                    autoFocus
                    className="w-full bg-slate-800 border-none rounded-2xl py-4 px-6 text-center text-2xl font-black tracking-[0.5em] placeholder:tracking-normal placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 transition-all outline-none text-white"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                >
                  {isSettingPassword ? "설정 완료" : "잠금 해제"}
                </button>
              </form>

              {!isSettingPassword && (
                <p className="mt-8 text-xs text-slate-500 font-bold uppercase tracking-widest">
                  Personal Financial Ledger v2.0
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="w-full max-w-7xl">
          <DailyCalculator />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-3xl font-black tracking-tight text-slate-900 whitespace-nowrap">일별 매출/매입 장부</h1>
              
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm">
                <span className="text-lg font-bold text-blue-600">bukuk</span>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={handleLogout}
                  className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors ml-2"
                  title="잠금"
                >
                  <Unlock className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-slate-500">일별 매출 내역(계산서/현금영수증/기타)을 상세하게 기록하세요.</p>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border transition-all ${
                syncStatus === 'syncing' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                syncStatus === 'done' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                syncStatus === 'error' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                'bg-slate-100 text-slate-400 border-slate-200'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' :
                  syncStatus === 'done' ? 'bg-emerald-500' :
                  syncStatus === 'error' ? 'bg-blue-500' : 'bg-slate-400'
                }`} />
                {syncStatus === 'syncing' ? '동기화 중...' : 
                 syncStatus === 'done' ? '클라우드 동기화 완료' : 
                 syncStatus === 'error' ? '로컬 저장소 저장됨 (안전)' : '연결됨'}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={handleOpenRecoveryModal}
              className="px-3 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition-all shadow-sm flex items-center gap-1.5"
              title="이전 저장 기록 검색 및 복구"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" /> 이전 저장 기록 탐색
            </button>
            <button 
              onClick={handleExportBackup}
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-all shadow-sm flex items-center gap-1.5"
              title="백업 파일 저장"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" /> 백업 파일 저장
            </button>
            <label className="px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-emerald-600" /> 백업 불러오기
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>
            <button 
              onClick={handleReset}
              className="px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl border border-red-100 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> 데이터 초기화
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <SummaryCard icon={<TrendingUp />} color="blue" label="연간 총 매출액" value={formatCurrency(yearlyRevenue)} />
          <SummaryCard icon={<TrendingDown />} color="orange" label="연간 총 매입액" value={formatCurrency(yearlyExpense)} />
          <SummaryCard icon={<TrendingDown />} color="red" label="연간 총 지출액" value={formatCurrency(yearlyExpenditure)} />
          <SummaryCard icon={<DollarSign />} color="green" label="연간 순이익" value={formatCurrency(yearlyNetProfit)} />
          <SummaryCard icon={<Percent />} color="purple" label="연간 매입률" value={`${yearlyPurchaseRate.toFixed(1)}%`} />
        </div>

        {/* Chart */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem]">
          <CardHeader>
            <CardTitle className="text-lg font-black flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500" /> 월별 매출/매입 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tickFormatter={(val) => `${val}월`} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => new Intl.NumberFormat('ko-KR', { notation: 'compact' }).format(val)} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} formatter={(value: number) => formatCurrency(value)} labelFormatter={(label) => `${label}월`} />
                  <Legend />
                  <Bar dataKey="revenue" name="매출액" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={24} />
                  <Bar dataKey="expense" name="매입액" fill="#F59E0B" radius={[6, 6, 0, 0]} barSize={24} />
                  <Bar dataKey="expenditure" name="지출액" fill="#EF4444" radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Input Section */}
        <div className="space-y-6">
          <div className="flex overflow-x-auto pb-4 gap-2 snap-x no-scrollbar">
            {data.map(m => (
              <button
                key={m.month}
                onClick={() => setSelectedMonth(m.month)}
                className={`px-6 py-3 rounded-2xl whitespace-nowrap text-sm font-bold transition snap-start border-2 ${
                  selectedMonth === m.month 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border-white shadow-sm'
                }`}
              >
                {m.month}월
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            {/* Revenue Input & List */}
            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-900 text-white pb-6 pt-8">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-blue-400" />
                    {selectedMonth}월 매출 상세 기록
                  </CardTitle>
                  <span className="text-xl font-black text-blue-400">
                    {formatCurrency(currentMonthRevenue)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-8 px-6 pb-8">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleAddRevenue(selectedMonth); }} 
                  className="space-y-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">날짜(일)</label>
                      <select 
                        value={newRevDay} 
                        onChange={(e) => setNewRevDay(e.target.value)} 
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold appearance-none cursor-pointer"
                      >
                        {Array.from({ length: new Date(2026, selectedMonth, 0).getDate() }, (_, i) => (
                          <option key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                            {(i + 1).toString().padStart(2, '0')}일
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">카테고리</label>
                      <select value={newRevCategory} onChange={(e) => setNewRevCategory(e.target.value as RevenueCategory)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold">
                        <option value="계산서 매출">계산서 매출</option>
                        <option value="현금영수증">현금영수증</option>
                        <option value="기타">기타</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">업체명</label>
                    <input type="text" value={newRevVendor} onChange={(e) => setNewRevVendor(e.target.value)} placeholder="매출 업체명 입력" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">매출 금액</label>
                    <div className="relative">
                      <input type="text" value={newRevAmount ? parseInt(newRevAmount.replace(/[^0-9]/g, '')).toLocaleString() : ""} onChange={(e) => setNewRevAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-black text-lg text-right pr-12" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">원</span>
                    </div>
                  </div>
                  <button type="submit" disabled={!newRevVendor.trim() || !newRevAmount.trim()} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-600/20">매출 내역 추가</button>
                </form>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">이달의 매출 리스트</h4>
                  {currentMonthData.revenues?.length > 0 ? (
                    <div className="space-y-2">
                      {currentMonthData.revenues.map((rev) => (
                        <div key={rev.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 transition-colors group">
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-black text-slate-300 w-6">{rev.date}일</span>
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-blue-500 mb-0.5">{rev.category}</span>
                              <span className="font-bold text-sm text-slate-800">{rev.vendor}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-black text-slate-900">{formatCurrency(rev.amount)}</span>
                            <button onClick={() => handleRemoveRevenue(selectedMonth, rev.id)} className="p-1.5 text-slate-200 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 text-sm font-bold">등록된 매출이 없습니다.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Expense Input & List */}
            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-100 pb-6 pt-8">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <TrendingDown className="w-6 h-6 text-red-500" />
                    {selectedMonth}월 매입 상세 기록
                  </CardTitle>
                  <span className="text-xl font-black text-red-500">
                    {formatCurrency(currentMonthExpenseTotal)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-8 px-6 pb-8">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleAddExpense(selectedMonth); }} 
                  className="space-y-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">날짜(일)</label>
                      <select 
                        value={newExpDay} 
                        onChange={(e) => setNewExpDay(e.target.value)} 
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-bold appearance-none cursor-pointer"
                      >
                        {Array.from({ length: new Date(2026, selectedMonth, 0).getDate() }, (_, i) => (
                          <option key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                            {(i + 1).toString().padStart(2, '0')}일
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">매입 업체/항목</label>
                      <input type="text" value={newExpVendor} onChange={(e) => setNewExpVendor(e.target.value)} placeholder="매입처 입력" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-bold" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">매입 금액</label>
                    <div className="relative">
                      <input type="text" value={newExpAmount ? parseInt(newExpAmount.replace(/[^0-9]/g, "")).toLocaleString() : ""} onChange={(e) => setNewExpAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-black text-lg text-right pr-12" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">원</span>
                    </div>
                  </div>
                  <button type="submit" disabled={!newExpVendor.trim() || !newExpAmount.trim()} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 disabled:opacity-50 transition shadow-lg shadow-slate-900/20">매입 내역 추가</button>
                </form>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">이달의 매입 리스트</h4>
                  {currentMonthData.expenses.length > 0 ? (
                    <div className="space-y-2">
                      {currentMonthData.expenses.map((expense) => (
                        <div key={expense.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-red-200 transition-colors group">
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-black text-slate-300 w-6">{expense.date}일</span>
                            <span className="font-bold text-sm text-slate-800">{expense.vendor}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-black text-slate-900">{formatCurrency(expense.amount)}</span>
                            <button onClick={() => handleRemoveExpense(selectedMonth, expense.id)} className="p-1.5 text-slate-200 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 text-sm font-bold">등록된 매입이 없습니다.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Expenditure Input & List */}
            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-100 pb-6 pt-8">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <TrendingDown className="w-6 h-6 text-red-500" />
                    {selectedMonth}월 지출 상세 기록
                  </CardTitle>
                  <span className="text-xl font-black text-red-500">
                    {formatCurrency(currentMonthExpenditureTotal)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-8 px-6 pb-8">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleAddExpenditure(selectedMonth); }} 
                  className="space-y-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">날짜(일)</label>
                      <select 
                        value={newExpenDay} 
                        onChange={(e) => setNewExpenDay(e.target.value)} 
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-bold appearance-none cursor-pointer"
                      >
                        {Array.from({ length: new Date(2026, selectedMonth, 0).getDate() }, (_, i) => (
                          <option key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                            {(i + 1).toString().padStart(2, '0')}일
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">지출 항목</label>
                      <input type="text" value={newExpenVendor} onChange={(e) => setNewExpenVendor(e.target.value)} placeholder="지출처/항목 입력" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-bold" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">지출 금액</label>
                    <div className="relative">
                      <input type="text" value={newExpenAmount ? parseInt(newExpenAmount.replace(/[^0-9]/g, "")).toLocaleString() : ""} onChange={(e) => setNewExpenAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-black text-lg text-right pr-12" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">원</span>
                    </div>
                  </div>
                  <button type="submit" disabled={!newExpenVendor.trim() || !newExpenAmount.trim()} className="w-full py-4 bg-red-500 text-white rounded-xl font-black hover:bg-red-600 disabled:opacity-50 transition shadow-lg shadow-red-600/20">지출 내역 추가</button>
                </form>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">이달의 지출 리스트</h4>
                  {currentMonthData.expenditures?.length > 0 ? (
                    <div className="space-y-2">
                      {currentMonthData.expenditures.map((ex) => (
                        <div key={ex.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-red-200 transition-colors group">
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-black text-slate-300 w-6">{ex.date}일</span>
                            <span className="font-bold text-sm text-slate-800">{ex.vendor}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-black text-slate-900">{formatCurrency(ex.amount)}</span>
                            <button onClick={() => handleRemoveExpenditure(selectedMonth, ex.id)} className="p-1.5 text-slate-200 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 text-sm font-bold">등록된 지출이 없습니다.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Monthly Analysis Card */}
            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden flex flex-col">
              <CardHeader className="bg-slate-900 text-white pb-6 pt-8">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <Percent className="w-6 h-6 text-purple-400" />
                    {selectedMonth}월 비율 분석
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-8 px-6 pb-8 space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Monthly Purchase Rate */}
                  <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 flex flex-col justify-center items-center text-center">
                    <span className="text-xs font-black text-purple-400 uppercase tracking-widest mb-1">이달의 매입률</span>
                    <span className="text-3xl font-black text-purple-700">
                      {currentMonthRevenue > 0 ? ((currentMonthExpenseTotal / currentMonthRevenue) * 100).toFixed(1) : "0.0"}%
                    </span>
                    <div className="w-full bg-purple-200 h-2 rounded-full mt-4 overflow-hidden">
                      <div 
                        className="bg-purple-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, currentMonthRevenue > 0 ? (currentMonthExpenseTotal / currentMonthRevenue) * 100 : 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Monthly Expenditure Rate */}
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-3">
                    <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                      <span>매출 대비 지출 비율</span>
                      <span className="font-black text-slate-800">
                        {currentMonthRevenue > 0 ? ((currentMonthExpenditureTotal / currentMonthRevenue) * 100).toFixed(1) : "0.0"}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-red-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, currentMonthRevenue > 0 ? (currentMonthExpenditureTotal / currentMonthRevenue) * 100 : 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Monthly Net Profit Rate */}
                  <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 space-y-3">
                    <div className="flex justify-between items-center text-sm font-bold text-emerald-800">
                      <span>순이익률</span>
                      <span className="font-black text-emerald-700">
                        {currentMonthRevenue > 0 ? (((currentMonthRevenue - (currentMonthExpenseTotal + currentMonthExpenditureTotal)) / currentMonthRevenue) * 100).toFixed(1) : "0.0"}%
                      </span>
                    </div>
                    <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.max(0, Math.min(100, currentMonthRevenue > 0 ? ((currentMonthRevenue - (currentMonthExpenseTotal + currentMonthExpenditureTotal)) / currentMonthRevenue) * 100 : 0))}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-1.5 text-[11px] text-slate-500 leading-relaxed font-semibold mt-4">
                  <div>• <strong>매입률:</strong> (매입액 / 매출액) × 100</div>
                  <div>• 적정 매입률(약 60%~80%)을 유지해 보셔요.</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="mt-12 flex flex-col items-center gap-6 pb-20">
        <CompanySelector 
          companies={companies} 
          activeId={activeCompanyId} 
          onSelect={setActiveCompanyId} 
          onAdd={handleAddCompany}
          onDelete={handleDeleteCompany}
          onRename={handleRenameCompany}
        />
        <p className="text-slate-400 text-[10px] font-black tracking-[0.2em] uppercase">Premium Business Management System</p>
      </div>

      {/* Daily Calculator (쇼핑몰 일일 정산 및 마진 계산기) Integration Section */}
      <div className="pt-8 border-t-4 border-indigo-500 rounded-3xl overflow-hidden mt-12 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mb-12" id="daily-calculator-section">
        <DailyCalculator />
      </div>

      {/* Local Storage Recovery Modal */}
      {isRecoveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-black flex items-center gap-2 text-slate-800">
                <RotateCcw className="w-5 h-5 text-amber-500" /> 이전 저장 기록 탐색 및 복구
              </h2>
              <button 
                onClick={() => setIsRecoveryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 bg-slate-100 rounded-lg"
              >
                닫기
              </button>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              사용하시는 브라우저의 보관소(LocalStorage)에 남아 있는 모든 입력 기록들입니다. 
              작성하셨던 내역을 찾아 <strong className="text-blue-600 font-bold">[이 데이터로 복원]</strong> 버튼을 누르시면 즉시 되살아납니다!
            </p>

            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {savedSnapshots.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">저장된 데이터 기록이 존재하지 않습니다.</p>
              ) : (
                savedSnapshots.map((snap, idx) => (
                  <div key={idx} className={`p-4 rounded-2xl flex items-center justify-between gap-4 transition-all shadow-sm border ${
                    snap.isCurrent ? 'bg-emerald-50/70 border-emerald-300' : 'bg-slate-50 border-slate-200 hover:border-blue-400'
                  }`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          snap.isCurrent ? 'bg-emerald-200 text-emerald-800 font-black' : 'bg-slate-200/60 text-slate-500 font-mono'
                        }`}>
                          {snap.isCurrent ? "현재 활성화중 (최신)" : snap.key}
                        </span>
                      </div>
                      <p className="text-sm font-black text-slate-800 mt-1">
                        총 매출: <span className="text-blue-600">{formatCurrency(snap.totalRev)}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">입력 항목 총 {snap.count}건 보관됨</p>
                    </div>
                    {snap.isCurrent ? (
                      <span className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 rounded-xl whitespace-nowrap">
                        현재 적용 됨
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRestoreSnapshot(snap)}
                        className="px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all whitespace-nowrap"
                      >
                        이 데이터로 복원
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: 'blue' | 'orange' | 'green' | 'red' | 'purple' }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    green: "bg-emerald-50 text-emerald-600 border-emerald-100",
    red: "bg-red-50 text-red-600 border-red-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
  };

  return (
    <Card className="border-none shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden transition-all hover:scale-[1.02]">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${colors[color]} border`}>
            {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-xl font-black text-slate-900">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompanySelector({ companies, activeId, onSelect, onAdd, onDelete, onRename }: { 
  companies: Company[], 
  activeId: string, 
  onSelect: (id: string) => void,
  onAdd: () => void,
  onDelete: () => void,
  onRename: (id: string, name: string) => void
}) {
  const activeCompany = companies.find(c => c.id === activeId);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md">
      <div className="flex items-center gap-2 w-full">
        <div className="relative flex-1 group">
          <select 
            value={activeId} 
            onChange={(e) => onSelect(e.target.value)}
            className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-6 font-black text-slate-900 appearance-none cursor-pointer focus:border-blue-500 outline-none transition-all pr-12 shadow-sm"
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 rotate-90" />
        </div>
        <button 
          onClick={onAdd}
          className="p-4 bg-white border-2 border-slate-200 rounded-2xl text-slate-600 hover:border-blue-500 hover:text-blue-500 transition-all shadow-sm"
          title="업체 추가"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={() => {
            const newName = window.prompt("새로운 업체 이름을 입력하세요:", activeCompany?.name);
            if (newName && newName.trim()) onRename(activeId, newName.trim());
          }}
          className="text-[10px] font-black text-slate-400 hover:text-blue-500 transition-colors uppercase tracking-widest"
        >
          업체명 수정
        </button>
        <span className="w-1 h-1 rounded-full bg-slate-200" />
        <button 
          onClick={onDelete}
          className="text-[10px] font-black text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
        >
          업체 삭제
        </button>
      </div>
    </div>
  );
}
