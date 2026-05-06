import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { DollarSign, TrendingDown, TrendingUp, Plus, Trash2, Calendar, Percent, ChevronRight, Lock, KeyRound, Unlock } from "lucide-react";
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
  expenses: Expense[];
};

type Company = {
  id: string;
  name: string;
};

const getInitialData = (): MonthData[] => Array.from({ length: 12 }, (_, i) => ({
  month: i + 1,
  revenues: [],
  expenses: [],
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

  // Expense form state
  const [newExpVendor, setNewExpVendor] = useState("");
  const [newExpAmount, setNewExpAmount] = useState("");
  const [newExpDay, setNewExpDay] = useState(new Date().getDate().toString().padStart(2, '0'));

  // Initial Load (Companies from Supabase)
  useEffect(() => {
    const fetchCompanies = async () => {
      setIsLoading(true);
      try {
        const { data: dbCompanies, error } = await supabase
          .from('surtax_daily_companies')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (dbCompanies && dbCompanies.length > 0) {
          setCompanies(dbCompanies);
          const savedActiveId = localStorage.getItem("surtax_daily_active_id");
          setActiveCompanyId(savedActiveId && dbCompanies.find((c: any) => c.id === savedActiveId) ? savedActiveId : dbCompanies[0].id);
        } else {
          // Create default company if none exists
          const defaultId = "company_" + Date.now();
          const newCompany = { id: defaultId, name: "신규 업체" };
          const { error: insertError } = await supabase.from('surtax_daily_companies').insert([newCompany]);
          if (!insertError) {
            setCompanies([newCompany]);
            setActiveCompanyId(defaultId);
          }
        }
      } catch (e) {
        console.error("Fetch companies failed", e);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchCompanies();
    }
  }, [isAuthenticated]);

  // Load/Save Data for Active Company (Supabase)
  useEffect(() => {
    const fetchData = async () => {
      if (!activeCompanyId) return;
      
      localStorage.setItem("surtax_daily_active_id", activeCompanyId);
      try {
        const { data: dbData, error } = await supabase
          .from('surtax_daily_data')
          .select('month_data')
          .eq('company_id', activeCompanyId)
          .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"

        if (dbData) {
          setData(dbData.month_data);
        } else {
          setData(getInitialData());
        }
      } catch (e) {
        console.error("Fetch data failed", e);
        setData(getInitialData());
      }
    };

    if (isAuthenticated) {
      fetchData();
    }
  }, [activeCompanyId, isAuthenticated]);

  // Auto-save data to Supabase when it changes
  useEffect(() => {
    const saveData = async () => {
      if (!activeCompanyId || !isAuthenticated) return;
      
      try {
        await supabase
          .from('surtax_daily_data')
          .upsert({ 
            company_id: activeCompanyId, 
            month_data: data,
            updated_at: new Date().toISOString()
          });
      } catch (e) {
        console.error("Save data failed", e);
      }
    };

    const timeoutId = setTimeout(saveData, 1000); // Debounce saves
    return () => clearTimeout(timeoutId);
  }, [data, activeCompanyId, isAuthenticated]);

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

  // Calculations
  const calculateTotalRevenue = (revenues: RevenueEntry[]) => revenues.reduce((sum, r) => sum + r.amount, 0);
  const calculateTotalExpense = (expenses: Expense[]) => expenses.reduce((sum, e) => sum + e.amount, 0);

  const yearlyRevenue = useMemo(() => data.reduce((sum, m) => sum + calculateTotalRevenue(m.revenues || []), 0), [data]);
  const yearlyExpense = useMemo(() => data.reduce((sum, m) => sum + calculateTotalExpense(m.expenses || []), 0), [data]);
  const yearlyNetProfit = yearlyRevenue - yearlyExpense;
  const yearlyExpenseRatio = yearlyRevenue > 0 ? (yearlyExpense / yearlyRevenue) * 100 : 0;

  const chartData = useMemo(() => data.map(m => ({
    month: m.month,
    revenue: calculateTotalRevenue(m.revenues || []),
    expense: calculateTotalExpense(m.expenses || []),
  })), [data]);

  const currentMonthData = data.find(d => d.month === selectedMonth)!;
  const currentMonthRevenue = calculateTotalRevenue(currentMonthData.revenues || []);
  const currentMonthExpenseTotal = calculateTotalExpense(currentMonthData.expenses || []);
  const currentMonthExpenseRatio = currentMonthRevenue > 0 ? (currentMonthExpenseTotal / currentMonthRevenue) * 100 : 0;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
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
                <span className="text-lg font-bold text-blue-600">(ES)</span>
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
            <p className="text-slate-500 mt-2">일별 매출 내역(계산서/현금영수증/기타)을 상세하게 기록하세요.</p>
          </div>
          <button 
            onClick={handleReset}
            className="px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg border border-red-100 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-3 h-3" /> 데이터 초기화
          </button>
        </header>

        {/* Yearly Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard icon={<TrendingUp />} color="blue" label="연간 총 매출액" value={formatCurrency(yearlyRevenue)} />
          <SummaryCard icon={<TrendingDown />} color="red" label="연간 총 매입액" value={formatCurrency(yearlyExpense)} />
          <SummaryCard icon={<DollarSign />} color="green" label="연간 순이익" value={formatCurrency(yearlyNetProfit)} />
          <SummaryCard icon={<Percent />} color="purple" label="연간 매입 비율" value={`${yearlyExpenseRatio.toFixed(1)}%`} />
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
                  <Bar dataKey="revenue" name="매출액" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={32} />
                  <Bar dataKey="expense" name="매입액" fill="#EF4444" radius={[6, 6, 0, 0]} barSize={32} />
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, color, label, value }: { icon: React.ReactNode, color: string, label: string, value: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    red: "bg-red-50 text-red-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem]">
      <CardContent className="p-8">
        <div className="flex items-center gap-5">
          <div className={`p-4 ${colors[color]} rounded-[1.25rem] shadow-sm`}>
            {React.cloneElement(icon as React.ReactElement, { size: 28 })}
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
