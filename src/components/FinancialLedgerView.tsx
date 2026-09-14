import React, { useState } from "react";
import { Plus, Search, DollarSign, Wallet, ArrowDown, ArrowUp, ArrowUpRight, TrendingUp, HelpCircle, Mail, FileText, CheckCircle, Trash2, Download, Calendar, CheckCircle2, X } from "lucide-react";
import { AppState, LedgerEntry } from "../types";

interface FinancialLedgerViewProps {
  state: AppState;
  onAddLedger: (entry: { type: "income" | "expense"; amount: number; workspace: any; description: string; date?: string }) => void;
  onDeleteLedger?: (id: string) => void;
  onManageInvoice?: (actionData: { action: "add" | "edit" | "delete" | "pay"; id?: string; client?: string; project?: string; amount?: number; dueDate?: string; status?: string; workspace?: string; type?: "income" | "expense" }) => void;
}

export default function FinancialLedgerView({ state, onAddLedger, onDeleteLedger, onManageInvoice }: FinancialLedgerViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [actionToast, setActionToast] = useState<{ message: string; type: "success" | "info" } | null>(null);

  const triggerToast = (message: string, type: "success" | "info" = "success") => {
    setActionToast({ message, type });
    setTimeout(() => {
      setActionToast(null);
    }, 4000);
  };

  // Date filtering states
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "this-month" | "last-30" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Add ledger form states
  const [newType, setNewType] = useState<"income" | "expense">("expense");
  const [newAmount, setNewAmount] = useState("");
  const [newWorkspace, setNewWorkspace] = useState<string>("Personal");
  const [newDesc, setNewDesc] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);

  // Add pending invoice form states
  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState(false);
  const [invoiceClient, setInvoiceClient] = useState("");
  const [invoiceProject, setInvoiceProject] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceDueDate, setInvoiceDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceWorkspace, setInvoiceWorkspace] = useState<string>("Personal");
  const [invoiceType, setInvoiceType] = useState<"income" | "expense">("income");

  // Calculations
  const incomeEntries = state.ledger.filter(l => l.type === "income");
  const expenseEntries = state.ledger.filter(l => l.type === "expense");

  const totalIncome = incomeEntries.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenseEntries.reduce((sum, item) => sum + item.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  // Dynamic unique businesses for filtering
  const uniqueBusinesses = Array.from(new Set([
    "All",
    "Personal",
    "Artbit",
    "Axen",
    "Biggan",
    ...state.ledger.map(l => l.workspace),
    ...(state.businessProfiles ? state.businessProfiles.map(p => p.name) : [])
  ].filter(Boolean) as string[]));

  const availableBusinesses = Array.from(new Set([
    "Personal",
    "Artbit",
    "Axen",
    "Biggan",
    ...(state.businessProfiles ? state.businessProfiles.map(p => p.name) : [])
  ].filter(Boolean) as string[]));

  // Filter & Search ledger
  let filteredLedger = state.ledger;
  
  // 1. Business Filter
  if (activeFilter !== "All") {
    filteredLedger = filteredLedger.filter(item => item.workspace === activeFilter);
  }

  // 2. Date Filter
  const todayStr = new Date().toISOString().split("T")[0];
  filteredLedger = filteredLedger.filter(item => {
    if (!item.date) return true;
    const itemDate = new Date(item.date);
    
    if (dateFilter === "today") {
      return item.date === todayStr;
    } else if (dateFilter === "this-month") {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return itemDate >= startOfMonth && itemDate <= now;
    } else if (dateFilter === "last-30") {
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return itemDate >= thirtyDaysAgo && itemDate <= now;
    } else if (dateFilter === "custom") {
      if (customStartDate && item.date < customStartDate) return false;
      if (customEndDate && item.date > customEndDate) return false;
      return true;
    }
    return true;
  });

  // 3. Search Filter
  if (searchQuery.trim() !== "") {
    filteredLedger = filteredLedger.filter(item => 
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.workspace.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = ["ID", "Date", "Type", "Workspace/Business", "Description", "Amount (BDT)"];
    const rows = state.ledger.map(entry => [
      entry.id,
      entry.date || "",
      entry.type,
      entry.workspace,
      `"${entry.description.replace(/"/g, '""')}"`,
      entry.amount
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `celouse_financial_ledger_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle adding new transaction
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount || isNaN(Number(newAmount))) return;
    onAddLedger({
      type: newType,
      amount: Number(newAmount),
      workspace: newWorkspace,
      description: newDesc || "Manual Entry",
      date: newDate
    });
    // Reset form
    setNewType("expense");
    setNewAmount("");
    setNewWorkspace("Personal");
    setNewDesc("");
    setNewDate(new Date().toISOString().split("T")[0]);
    setShowAddModal(false);
  };

  // Handle adding new pending invoice
  const handleAddInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceClient.trim() || !invoiceAmount || isNaN(Number(invoiceAmount)) || !onManageInvoice) return;
    onManageInvoice({
      action: "add",
      client: invoiceClient,
      project: invoiceProject || "General Consulting",
      amount: Number(invoiceAmount),
      dueDate: invoiceDueDate,
      status: "pending",
      workspace: invoiceWorkspace,
      type: invoiceType
    });
    // Reset form
    setInvoiceClient("");
    setInvoiceProject("");
    setInvoiceAmount("");
    setInvoiceDueDate(new Date().toISOString().split("T")[0]);
    setInvoiceWorkspace("Personal");
    setInvoiceType("income");
    setShowAddInvoiceModal(false);
  };

  // Mock static months for chart matching the image (Jan - Jun)
  const chartData = [
    { month: "JAN", revenue: 9500, expenses: 4200 },
    { month: "FEB", revenue: 11200, expenses: 5100 },
    { month: "MAR", revenue: 12100, expenses: 3800 },
    { month: "APR", revenue: 13500, expenses: 4400 },
    { month: "MAY", revenue: 12800, expenses: 3200 },
    { month: "JUN", revenue: 14200, expenses: 5800 }
  ];

  const maxRevenue = Math.max(...chartData.map(d => d.revenue));

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full pb-10 animate-fade-in" id="financial-ledger-view">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-950 font-sans tracking-tight">Financial Ledger</h2>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Real-time fiscal oversight and multi-workspace analytics.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs uppercase tracking-wide cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Entry</span>
        </button>
      </div>

      {/* Action Toast Feedback Banner */}
      {actionToast && (
        <div className="p-3 bg-neutral-900 text-white border border-neutral-800 rounded-xl flex items-center justify-between shadow-lg animate-fade-in text-xs">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{actionToast.message}</span>
          </div>
          <button 
            type="button"
            onClick={() => setActionToast(null)}
            className="text-neutral-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Metrics Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Revenue Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 font-mono">Revenue</span>
            <span className="text-lg sm:text-2xl font-bold font-mono text-gray-950 block">৳{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center">
              <ArrowUp className="w-3.5 h-3.5 mr-0.5" /> +12% vs last month
            </span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 font-mono">Expenses</span>
            <span className="text-lg sm:text-2xl font-bold font-mono text-gray-950 block">৳{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-[10px] font-bold text-gray-500 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> Steady
            </span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shrink-0">
            <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
          </div>
        </div>

        {/* Net Profit Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 font-mono">Net Profit</span>
            <span className="text-lg sm:text-2xl font-bold font-mono text-gray-950 block">৳{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center">
              <CheckCircle className="w-3.5 h-3.5 mr-0.5 text-emerald-500" /> Highly Efficient
            </span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black text-white flex items-center justify-center border border-gray-800 shrink-0">
            <Wallet className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
        </div>
      </div>

      {/* Chart & Pending Invoices Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Chart Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs md:col-span-8 flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">Revenue vs Expenses</h3>
              <p className="text-[10px] text-gray-400 font-medium">Historical workspace performance trends</p>
            </div>
            <div className="flex items-center space-x-4 text-[10px] font-bold font-mono uppercase tracking-wider">
              <span className="flex items-center"><span className="w-2.5 h-2.5 bg-black rounded-sm mr-1.5"></span> Revenue</span>
              <span className="flex items-center"><span className="w-2.5 h-2.5 bg-gray-200 rounded-sm mr-1.5"></span> Expenses</span>
            </div>
          </div>

          {/* SVG Column Chart */}
          <div className="flex-1 flex flex-col justify-end min-h-[220px]">
            <div className="flex items-end justify-between h-[180px] px-2 border-b border-gray-100">
              {chartData.map((data) => {
                const revHeightPct = (data.revenue / maxRevenue) * 95;
                const expHeightPct = (data.expenses / maxRevenue) * 95;
                return (
                  <div key={data.month} className="flex flex-col items-center flex-1 group relative">
                    <div className="flex items-end space-x-1 h-full w-full justify-center">
                      {/* Revenue Column */}
                      <div 
                        className="w-4 bg-black rounded-t-sm hover:bg-neutral-800 transition-all duration-300 relative group/rev"
                        style={{ height: `${revHeightPct}%` }}
                      >
                        <div className="absolute opacity-0 group-hover/rev:opacity-100 bg-gray-950 text-white text-[9px] font-mono px-1 rounded -top-7 left-1/2 transform -translate-x-1/2 z-10 whitespace-nowrap pointer-events-none transition-opacity">
                          Rev: ৳{data.revenue.toLocaleString()}
                        </div>
                      </div>
                      {/* Expenses Column */}
                      <div 
                        className="w-4 bg-gray-200 rounded-t-sm hover:bg-gray-300 transition-all duration-300 relative group/exp"
                        style={{ height: `${expHeightPct}%` }}
                      >
                        <div className="absolute opacity-0 group-hover/exp:opacity-100 bg-gray-950 text-white text-[9px] font-mono px-1 rounded -top-7 left-1/2 transform -translate-x-1/2 z-10 whitespace-nowrap pointer-events-none transition-opacity">
                          Exp: ৳{data.expenses.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-Axis labels */}
            <div className="flex justify-between px-2 mt-2">
              {chartData.map((data) => (
                <div key={data.month} className="flex-1 text-center">
                  <span className="text-[10px] font-extrabold text-gray-500 font-mono tracking-wider">{data.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pending Invoices Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs md:col-span-4 flex flex-col" id="pending-invoices-card">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">Pending Invoices</h3>
              <p className="text-[10px] text-gray-400 font-medium">Awaiting workspace settlement</p>
            </div>
            <button 
              onClick={() => {
                setInvoiceClient("");
                setInvoiceProject("");
                setInvoiceAmount("");
                setInvoiceDueDate(new Date().toISOString().split("T")[0]);
                setShowAddInvoiceModal(true);
              }}
              className="flex items-center space-x-1 text-xs font-bold text-gray-900 hover:text-black font-mono uppercase cursor-pointer"
              title="Add Pending Invoice"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[280px] scrollbar-thin">
            {state.pendingInvoices && state.pendingInvoices.length > 0 ? (
              state.pendingInvoices.map((inv) => (
                <div key={inv.id} className="p-3 bg-gray-50 hover:bg-gray-100/75 border border-gray-200 rounded-xl transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 mb-1">
                        <h4 className="text-xs font-semibold text-gray-900 leading-tight truncate">{inv.client}</h4>
                        <span className={`inline-block px-1.5 py-0.5 rounded-full border text-[8px] font-extrabold font-mono uppercase tracking-wider shrink-0 ${
                          inv.workspace === "Artbit" ? "bg-cyan-50 border-cyan-100 text-cyan-700" :
                          inv.workspace === "Axen" ? "bg-indigo-50 border-indigo-100 text-indigo-700" :
                          inv.workspace === "Biggan" ? "bg-orange-50 border-orange-100 text-orange-700" :
                          "bg-emerald-50 border-emerald-100 text-emerald-700"
                        }`}>
                          {inv.workspace || "Personal"}
                        </span>
                        <span className={`inline-block px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                          inv.type === "expense" ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-teal-50 text-teal-700 border border-teal-100"
                        }`}>
                          {inv.type === "expense" ? "Bill" : "Invoice"}
                        </span>
                      </div>
                      <p className="text-[9px] text-gray-400 font-mono truncate">{inv.project}</p>
                      <p className="text-[9px] text-amber-600 font-mono font-bold uppercase mt-1">Due: {inv.dueDate}</p>
                    </div>
                    <span className={`text-xs font-bold font-mono shrink-0 ${inv.type === "expense" ? "text-rose-600" : "text-gray-950"}`}>
                      {inv.type === "expense" ? "-" : ""}৳{inv.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-1.5 mt-2.5">
                    {onManageInvoice && (
                      <button 
                        onClick={() => {
                          onManageInvoice({ action: "pay", id: inv.id });
                        }}
                        className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center space-x-1 font-mono cursor-pointer border ${
                          inv.type === "expense" 
                            ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200" 
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                        }`}
                      >
                        <CheckCircle className="w-2.5 h-2.5" />
                        <span>{inv.type === "expense" ? "Pay Bill" : "Collect"}</span>
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        if (inv.type === "expense") {
                          triggerToast(`Payment notification drafted & dispatched to vendor ${inv.client}.`, "info");
                        } else {
                          triggerToast(`Reminder email drafted & dispatched to client ${inv.client}.`, "info");
                        }
                      }}
                      className="flex-1 py-1 bg-white border border-gray-200 hover:border-black hover:text-black text-[9px] font-bold uppercase tracking-wider text-gray-600 rounded-lg transition-all flex items-center justify-center space-x-1 font-mono cursor-pointer"
                    >
                      <Mail className="w-2.5 h-2.5" />
                      <span>{inv.type === "expense" ? "Notify" : "Remind"}</span>
                    </button>
                    {onManageInvoice && (
                      <button 
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete invoice for ${inv.client}?`)) {
                            onManageInvoice({ action: "delete", id: inv.id });
                          }
                        }}
                        className="p-1 hover:text-red-600 text-gray-400 rounded hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                        title="Delete Invoice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-gray-400 font-mono">
                No active pending invoices.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Ledger Table Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        {/* Table Controls Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 space-y-4">
          
          {/* Row 1: Business Filter & Export CSV */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 flex-1">
              <span className="block text-[9px] font-extrabold uppercase tracking-widest text-gray-400 font-mono">Filter by Business</span>
              <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-1">
                {uniqueBusinesses.map((pill) => (
                  <button
                    key={pill}
                    onClick={() => setActiveFilter(pill)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                      activeFilter === pill
                        ? "bg-black text-white border-black font-semibold shadow-2xs"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {pill}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-shrink-0 self-start md:self-end">
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-neutral-50 text-gray-800 border border-gray-200 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-3xs cursor-pointer font-mono"
                title="Export all transactions as CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Ledger</span>
              </button>
            </div>
          </div>

          {/* Row 2: Date Filters & Search */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-3 border-t border-gray-100">
            {/* Date filter presets */}
            <div className="md:col-span-8 space-y-1.5">
              <span className="block text-[9px] font-extrabold uppercase tracking-widest text-gray-400 font-mono font-sans">Filter by Date</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "all", label: "All Time" },
                  { id: "today", label: "Today" },
                  { id: "this-month", label: "This Month" },
                  { id: "last-30", label: "Last 30 Days" },
                  { id: "custom", label: "Custom Range..." }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setDateFilter(opt.id as any)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                      dateFilter === opt.id
                        ? "bg-neutral-900 border-neutral-900 text-white font-bold"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Inputs */}
              {dateFilter === "custom" && (
                <div className="flex items-center space-x-2 pt-2 animate-fade-in">
                  <div className="flex items-center space-x-1 bg-white border border-gray-200 rounded-lg px-2 py-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <input 
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="text-xs bg-transparent border-0 outline-none w-28 font-mono text-gray-700"
                      placeholder="Start Date"
                    />
                  </div>
                  <span className="text-gray-400 text-xs font-semibold font-sans">to</span>
                  <div className="flex items-center space-x-1 bg-white border border-gray-200 rounded-lg px-2 py-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <input 
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="text-xs bg-transparent border-0 outline-none w-28 font-mono text-gray-700"
                      placeholder="End Date"
                    />
                  </div>
                  {(customStartDate || customEndDate) && (
                    <button 
                      onClick={() => { setCustomStartDate(""); setCustomEndDate(""); }}
                      className="text-[10px] text-red-500 hover:underline font-bold font-mono uppercase bg-transparent border-0 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Search Input */}
            <div className="md:col-span-4 space-y-1.5 flex flex-col justify-end">
              <span className="block text-[9px] font-extrabold uppercase tracking-widest text-gray-400 font-mono">Search ledger</span>
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search description..."
                  className="w-full bg-white border border-gray-200 focus:border-black focus:ring-1 focus:ring-black rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none shadow-3xs transition-all font-medium"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

        </div>

        {/* Mobile Cards View */}
        <div className="block md:hidden divide-y divide-gray-100">
          {filteredLedger.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400 font-mono">
              No matching transaction entries discovered in active registers.
            </div>
          ) : (
            filteredLedger.map((entry) => (
              <div key={entry.id} className="p-3.5 space-y-2 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-gray-400">
                    {entry.date || "2023-10-18"}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full border text-[9px] font-bold ${
                      entry.workspace === "Artbit" ? "bg-cyan-50 border-cyan-100 text-cyan-700" :
                      entry.workspace === "Axen" ? "bg-indigo-50 border-indigo-100 text-indigo-700" :
                      entry.workspace === "Biggan" ? "bg-orange-50 border-orange-100 text-orange-700" :
                      "bg-emerald-50 border-emerald-100 text-emerald-700"
                    }`}>
                      {entry.workspace}
                    </span>
                    <span className="inline-block px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-extrabold uppercase tracking-wider font-mono">
                      PAID
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-gray-900 leading-snug flex-1">
                    {entry.description}
                  </p>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className={`text-xs sm:text-sm font-bold font-mono ${
                      entry.type === "income" ? "text-emerald-600" : "text-red-600"
                    }`}>
                      {entry.type === "income" ? "+" : "-"}৳{entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    {onDeleteLedger && (
                      <button
                        onClick={() => onDeleteLedger(entry.id)}
                        className="text-gray-300 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left">Date</th>
                <th scope="col" className="px-6 py-3.5 text-left">Description</th>
                <th scope="col" className="px-6 py-3.5 text-left">Business</th>
                <th scope="col" className="px-6 py-3.5 text-right">Amount</th>
                <th scope="col" className="px-6 py-3.5 text-center">Status</th>
                {onDeleteLedger && <th scope="col" className="px-6 py-3.5 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs text-gray-400 font-mono">
                    No matching transaction entries discovered in active registers.
                  </td>
                </tr>
              ) : (
                filteredLedger.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/50 transition-all">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-medium text-gray-500">
                      {entry.date || "2023-10-18"}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-gray-900">
                      {entry.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                        entry.workspace === "Artbit" ? "bg-cyan-50 border-cyan-100 text-cyan-700" :
                        entry.workspace === "Axen" ? "bg-indigo-50 border-indigo-100 text-indigo-700" :
                        entry.workspace === "Biggan" ? "bg-orange-50 border-orange-100 text-orange-700" :
                        "bg-emerald-50 border-emerald-100 text-emerald-700"
                      }`}>
                        {entry.workspace}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-xs font-bold font-mono text-right ${
                      entry.type === "income" ? "text-emerald-600" : "text-red-600"
                    }`}>
                      {entry.type === "income" ? "+" : "-"}৳{entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-xs">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-extrabold uppercase tracking-wider font-mono">
                        PAID
                      </span>
                    </td>
                    {onDeleteLedger && (
                      <td className="px-6 py-4 whitespace-nowrap text-center text-xs">
                        <button
                          onClick={() => onDeleteLedger(entry.id)}
                          className="text-gray-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Entry Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white border border-gray-250 rounded-xl shadow-xl max-w-sm w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto animate-scale-up">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center">
              <DollarSign className="w-4.5 h-4.5 text-black mr-2" /> Log Ledger Transaction
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Type</label>
                  <select 
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs cursor-pointer outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white"
                  >
                    <option value="expense">Expense (-)</option>
                    <option value="income">Revenue (+)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Amount (BDT)</label>
                  <input 
                    type="number" 
                    required
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Workspace</label>
                  <select 
                    value={newWorkspace}
                    onChange={(e) => setNewWorkspace(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs cursor-pointer outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white"
                  >
                    <option value="Personal">Personal</option>
                    <option value="Artbit">Artbit</option>
                    <option value="Axen">Axen</option>
                    <option value="Biggan">Biggan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Date</label>
                  <input 
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-xs outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Description *</label>
                <input 
                  type="text" 
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="e.g. Bio-Sensor licensing or Retainer"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold uppercase font-mono"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold uppercase font-mono shadow-xs"
                >
                  Log Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Pending Invoice Modal */}
      {showAddInvoiceModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white border border-gray-250 rounded-xl shadow-xl max-w-sm w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto animate-scale-up">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center">
              <Plus className="w-4.5 h-4.5 text-black mr-2" /> Add Pending Invoice / Bill
            </h3>
            <form onSubmit={handleAddInvoiceSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Item Type *</label>
                <select 
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-2 text-sm outline-none transition-all cursor-pointer font-sans text-gray-800"
                >
                  <option value="income">Pending Invoice (Receivable Revenue)</option>
                  <option value="expense">Pending Bill (Payable Expense)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">
                  {invoiceType === "expense" ? "Vendor / Payee Name *" : "Client Name *"}
                </label>
                <input 
                  type="text" 
                  required
                  value={invoiceClient}
                  onChange={(e) => setInvoiceClient(e.target.value)}
                  placeholder={invoiceType === "expense" ? "e.g. AWS, Office Landlord, Contractor" : "e.g. Artbit Creative"}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-2 text-sm outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">
                  {invoiceType === "expense" ? "Bill Description / Purpose *" : "Project / Retainer Scope *"}
                </label>
                <input 
                  type="text" 
                  required
                  value={invoiceProject}
                  onChange={(e) => setInvoiceProject(e.target.value)}
                  placeholder={invoiceType === "expense" ? "e.g. Q3 AWS Cloud hosting bill" : "e.g. Design System Retainer"}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-2 text-sm outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Business / Workspace *</label>
                <select 
                  value={invoiceWorkspace}
                  onChange={(e) => setInvoiceWorkspace(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-2 text-sm outline-none transition-all cursor-pointer font-sans text-gray-800"
                >
                  {availableBusinesses.map((biz) => (
                    <option key={biz} value={biz}>{biz}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Amount (BDT) *</label>
                  <input 
                    type="number" 
                    required
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    placeholder="e.g. 240000"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-1.5 text-xs outline-none transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Due Date *</label>
                  <input 
                    type="date" 
                    required
                    value={invoiceDueDate}
                    onChange={(e) => setInvoiceDueDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-1.5 text-xs outline-none transition-all font-mono"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddInvoiceModal(false)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold uppercase font-mono"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold uppercase font-mono shadow-xs"
                >
                  Add Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
