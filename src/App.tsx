import React, { useState, useEffect } from "react";
import { 
  MessageSquare, ClipboardList, LayoutGrid, Wallet, Heart, Settings, 
  Menu, Bell, User, Database 
} from "lucide-react";
import { AppState, Task, LedgerEntry, Prayer, Habit, UserAccount } from "./types";
import ChatView from "./components/ChatView";
import HubView from "./components/HubView";
import TasksView from "./components/TasksView";
import HabitsView from "./components/HabitsView";
import SettingsView from "./components/SettingsView";
import FinancialLedgerView from "./components/FinancialLedgerView";
import LoginModal from "./components/LoginModal";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("Hub");
  const [state, setState] = useState<AppState | null>(null);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [loading, setLoading] = useState(true);

  // Device ID initialization
  const [deviceId] = useState<string>(() => {
    let saved = localStorage.getItem("celouse_device_id");
    if (!saved) {
      saved = "dev_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
      localStorage.setItem("celouse_device_id", saved);
    }
    return saved;
  });

  // User Authentication & Profile state
  const [userAccount, setUserAccount] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem("celouse_user_account");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });

  const [showLoginModal, setShowLoginModal] = useState<boolean>(true);

  // Verify device session on mount
  useEffect(() => {
    verifyDeviceSession();
  }, [deviceId]);

  const verifyDeviceSession = async () => {
    const token = localStorage.getItem("celouse_session_token");
    if (!token) {
      setShowLoginModal(true);
      return;
    }

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, token })
      });
      const data = await res.json();
      if (data.valid && data.user) {
        setUserAccount(data.user);
        localStorage.setItem("celouse_user_account", JSON.stringify(data.user));
        setShowLoginModal(false);
        // Load data from this user's dedicated database
        fetchState(data.user.id, token);
      } else {
        localStorage.removeItem("celouse_session_token");
        setShowLoginModal(true);
      }
    } catch (err) {
      console.error("Session verification error:", err);
      setShowLoginModal(true);
    }
  };

  const handleLoginSuccess = (user: UserAccount, token: string) => {
    setUserAccount(user);
    localStorage.setItem("celouse_user_account", JSON.stringify(user));
    localStorage.setItem("celouse_session_token", token);
    setShowLoginModal(false);
    // Reload state for this user's isolated database immediately
    fetchState(user.id, token);
  };

  const handleUpdateUserAccount = (updatedUser: UserAccount) => {
    setUserAccount(updatedUser);
    localStorage.setItem("celouse_user_account", JSON.stringify(updatedUser));
  };

  const handleLogout = async () => {
    const token = localStorage.getItem("celouse_session_token");
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ deviceId, token })
      });
    } catch (e) {}

    localStorage.removeItem("celouse_session_token");
    if (userAccount) {
      const updated = { ...userAccount, isLoggedIn: false };
      setUserAccount(updated);
      localStorage.setItem("celouse_user_account", JSON.stringify(updated));
    }
    setState(null);
    setShowLoginModal(true);
  };

  // Dedicated API fetch helper ensuring user session and tenant database isolation headers
  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("celouse_session_token") || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}`, "x-session-token": token } : {}),
      "x-device-id": deviceId,
      ...(userAccount?.id ? { "x-user-id": userAccount.id } : {}),
      ...(options.headers as Record<string, string> || {})
    };
    return fetch(url, {
      ...options,
      headers
    });
  };

  // Load state on mount
  useEffect(() => {
    fetchState();
  }, []);

  const fetchState = async (overrideUserId?: string, overrideToken?: string) => {
    try {
      const token = overrideToken || localStorage.getItem("celouse_session_token") || "";
      const uId = overrideUserId || userAccount?.id;
      const res = await fetch("/api/state", {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}`, "x-session-token": token } : {}),
          "x-device-id": deviceId,
          ...(uId ? { "x-user-id": uId } : {})
        }
      });
      const data = await res.json();
      setState(data);
    } catch (err) {
      console.error("Error fetching state:", err);
    } finally {
      setLoading(false);
    }
  };

  // State handlers to synchronize instantly with server
  const handleSendMessage = async (message: string, pins: string[]) => {
    if (!state) return;
    setIsSendingChat(true);

    // Optimistically add user message to history
    const userMsg = {
      id: "user-opt-" + Date.now(),
      sender: "user" as const,
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setState(prev => prev ? {
      ...prev,
      chatHistory: [...prev.chatHistory, userMsg]
    } : null);

    try {
      const res = await apiFetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message, activePins: pins })
      });
      const data = await res.json();
      if (data.state) {
        setState(data.state);
      } else {
        setState(prev => prev ? { ...prev, chatHistory: data.messages } : null);
      }
    } catch (err) {
      console.error("Error sending chat message:", err);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      const res = await apiFetch("/api/chat/clear", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setState(prev => prev ? { ...prev, chatHistory: data.messages } : null);
      }
    } catch (err) {
      console.error("Error clearing chat history:", err);
    }
  };

  const handleAddTask = async (taskData: Partial<Task>) => {
    try {
      const res = await apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ action: "add", task: taskData })
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => prev ? { ...prev, tasks: data.tasks } : null);
      }
    } catch (err) {
      console.error("Error adding task:", err);
    }
  };

  const handleToggleTask = async (task: Task) => {
    // Optimistic Update
    setState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: prev.tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t)
      };
    });

    try {
      const res = await apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ action: "toggle", task })
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => prev ? { ...prev, tasks: data.tasks } : null);
      }
    } catch (err) {
      console.error("Error toggling task:", err);
    }
  };

  const handleEditTask = async (taskData: Task) => {
    try {
      const res = await apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ action: "edit", task: taskData })
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => prev ? { ...prev, tasks: data.tasks } : null);
      }
    } catch (err) {
      console.error("Error editing task:", err);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    // Optimistic Update
    setState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== task.id)
      };
    });

    try {
      const res = await apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ action: "delete", task })
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => prev ? { ...prev, tasks: data.tasks } : null);
      }
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const handleTogglePrayer = async (prayerId: string, completed: boolean) => {
    // Optimistic Update
    setState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        prayers: prev.prayers.map(p => p.id === prayerId ? { ...p, completed, status: completed ? "checked" : "upcoming" } : p)
      };
    });

    try {
      const res = await apiFetch("/api/prayers", {
        method: "POST",
        body: JSON.stringify({ prayerId, completed })
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => prev ? { ...prev, prayers: data.prayers } : null);
      }
    } catch (err) {
      console.error("Error toggling prayer:", err);
    }
  };

  const handleToggleHabit = async (habitId: string, completed: boolean) => {
    // Optimistic Update
    setState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        habits: prev.habits.map(h => h.id === habitId ? { ...h, completed } : h)
      };
    });

    try {
      const res = await apiFetch("/api/habits", {
        method: "POST",
        body: JSON.stringify({ habitId, completed })
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => prev ? { ...prev, habits: data.habits } : null);
      }
    } catch (err) {
      console.error("Error toggling habit:", err);
    }
  };

  const handleUpdateSettings = async (settingsData: Partial<AppState["settings"]>) => {
    try {
      const res = await apiFetch("/api/settings", {
        method: "POST",
        body: JSON.stringify(settingsData)
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => prev ? { ...prev, settings: data.settings } : null);
      }
    } catch (err) {
      console.error("Error updating settings:", err);
    }
  };

  const handleAddBusiness = async (name: string, currency: string) => {
    try {
      const res = await apiFetch("/api/business", {
        method: "POST",
        body: JSON.stringify({ name, currency })
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => prev ? { ...prev, businessProfiles: data.businessProfiles } : null);
      }
    } catch (err) {
      console.error("Error adding business:", err);
    }
  };

  const handleEditBusiness = async (id: string, name: string, currency: string) => {
    try {
      const res = await apiFetch("/api/business", {
        method: "POST",
        body: JSON.stringify({ action: "edit", id, name, currency })
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => prev ? { ...prev, businessProfiles: data.businessProfiles } : null);
      }
    } catch (err) {
      console.error("Error editing business:", err);
    }
  };

  const handleDeleteBusiness = async (id: string) => {
    try {
      const res = await apiFetch("/api/business", {
        method: "POST",
        body: JSON.stringify({ action: "delete", id })
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => prev ? { ...prev, businessProfiles: data.businessProfiles } : null);
      }
    } catch (err) {
      console.error("Error deleting business:", err);
    }
  };

  const handleManageTeam = async (actionData: { action: "add" | "edit" | "delete"; id?: string; name?: string; phone?: string; email?: string; location?: string; role?: string }) => {
    try {
      const res = await apiFetch("/api/team", {
        method: "POST",
        body: JSON.stringify(actionData)
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => prev ? { ...prev, teamMembers: data.teamMembers } : null);
      }
    } catch (err) {
      console.error("Error managing team:", err);
    }
  };

  const handleManageInvoice = async (actionData: { action: "add" | "edit" | "delete" | "pay"; id?: string; client?: string; project?: string; amount?: number; dueDate?: string; status?: string; workspace?: string; type?: string }) => {
    try {
      const res = await apiFetch("/api/invoices", {
        method: "POST",
        body: JSON.stringify(actionData)
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => {
          if (!prev) return null;
          const updated: Partial<AppState> = {
            pendingInvoices: data.pendingInvoices
          };
          if (data.ledger) {
            updated.ledger = data.ledger;
          }
          return { ...prev, ...updated } as AppState;
        });
      }
    } catch (err) {
      console.error("Error managing invoice:", err);
    }
  };

  const handleAddLedger = async (ledgerData: { type: "income" | "expense"; amount: number; workspace: any; description: string; date?: string }) => {
    try {
      const res = await apiFetch("/api/ledger", {
        method: "POST",
        body: JSON.stringify(ledgerData)
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => prev ? { ...prev, ledger: data.ledger } : null);
      }
    } catch (err) {
      console.error("Error adding ledger transaction:", err);
    }
  };

  const handleDeleteLedger = async (ledgerId: string) => {
    try {
      const res = await apiFetch("/api/ledger/delete", {
        method: "POST",
        body: JSON.stringify({ id: ledgerId })
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => prev ? { ...prev, ledger: data.ledger } : null);
      }
    } catch (err) {
      console.error("Error deleting ledger entry:", err);
    }
  };

  const handleSyncKb = async () => {
    try {
      const res = await apiFetch("/api/kb/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setState(prev => prev ? { ...prev, settings: data.settings } : null);
      }
    } catch (err) {
      console.error("Error syncing knowledge base:", err);
    }
  };

  const handleManageLinkedFolder = async (actionData: { action: "add" | "delete" | "update"; id: string; name?: string; link?: string; filesCount?: number }) => {
    try {
      const res = await apiFetch("/api/drive/folders", {
        method: "POST",
        body: JSON.stringify(actionData)
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => prev ? { ...prev, linkedFolders: data.linkedFolders } : null);
      }
    } catch (err) {
      console.error("Error managing linked folder:", err);
    }
  };

  const handleUpdateQuickNotes = async (quickNotes: string) => {
    setState(prev => prev ? { ...prev, quickNotes } : null);
    try {
      const res = await apiFetch("/api/quicknotes", {
        method: "POST",
        body: JSON.stringify({ quickNotes })
      });
      const data = await res.json();
      if (data.success) {
        setState(prev => prev ? { ...prev, quickNotes: data.quickNotes } : null);
      }
    } catch (err) {
      console.error("Error updating quick notes:", err);
    }
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case "Hub":
        return { main: "Dashboard", status: "Operational Overview", isLive: true };
      case "Chat":
        return { main: "Gemini Core", status: "● AI Assistant Active", isLive: true };
      case "Tasks":
        return { main: "Tasks", status: "Workspace Action registry", isLive: false };
      case "Habits":
        return { main: "Habits & Prayers", status: "Precision Daily pulse", isLive: false };
      case "FinancialLedger":
        return { main: "Financial Ledger", status: "Base currency: BDT", isLive: false };
      case "Settings":
        return { main: "Database & Settings", status: "Manage local data, cloud sync, and core settings", isLive: false };
      default:
        return { main: "Celouse", status: "System online", isLive: true };
    }
  };

  const header = getHeaderTitle();

  if (loading || !state) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
        <p className="text-xs font-mono text-gray-500 font-bold tracking-wider uppercase animate-pulse">Initializing clinical intelligence database...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col pb-24 md:pb-6 md:pl-64">
      
      {/* Fixed Desktop Left Sidebar */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 p-5 shrink-0 z-20">
        <div className="flex items-center space-x-2 pb-5 border-b border-gray-100 mb-6">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white font-bold text-sm">C</div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 tracking-tight leading-none">Celouse</h1>
            <span className="text-[10px] font-bold text-gray-500 font-mono mt-1 block">SYSTEM ACTIVE</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1.5 flex-1 overflow-y-auto scrollbar-none">
          {[
            { id: "Hub", label: "Dashboard", icon: LayoutGrid },
            { id: "Chat", label: "AI Core Chat", icon: MessageSquare },
            { id: "Tasks", label: "Tasks", icon: ClipboardList },
            { id: "Habits", label: "Habits & Prayers", icon: Heart },
            { id: "FinancialLedger", label: "Financial Ledger", icon: Wallet },
            { id: "Settings", label: "Database & Settings", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-xs font-medium tracking-wide border transition-all cursor-pointer ${
                  isSelected 
                    ? "bg-gray-55 text-gray-900 border-gray-255 font-semibold shadow-2xs" 
                    : "text-gray-500 hover:text-gray-900 border-transparent hover:bg-gray-50/50"
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isSelected ? "text-gray-900" : "text-gray-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User context footer */}
        <div 
          onClick={() => setShowLoginModal(true)}
          className="pt-4 border-t border-gray-100 flex items-center space-x-3 mt-auto shrink-0 hover:bg-gray-50/80 p-2 rounded-xl transition-all cursor-pointer group"
          title="Click to edit profile or switch account"
        >
          <img 
            src={userAccount?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces"} 
            alt="User profile"
            className="w-9 h-9 rounded-full border border-gray-200 object-cover shrink-0 shadow-2xs group-hover:scale-105 transition-all"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-950 truncate">{userAccount?.name || "Jubayer Alam"}</p>
            <p className="text-[9px] font-mono font-bold text-emerald-600 uppercase tracking-wider">
              {userAccount?.isLoggedIn ? "Session: Active" : "Logged Out"}
            </p>
          </div>
        </div>
      </aside>

      {/* Top Header Bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-3xs">
        <div className="flex items-center space-x-3">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold text-gray-950 tracking-tight uppercase tracking-wider">{header.main}</h2>
              {header.isLive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              )}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider font-mono mt-0.5 block ${
              header.isLive ? "text-emerald-600" : "text-gray-400"
            }`}>
              {header.status}
            </span>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setActiveTab("Settings")}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            title="System Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setShowLoginModal(true)}
            className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded-full border border-gray-200 transition-all cursor-pointer group"
            title="Account & Profile Settings"
          >
            <img 
              src={userAccount?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces"} 
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover group-hover:scale-105 transition-transform"
            />
          </button>
        </div>
      </header>

      {/* Main Context Wrapper with Responsive Paddings */}
      <main className="p-4 md:p-6 flex-1 overflow-x-hidden">
        {activeTab === "Hub" && (
          <HubView 
            state={state}
            onNavigateToTab={setActiveTab}
            onToggleTask={handleToggleTask}
            onTogglePrayer={handleTogglePrayer}
            onUpdateQuickNotes={handleUpdateQuickNotes}
          />
        )}
        {activeTab === "Chat" && (
          <ChatView 
            state={state}
            onSendMessage={handleSendMessage}
            onClearHistory={handleClearHistory}
            isSending={isSendingChat}
          />
        )}
        {activeTab === "Tasks" && (
          <TasksView 
            state={state}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onEditTask={handleEditTask}
          />
        )}
        {activeTab === "Habits" && (
          <HabitsView 
            state={state}
            onTogglePrayer={handleTogglePrayer}
            onToggleHabit={handleToggleHabit}
          />
        )}
        {activeTab === "FinancialLedger" && (
          <FinancialLedgerView 
            state={state}
            onAddLedger={handleAddLedger}
            onDeleteLedger={handleDeleteLedger}
            onManageInvoice={handleManageInvoice}
          />
        )}
        {activeTab === "Settings" && (
          <SettingsView 
            state={state}
            userAccount={userAccount}
            deviceId={deviceId}
            onUpdateUserAccount={handleUpdateUserAccount}
            onOpenLoginModal={() => setShowLoginModal(true)}
            onLogout={handleLogout}
            onUpdateSettings={handleUpdateSettings}
            onAddBusiness={handleAddBusiness}
            onEditBusiness={handleEditBusiness}
            onDeleteBusiness={handleDeleteBusiness}
            onAddLedger={handleAddLedger}
            onSyncKb={handleSyncKb}
            onManageTeam={handleManageTeam}
            onManageLinkedFolder={handleManageLinkedFolder}
            initialSubTab="KB"
          />
        )}
      </main>

      {/* Login & Device Authentication Modal */}
      <LoginModal
        isOpen={showLoginModal}
        currentUser={userAccount}
        deviceId={deviceId}
        onLoginSuccess={handleLoginSuccess}
        onClose={() => setShowLoginModal(false)}
        canDismiss={userAccount?.isLoggedIn || false}
      />

      {/* Fixed Bottom Tab Navigation Bar for Mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex items-center justify-around py-2.5 z-30 shadow-lg">
        {[
          { id: "Hub", label: "Dashboard", icon: LayoutGrid },
          { id: "Chat", label: "Chat", icon: MessageSquare },
          { id: "Tasks", label: "Tasks", icon: ClipboardList },
          { id: "Habits", label: "Tracker", icon: Heart },
          { id: "FinancialLedger", label: "Business", icon: Wallet },
          { id: "Settings", label: "Settings", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-center flex-1 py-1 focus:outline-none cursor-pointer"
            >
              <div className={`p-1 rounded-full transition-all ${
                isSelected ? "text-gray-900 bg-gray-50" : "text-gray-400"
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                isSelected ? "text-gray-900" : "text-gray-400"
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

    </div>
  );
}
