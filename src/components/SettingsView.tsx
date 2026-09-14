import React, { useState, useEffect } from "react";
import { 
  FolderSync, Database, Search, ArrowRight, Eye, EyeOff, Save, CheckCircle, 
  Settings, Key, Plus, FileText, ChevronRight, UserPlus, Server, CloudLightning, RefreshCw,
  Edit, Trash2, MapPin, Phone, Mail, User, Folder, FolderOpen, File, ExternalLink, LogOut, LogIn, Loader2,
  Upload, Link as LinkIcon, Check, Camera, Sparkles, Lock, Shield, CheckCircle2, X, Image as ImageIcon
} from "lucide-react";
import { AppState, BusinessProfile, TeamMember, KnowledgeBaseDoc, UserAccount } from "../types";
import { compressImageFile } from "../lib/imageCompressor";

const AVATAR_PRESETS = [
  {
    id: "preset-1",
    label: "Clinical / Executive",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces"
  },
  {
    id: "preset-2",
    label: "Medical Specialist",
    url: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&h=150&fit=crop&crop=faces"
  },
  {
    id: "preset-3",
    label: "Tech Lead",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces"
  },
  {
    id: "preset-4",
    label: "Creative Director",
    url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces"
  },
  {
    id: "preset-5",
    label: "Senior Operator",
    url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces"
  },
  {
    id: "preset-6",
    label: "Product Manager",
    url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=faces"
  },
  {
    id: "preset-7",
    label: "Systems Architect",
    url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=faces"
  },
  {
    id: "preset-8",
    label: "Clinical Researcher",
    url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=faces"
  }
];

interface SettingsViewProps {
  state: AppState;
  userAccount?: UserAccount | null;
  deviceId?: string;
  onUpdateUserAccount?: (user: UserAccount) => void;
  onOpenLoginModal?: () => void;
  onLogout?: () => void;
  onUpdateSettings: (settings: Partial<AppState["settings"]>) => void;
  onAddBusiness: (name: string, currency: string) => void;
  onEditBusiness?: (id: string, name: string, currency: string) => void;
  onDeleteBusiness?: (id: string) => void;
  onAddLedger: (entry: { type: "income" | "expense"; amount: number; workspace: any; description: string }) => void;
  onSyncKb: () => void;
  onManageTeam?: (actionData: { action: "add" | "edit" | "delete"; id?: string; name?: string; phone?: string; email?: string; location?: string; role?: string }) => void;
  onManageLinkedFolder?: (actionData: { action: "add" | "delete" | "update"; id: string; name?: string; link?: string; filesCount?: number }) => void;
  initialSubTab?: "KB" | "Drive" | "Settings";
}

export default function SettingsView({ 
  state, 
  userAccount,
  deviceId,
  onUpdateUserAccount,
  onOpenLoginModal,
  onLogout,
  onUpdateSettings, 
  onAddBusiness, 
  onEditBusiness,
  onDeleteBusiness,
  onAddLedger, 
  onSyncKb, 
  onManageTeam,
  onManageLinkedFolder,
  initialSubTab = "KB" 
}: SettingsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"KB" | "Drive" | "Settings">(initialSubTab as any);

  // Profile Edit States
  const [showProfileEditor, setShowProfileEditor] = useState<boolean>(true);
  const [profileName, setProfileName] = useState(userAccount?.name || "Jubayer Alam");
  const [profileRole, setProfileRole] = useState(userAccount?.role || "Clinical Operator");
  const [profileAvatar, setProfileAvatar] = useState(userAccount?.avatar || AVATAR_PRESETS[0].url);
  const [profilePassword, setProfilePassword] = useState("");
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);
  const [showCustomUrlInput, setShowCustomUrlInput] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [apiSaveSuccess, setApiSaveSuccess] = useState(false);

  useEffect(() => {
    if (userAccount) {
      setProfileName(userAccount.name || "Jubayer Alam");
      setProfileRole(userAccount.role || "Clinical Operator");
      setProfileAvatar(userAccount.avatar || AVATAR_PRESETS[0].url);
    }
  }, [userAccount]);

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileErrorMsg(null);
      try {
        const compressed = await compressImageFile(file, 360, 360, 0.85);
        setProfileAvatar(compressed);
      } catch (err) {
        console.error("Avatar compression error:", err);
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            setProfileAvatar(reader.result);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customAvatarUrl.trim()) {
      setProfileAvatar(customAvatarUrl.trim());
      setShowCustomUrlInput(false);
      setCustomAvatarUrl("");
    }
  };

  const handleSaveProfileChanges = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profileName.trim()) {
      setProfileErrorMsg("Full name cannot be blank.");
      return;
    }

    setIsSavingProfile(true);
    setProfileErrorMsg(null);
    setProfileSuccessMsg(null);

    try {
      const token = localStorage.getItem("celouse_session_token");
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          token,
          userId: userAccount?.id,
          name: profileName.trim(),
          avatar: profileAvatar,
          role: profileRole.trim(),
          newPassword: profilePassword.trim() || undefined
        })
      });

      let data: any;
      const textResponse = await res.text();
      try {
        data = JSON.parse(textResponse);
      } catch (parseErr) {
        console.error("Server raw non-JSON response:", textResponse);
        throw new Error(`Server returned unexpected format (${res.status} ${res.statusText})`);
      }

      if (data.success && data.user) {
        if (onUpdateUserAccount) {
          onUpdateUserAccount(data.user);
        }
        setProfileSuccessMsg("Profile name, title, and picture updated successfully!");
        setProfilePassword("");
        setTimeout(() => setProfileSuccessMsg(null), 4000);
      } else {
        setProfileErrorMsg(data.error || "Failed to update profile.");
      }
    } catch (err: any) {
      console.error("Profile save error:", err);
      setProfileErrorMsg(err.message || "Network error saving profile changes. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  React.useEffect(() => {
    setActiveSubTab(initialSubTab as any);
  }, [initialSubTab]);

  // Google Drive Manual Add Folder States
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderLink, setNewFolderLink] = useState("");
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  const handleAddFolderManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !newFolderLink.trim()) {
      setFolderError("Please enter both folder name and link.");
      return;
    }
    if (!onManageLinkedFolder) return;

    setIsAddingFolder(true);
    setFolderError(null);
    try {
      let url = newFolderLink.trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }

      // Add folder via API
      onManageLinkedFolder({
        action: "add",
        id: "folder-" + Date.now(),
        name: newFolderName.trim(),
        link: url
      });

      setNewFolderName("");
      setNewFolderLink("");
    } catch (err: any) {
      setFolderError(err.message || "Failed to link Google Drive folder");
    } finally {
      setIsAddingFolder(false);
    }
  };

  const handleUnlinkFolderAction = (folderId: string, folderName: string) => {
    const confirmed = window.confirm(`Are you sure you want to remove "${folderName}"?`);
    if (!confirmed) return;
    if (onManageLinkedFolder) {
      onManageLinkedFolder({
        action: "delete",
        id: folderId
      });
    }
  };

  const [searchDocQuery, setSearchDocQuery] = useState("");
  const [searchDocResponse, setSearchDocResponse] = useState("");
  const [isSearchingDocs, setIsSearchingDocs] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Settings Form States
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(state.settings.geminiApiKey);

  // Business Profiles Form State
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileCurrency, setNewProfileCurrency] = useState("BDT");

  // Business Profiles Edit States
  const [editingProfile, setEditingProfile] = useState<BusinessProfile | null>(null);
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileCurrency, setEditProfileCurrency] = useState("BDT");
  const [showEditProfile, setShowEditProfile] = useState(false);

  // Team Member Form States
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [editingTeamMember, setEditingTeamMember] = useState<TeamMember | null>(null);
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamPhone, setTeamPhone] = useState("");
  const [teamEmail, setTeamEmail] = useState("");
  const [teamLocation, setTeamLocation] = useState("");
  const [teamRole, setTeamRole] = useState("");

  // Ledger Creation Form State
  const [showAddLedger, setShowAddLedger] = useState(false);
  const [ledgerType, setLedgerType] = useState<"income" | "expense">("expense");
  const [ledgerAmount, setLedgerAmount] = useState("");
  const [ledgerWorkspace, setLedgerWorkspace] = useState<"Artbit" | "Axen" | "Biggan" | "Personal">("Personal");
  const [ledgerDesc, setLedgerDesc] = useState("");

  const handleDocSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchDocQuery.trim()) return;
    setIsSearchingDocs(true);
    setSearchDocResponse("");
    try {
      const res = await fetch("/api/kb/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchDocQuery })
      });
      const data = await res.json();
      setSearchDocResponse(data.answer || data.error || "No context returned.");
    } catch (err) {
      setSearchDocResponse("Error querying clinical index server.");
    } finally {
      setIsSearchingDocs(false);
    }
  };

  const handleSyncKB = async () => {
    setIsSyncing(true);
    setTimeout(async () => {
      onSyncKb();
      setIsSyncing(false);
    }, 1200);
  };

  const saveSettings = () => {
    onUpdateSettings({ geminiApiKey: apiKeyInput });
    setApiSaveSuccess(true);
    setTimeout(() => {
      setApiSaveSuccess(false);
    }, 3000);
  };

  const handleAddProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    onAddBusiness(newProfileName, newProfileCurrency);
    setNewProfileName("");
    setShowAddProfile(false);
  };

  const handleEditProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !editProfileName.trim() || !onEditBusiness) return;
    onEditBusiness(editingProfile.id, editProfileName, editProfileCurrency);
    setShowEditProfile(false);
    setEditingProfile(null);
  };

  const handleAddTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !onManageTeam) return;
    onManageTeam({
      action: "add",
      name: teamName,
      phone: teamPhone,
      email: teamEmail,
      location: teamLocation,
      role: teamRole || "Operator"
    });
    setShowAddTeamModal(false);
    setTeamName("");
    setTeamPhone("");
    setTeamEmail("");
    setTeamLocation("");
    setTeamRole("");
  };

  const handleEditTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeamMember || !teamName.trim() || !onManageTeam) return;
    onManageTeam({
      action: "edit",
      id: editingTeamMember.id,
      name: teamName,
      phone: teamPhone,
      email: teamEmail,
      location: teamLocation,
      role: teamRole
    });
    setShowEditTeamModal(false);
    setEditingTeamMember(null);
  };

  const handleAddLedgerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerAmount) return;
    onAddLedger({
      type: ledgerType,
      amount: Number(ledgerAmount),
      workspace: ledgerWorkspace,
      description: ledgerDesc || "Manual manual entry"
    });
    setLedgerAmount("");
    setLedgerDesc("");
    setShowAddLedger(false);
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 pb-12">
      {/* Sub-navigation Headers */}
      <div className="flex border-b border-gray-250 bg-white p-2 rounded-xl border items-center space-x-2 shadow-3xs animate-fade-in">
        <button 
          onClick={() => setActiveSubTab("KB")}
          className={`flex-1 text-center py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            activeSubTab === "KB" 
              ? "bg-black text-white shadow-2xs font-semibold" 
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Database
        </button>
        <button 
          onClick={() => setActiveSubTab("Drive")}
          className={`flex-1 text-center py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            activeSubTab === "Drive" 
              ? "bg-black text-white shadow-2xs font-semibold" 
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Google Drive Sync
        </button>
        <button 
          onClick={() => setActiveSubTab("Settings")}
          className={`flex-1 text-center py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            activeSubTab === "Settings" 
              ? "bg-black text-white shadow-2xs font-semibold" 
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Settings
        </button>
      </div>

      {activeSubTab === "KB" && (
        <div id="knowledge-base-panel" className="space-y-6 animate-fade-in">
          {/* Header Title with Connection status */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-950">Knowledge Base</h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">Manage indexed data sources for Clinical AI</p>
            </div>
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-full border border-emerald-100 flex items-center space-x-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-0.5"></span>
              Google Drive: Connected
            </span>
          </div>

          {/* Search bar for querying indexed documents */}
          <form onSubmit={handleDocSearch} className="relative">
            <input 
              type="text" 
              value={searchDocQuery}
              onChange={(e) => setSearchDocQuery(e.target.value)}
              placeholder="Query indexed clinical documents or workspace files..."
              className="w-full bg-white border border-gray-200 focus:border-black focus:ring-1 focus:ring-black rounded-xl pl-10 pr-12 py-2.5 text-sm outline-none shadow-xs transition-all"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <button 
              type="submit"
              className="absolute right-2 top-1.5 px-3 py-1 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold uppercase transition-all"
            >
              Query
            </button>
          </form>

          {/* AI Search Response Area */}
          {(isSearchingDocs || searchDocResponse) && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 animate-scale-up">
              <h4 className="text-xs font-bold text-gray-950 uppercase tracking-wider mb-2 flex items-center font-mono">
                <CloudLightning className="w-4 h-4 mr-1 animate-bounce text-gray-800" /> Clinical AI Context response
              </h4>
              {isSearchingDocs ? (
                <div className="flex items-center space-x-2 text-xs text-gray-400 py-3 font-mono">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                  <span>Scanning index structures across business logs...</span>
                </div>
              ) : (
                <p className="text-xs text-gray-700 font-medium whitespace-pre-wrap leading-relaxed">{searchDocResponse}</p>
              )}
            </div>
          )}

          {/* Drive Sync Status Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3.5 mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800">
                  <FolderSync className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-950">Drive Sync Status</h4>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">Last synced: {state.settings.lastSyncTime}</p>
                </div>
              </div>
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>

            {/* Quota Progress */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs font-mono font-semibold">
                <span className="text-gray-500">Indexed Files: <span className="font-bold text-gray-800 font-sans">{state.settings.totalIndexedFiles.toLocaleString()}</span></span>
                <span className="text-gray-400">Storage Quota: 85% Used</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-black h-full" style={{ width: "85%" }}></div>
              </div>
            </div>

            {/* Auto sync toggles and buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="auto-sync-t"
                  checked={state.settings.driveSyncEnabled}
                  onChange={(e) => onUpdateSettings({ driveSyncEnabled: e.target.checked })}
                  className="h-4 w-4 rounded text-black border-gray-300 focus:ring-black cursor-pointer"
                />
                <label htmlFor="auto-sync-t" className="text-xs text-gray-600 font-bold uppercase tracking-wider font-mono cursor-pointer">Auto-sync active</label>
              </div>

              <button 
                onClick={handleSyncKB}
                disabled={isSyncing}
                className="flex items-center space-x-1.5 px-4 py-2 bg-gray-50 border border-gray-200 text-gray-800 hover:bg-gray-100 hover:border-gray-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
              </button>
            </div>
          </div>

          {/* Active Context Modules */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-sm font-semibold text-gray-950 uppercase tracking-wide">Active Context Modules</h3>
              <button 
                onClick={() => {
                  setActiveSubTab("Drive");
                }}
                className="text-xs font-bold text-gray-900 hover:text-black font-mono cursor-pointer hover:underline flex items-center space-x-1"
              >
                <span>+ Link Drive Folder</span>
              </button>
            </div>

            <div className="space-y-3">
              {state.knowledgeBase.map((kbDoc) => (
                <div 
                  key={kbDoc.id}
                  className="flex items-center justify-between p-3.5 border border-gray-200 hover:border-gray-400 rounded-lg transition-colors bg-white shadow-3xs"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="p-2 bg-gray-50 text-gray-500 rounded-lg border border-gray-200">
                      <FileText className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-850">{kbDoc.title}</p>
                      <p className="text-[10px] text-gray-400 font-semibold font-mono mt-0.5">{kbDoc.source}</p>
                    </div>
                  </div>

                  <span className="bg-gray-100 text-gray-600 text-[10px] font-bold font-mono px-2 py-1 rounded">
                    {kbDoc.docCount} Docs
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "Drive" && (
        <div id="google-drive-sync-panel" className="space-y-6 animate-fade-in">
          {/* Main info card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-950">Google Drive Folders</h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">Easily manage and access relevant Google Drive folders directly from Celouse</p>
            </div>
            <div className="p-2.5 bg-gray-50 border border-gray-100 text-gray-500 rounded-lg">
              <FolderSync className="w-5 h-5" />
            </div>
          </div>

          {folderError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs font-semibold text-red-700 font-mono">
              Error: {folderError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left/Main Column: Active Google Drive Links */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center">
                    <Folder className="w-4.5 h-4.5 text-black mr-2" /> Linked Folders
                  </h4>
                  <span className="text-[10px] font-bold text-gray-400 font-mono">
                    {state.linkedFolders ? state.linkedFolders.length : 0} ADDED
                  </span>
                </div>

                {!state.linkedFolders || state.linkedFolders.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <FolderSync className="w-10 h-10 mx-auto mb-3 opacity-30 text-gray-400" />
                    <p className="text-xs font-semibold">No folders linked to your workspace</p>
                    <p className="text-[10px] text-gray-400 mt-1 max-w-xs mx-auto font-medium font-sans">
                      Add a folder link using the form on the right to start organizing clinical, financial, or workspace folders.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {state.linkedFolders.map((folder) => (
                      <div 
                        key={folder.id} 
                        className="flex items-center justify-between p-3.5 border border-gray-100 hover:border-gray-300 hover:shadow-3xs rounded-xl transition-all bg-white"
                      >
                        <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                          <div className="p-2.5 bg-emerald-50/50 border border-emerald-100 text-emerald-600 rounded-lg">
                            <FolderOpen className="w-4.5 h-4.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            {/* Make the folder name clickable to open the link */}
                            <a 
                              href={folder.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs font-extrabold text-gray-850 hover:text-black hover:underline flex items-center group cursor-pointer"
                              title="Click to open Google Drive folder"
                            >
                              <span className="truncate">{folder.name}</span>
                              <ExternalLink className="w-3 h-3 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 inline-block shrink-0" />
                            </a>
                            <p className="text-[9px] font-semibold text-gray-400 font-mono mt-0.5 uppercase tracking-wider truncate max-w-md">
                              {folder.link}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                          <a
                            href={folder.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-black hover:bg-neutral-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-3xs transition-all cursor-pointer font-mono flex items-center space-x-1"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => handleUnlinkFolderAction(folder.id, folder.name)}
                            className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 border border-transparent hover:border-red-100 rounded-lg transition-all cursor-pointer bg-transparent"
                            title="Remove Folder"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Add Folder Form */}
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center">
                  <Plus className="w-4.5 h-4.5 text-black mr-2" /> Add Folder
                </h4>

                <form onSubmit={handleAddFolderManual} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">
                      Folder Name
                    </label>
                    <input 
                      type="text" 
                      required
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="e.g. My Clinical Reports"
                      className="w-full bg-gray-50 border border-gray-250 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-2 text-xs outline-none transition-all font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">
                      Google Drive Link
                    </label>
                    <input 
                      type="text" 
                      required
                      value={newFolderLink}
                      onChange={(e) => setNewFolderLink(e.target.value)}
                      placeholder="e.g. https://drive.google.com/drive/folders/..."
                      className="w-full bg-gray-50 border border-gray-250 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-2 text-xs outline-none transition-all font-sans"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isAddingFolder}
                    className="w-full py-2 bg-black hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-widest rounded-lg shadow-xs transition-all cursor-pointer font-mono border-0"
                  >
                    {isAddingFolder ? "Adding..." : "Add Folder Link"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "Settings" && (
        /* CORE CONTROL SETTINGS PANEL */
        <div id="core-settings-panel" className="space-y-6 animate-fade-in">

          {/* User Account & Login Identity Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 mb-4 gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-black uppercase tracking-wider flex items-center">
                  <User className="w-4 h-4 mr-1.5 text-gray-700" /> Account & Profile Identity
                </h4>
                <p className="text-xs text-gray-400 font-medium mt-0.5">Customize your name, clinical title, avatar picture, and security</p>
              </div>
              
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowProfileEditor(!showProfileEditor)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                    showProfileEditor 
                      ? "bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300"
                      : "bg-black text-white hover:bg-gray-800"
                  }`}
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>{showProfileEditor ? "Collapse Editor" : "Change Name & Picture"}</span>
                </button>

                {onOpenLoginModal && (
                  <button
                    type="button"
                    onClick={onOpenLoginModal}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                    title="Open full authentication dialog"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Switch Account</span>
                  </button>
                )}

                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>

            {/* Current Active Account Summary Banner */}
            <div className="flex items-center justify-between bg-neutral-50/70 border border-gray-200/80 rounded-xl p-3.5 mb-5">
              <div className="flex items-center space-x-3.5">
                <div className="relative group">
                  <img
                    src={profileAvatar || userAccount?.avatar || AVATAR_PRESETS[0].url}
                    alt="User Avatar"
                    className="w-12 h-12 rounded-full border-2 border-white object-cover shadow-sm ring-2 ring-gray-200 shrink-0"
                  />
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-gray-950">{userAccount?.name || profileName || "Jubayer Alam"}</h3>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-mono">
                      Active
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-500">
                    {userAccount?.role || profileRole || "Clinical Operator"} • {userAccount?.email || "jubayera40@gmail.com"}
                  </p>
                </div>
              </div>

              {!showProfileEditor && (
                <button
                  type="button"
                  onClick={() => setShowProfileEditor(true)}
                  className="text-xs font-bold text-black hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <span>Edit Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Success & Error Feedback Banners */}
            {profileSuccessMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-2 text-xs font-semibold text-emerald-800 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileErrorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-xs font-semibold text-red-800 animate-fade-in">
                <X className="w-4 h-4 text-red-600 shrink-0" />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            {/* Inline Profile Editor Form */}
            {showProfileEditor && (
              <form onSubmit={handleSaveProfileChanges} className="space-y-5 pt-1 border-t border-gray-150 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name Input */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">
                      Full Display Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input 
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="e.g. Jubayer Alam"
                        className="w-full bg-gray-50 border border-gray-250 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg pl-9 pr-3 py-2 text-xs font-medium outline-none transition-all"
                      />
                      <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  {/* Role / Designation Input */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">
                      Clinical Role / Title
                    </label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={profileRole}
                        onChange={(e) => setProfileRole(e.target.value)}
                        placeholder="e.g. Clinical Operator, Medical Director"
                        className="w-full bg-gray-50 border border-gray-250 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg pl-9 pr-3 py-2 text-xs font-medium outline-none transition-all"
                      />
                      <Shield className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    </div>
                  </div>
                </div>

                {/* Profile Picture Customization Section */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 font-mono">
                      Profile Picture (Avatar)
                    </label>
                    <span className="text-[11px] text-gray-400">Choose a preset, upload a local photo, or paste a link</span>
                  </div>

                  {/* Picture Preview & Options Controls */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-gray-50/80 p-3.5 border border-gray-200 rounded-xl">
                    <div className="relative shrink-0">
                      <img 
                        src={profileAvatar} 
                        alt="Selected Avatar Preview"
                        className="w-16 h-16 rounded-full border-2 border-black object-cover shadow-sm bg-white ring-2 ring-gray-150"
                      />
                      <label 
                        className="absolute bottom-0 right-0 bg-black hover:bg-neutral-800 text-white p-1 rounded-full shadow-md cursor-pointer transition-transform hover:scale-110"
                        title="Upload photo from computer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Upload Button */}
                        <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:border-black text-gray-700 hover:text-black rounded-lg text-xs font-semibold cursor-pointer shadow-2xs transition-all">
                          <Upload className="w-3.5 h-3.5 text-gray-500" />
                          <span>Upload Photo from Device</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarFileUpload}
                            className="hidden"
                          />
                        </label>

                        {/* Custom URL Toggle */}
                        <button
                          type="button"
                          onClick={() => setShowCustomUrlInput(!showCustomUrlInput)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:border-black text-gray-700 hover:text-black rounded-lg text-xs font-semibold cursor-pointer shadow-2xs transition-all"
                        >
                          <LinkIcon className="w-3.5 h-3.5 text-gray-500" />
                          <span>Paste Image URL</span>
                        </button>
                      </div>

                      {/* Custom URL Input Box */}
                      {showCustomUrlInput && (
                        <div className="flex items-center space-x-2 pt-1">
                          <input 
                            type="url"
                            value={customAvatarUrl}
                            onChange={(e) => setCustomAvatarUrl(e.target.value)}
                            placeholder="https://example.com/my-photo.jpg"
                            className="flex-1 bg-white border border-gray-300 focus:border-black focus:ring-1 focus:ring-black rounded-lg px-3 py-1.5 text-xs outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCustomUrl}
                            className="px-3 py-1.5 bg-black text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 cursor-pointer shrink-0"
                          >
                            Apply Link
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preset Avatars Grid */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-2">
                      Or select from curated avatar presets:
                    </span>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                      {AVATAR_PRESETS.map((preset) => {
                        const isSelected = profileAvatar === preset.url;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setProfileAvatar(preset.url)}
                            className={`relative rounded-full aspect-square p-0.5 transition-all group cursor-pointer ${
                              isSelected
                                ? "ring-2 ring-black scale-105"
                                : "hover:ring-2 hover:ring-gray-300 opacity-80 hover:opacity-100"
                            }`}
                            title={preset.label}
                          >
                            <img
                              src={preset.url}
                              alt={preset.label}
                              className="w-full h-full rounded-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-black/35 rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-white drop-shadow-sm" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Optional Change Password Field */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 font-mono flex items-center space-x-1.5">
                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                      <span>Security & Password (Optional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPasswordField(!showPasswordField)}
                      className="text-[11px] font-bold text-gray-600 hover:text-black cursor-pointer"
                    >
                      {showPasswordField ? "Cancel Password Change" : "+ Change Password"}
                    </button>
                  </div>

                  {showPasswordField && (
                    <div className="relative mt-2">
                      <input
                        type="password"
                        value={profilePassword}
                        onChange={(e) => setProfilePassword(e.target.value)}
                        placeholder="Enter new password (at least 4 characters)..."
                        className="w-full bg-gray-50 border border-gray-250 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg pl-9 pr-3 py-2 text-xs font-medium outline-none transition-all"
                      />
                      <Key className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    </div>
                  )}
                </div>

                {/* Submit & Action Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-150">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileName(userAccount?.name || "Jubayer Alam");
                      setProfileRole(userAccount?.role || "Clinical Operator");
                      setProfileAvatar(userAccount?.avatar || AVATAR_PRESETS[0].url);
                      setProfilePassword("");
                      setShowPasswordField(false);
                      setShowProfileEditor(false);
                      setProfileErrorMsg(null);
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="flex items-center space-x-2 px-5 py-2 bg-black hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Profile Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
          
          {/* Neurology AI & Knowledge Base */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
            <h4 className="text-sm font-extrabold text-black uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center">
              <Key className="w-4 h-4 mr-1" /> Neurology AI & Knowledge Base
            </h4>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Google Gemini API Key</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <input 
                      type={showApiKey ? "text" : "password"}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Enter process.env.GEMINI_API_KEY..."
                      className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg pl-3 pr-10 py-2 text-sm outline-none font-mono transition-all"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button 
                    onClick={saveSettings}
                    className={`flex items-center space-x-1 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all shadow-xs cursor-pointer ${
                      apiSaveSuccess 
                        ? "bg-emerald-600 text-white" 
                        : "bg-black hover:bg-neutral-800 text-white"
                    }`}
                  >
                    {apiSaveSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Synced!</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Sync</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-xs font-bold text-gray-750">Long-Term Memory</p>
                  <p className="text-[10px] text-gray-400 font-medium">Retain context across all clinical workspaces.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={state.settings.longTermMemory}
                  onChange={(e) => onUpdateSettings({ longTermMemory: e.target.checked })}
                  className="h-4 w-4 rounded text-black border-gray-300 focus:ring-black cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-750">Knowledge Base Indexing</p>
                  <p className="text-[10px] text-gray-400 font-medium">Currently indexing {state.settings.totalIndexedFiles} active documents.</p>
                </div>
                <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                  ● Active
                </span>
              </div>
            </div>
          </div>

          {/* Business Profiles settings */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3.5 mb-4">
              <h4 className="text-sm font-extrabold text-black uppercase tracking-wider flex items-center">
                <Server className="w-4 h-4 mr-1" /> Business Profiles
              </h4>
              <button 
                onClick={() => setShowAddProfile(true)}
                className="flex items-center space-x-1 text-xs font-bold text-gray-900 hover:text-black font-mono uppercase"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Workspace</span>
              </button>
            </div>

            <div className="divide-y divide-gray-100 space-y-1">
              {state.businessProfiles.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      p.name.includes("Artbit") ? "bg-cyan-500" :
                      p.name.includes("Axen") ? "bg-indigo-500" :
                      p.name.includes("Biggan") ? "bg-orange-500" :
                      "bg-emerald-500"
                    }`}></div>
                    <span className="text-sm font-semibold text-gray-800">{p.name}</span>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingProfile(p);
                      setEditProfileName(p.name);
                      setEditProfileCurrency(p.currency);
                      setShowEditProfile(true);
                    }}
                    className="text-xs font-bold text-gray-400 hover:text-black font-mono uppercase"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Ledger configuration and Transaction Posting */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3.5 mb-4">
              <h4 className="text-sm font-extrabold text-black uppercase tracking-wider flex items-center">
                <Database className="w-4 h-4 mr-1" /> Financial Ledger
              </h4>
              <button 
                onClick={() => setShowAddLedger(true)}
                className="flex items-center space-x-1 text-xs font-bold text-gray-900 hover:text-black font-mono uppercase"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Transaction</span>
              </button>
            </div>            <div className="space-y-4">
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-xs font-bold text-gray-750">Base Currency</p>
                  <p className="text-[10px] text-gray-400 font-medium">Locked strictly to Bangladeshi Taka (BDT, ৳).</p>
                </div>
                <span className="text-[9px] font-extrabold text-black bg-gray-50 border border-gray-250 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                  BDT (৳)
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-xs font-bold text-gray-750">Auto-draft Follow-ups</p>
                  <p className="text-[10px] text-gray-400 font-medium">AI drafts emails automatically for pending invoices.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={state.settings.autoDraftFollowups}
                  onChange={(e) => onUpdateSettings({ autoDraftFollowups: e.target.checked })}
                  className="h-4 w-4 rounded text-black border-gray-300 focus:ring-black cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Team & Workspace */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs" id="team-management-panel">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h4 className="text-sm font-extrabold text-black uppercase tracking-wider flex items-center">
                <UserPlus className="w-4.5 h-4.5 mr-1.5" /> Team & Workspace
              </h4>
              <button 
                onClick={() => {
                  setEditingTeamMember(null);
                  setTeamName("");
                  setTeamPhone("");
                  setTeamEmail("");
                  setTeamLocation("");
                  setTeamRole("");
                  setShowAddTeamModal(true);
                }}
                className="flex items-center space-x-1 text-xs font-bold text-gray-900 hover:text-black font-mono uppercase"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Members List */}
              <div className="grid grid-cols-1 gap-3">
                {state.teamMembers && state.teamMembers.length > 0 ? (
                  state.teamMembers.map((member) => (
                    <div 
                      key={member.id} 
                      className="p-3.5 border border-gray-200 hover:border-gray-400 rounded-lg transition-colors bg-white shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="flex items-start space-x-3 min-w-0">
                        <div className="p-2 bg-gray-50 text-gray-600 rounded-lg border border-gray-200 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h5 className="text-sm font-semibold text-gray-900 truncate">{member.name}</h5>
                            <span className="bg-gray-100 text-gray-600 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded tracking-wide uppercase">
                              {member.role || "Operator"}
                            </span>
                          </div>
                          
                          {/* Rich Info Block: Phone, Email, Location */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-1 gap-x-4 text-[10px] text-gray-500 font-mono">
                            <span className="flex items-center min-w-0">
                              <Phone className="w-3 h-3 text-gray-400 mr-1 shrink-0" />
                              <span className="truncate">{member.phone || "No phone"}</span>
                            </span>
                            <span className="flex items-center min-w-0">
                              <Mail className="w-3 h-3 text-gray-400 mr-1 shrink-0" />
                              <span className="truncate">{member.email || "No email"}</span>
                            </span>
                            <span className="flex items-center min-w-0">
                              <MapPin className="w-3 h-3 text-gray-400 mr-1 shrink-0" />
                              <span className="truncate">{member.location || "No location"}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Member actions */}
                      <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                        <button 
                          onClick={() => {
                            setEditingTeamMember(member);
                            setTeamName(member.name);
                            setTeamPhone(member.phone);
                            setTeamEmail(member.email);
                            setTeamLocation(member.location);
                            setTeamRole(member.role);
                            setShowEditTeamModal(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-black rounded hover:bg-gray-50 transition-colors"
                          title="Edit member"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {onManageTeam && (
                          <button 
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove ${member.name}?`)) {
                                onManageTeam({ action: "delete", id: member.id });
                              }
                            }}
                            className="p-1.5 text-gray-300 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-gray-400 font-mono">
                    No active operators registered.
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-750">Default Task Layout View</p>
                  <p className="text-[10px] text-gray-400 font-medium">Preferred listing orientation style.</p>
                </div>
                <div className="flex items-center space-x-1.5 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                  <button 
                    onClick={() => onUpdateSettings({ defaultTaskView: "Board" })}
                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${
                      state.settings.defaultTaskView === "Board" 
                        ? "bg-white text-gray-800 border border-gray-200 shadow-3xs" 
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Board
                  </button>
                  <button 
                    onClick={() => onUpdateSettings({ defaultTaskView: "List" })}
                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${
                      state.settings.defaultTaskView === "List" 
                        ? "bg-white text-gray-800 border border-gray-200 shadow-3xs" 
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    List
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* System settings */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
            <h4 className="text-sm font-extrabold text-black uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center">
              <Settings className="w-4 h-4 mr-1" /> System Environment
            </h4>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Push Notifications</span>
                <input 
                  type="checkbox" 
                  checked={state.settings.notifications}
                  onChange={(e) => onUpdateSettings({ notifications: e.target.checked })}
                  className="h-4 w-4 rounded text-black border-gray-300 focus:ring-black cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-700">Dark Interface Emulation</span>
                <input 
                  type="checkbox" 
                  checked={state.settings.darkMode}
                  onChange={(e) => onUpdateSettings({ darkMode: e.target.checked })}
                  className="h-4 w-4 rounded text-black border-gray-300 focus:ring-black cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-700">Data Backup & Export (JSON)</span>
                <button 
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
                    const dlAnchorElem = document.createElement('a');
                    dlAnchorElem.setAttribute("href", dataStr);
                    dlAnchorElem.setAttribute("download", `clinical_hub_${userAccount?.id || "database"}_backup.json`);
                    dlAnchorElem.click();
                  }}
                  className="text-xs font-bold text-gray-800 hover:text-black font-mono flex items-center"
                >
                  Export Data <ChevronRight className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Dedicated Database Partition Architecture Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <h4 className="text-sm font-extrabold text-black uppercase tracking-wider flex items-center">
                <Database className="w-4 h-4 mr-1.5 text-emerald-600" /> Dedicated User Database
              </h4>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border border-emerald-200 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Isolated Partition</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                <p className="text-[10px] font-mono text-gray-400 uppercase font-bold">Database Identifier</p>
                <p className="font-mono font-bold text-gray-850 mt-0.5">{`db_${userAccount?.id || "usr-1"}`}</p>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                <p className="text-[10px] font-mono text-gray-400 uppercase font-bold">Storage File</p>
                <p className="font-mono font-bold text-gray-850 mt-0.5">{`databases/${userAccount?.id || "usr-1"}.json`}</p>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                <p className="text-[10px] font-mono text-gray-400 uppercase font-bold">Registered Account</p>
                <p className="font-mono font-bold text-gray-850 mt-0.5 truncate">{userAccount?.email || "jubayera40@gmail.com"}</p>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                <p className="text-[10px] font-mono text-gray-400 uppercase font-bold">Isolation Mode</p>
                <p className="font-mono font-bold text-emerald-700 mt-0.5">100% Tenant-Isolated</p>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 font-medium mt-3">
              Each registered account operates on its own dedicated database instance. Tasks, financial ledgers, team profiles, and assistant pins remain strictly isolated to your user credentials.
            </p>
          </div>
        </div>
      )}

      {/* Add Workspace Modal */}
      {showAddProfile && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl max-w-sm w-full p-6 animate-scale-up">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center">
              <Server className="w-4.5 h-4.5 text-black mr-2" /> Add Business Profile
            </h3>
            <form onSubmit={handleAddProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Profile Name *</label>
                <input 
                  type="text" 
                  required
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="e.g. Biggan PiC (YouTube)"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-2 text-sm outline-none transition-all"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddProfile(false)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold uppercase font-mono"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold uppercase font-mono shadow-xs"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Transaction Modal */}
      {showAddLedger && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-250 rounded-xl shadow-xl max-w-sm w-full p-6 animate-scale-up">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center">
              <Database className="w-4.5 h-4.5 text-black mr-2" /> Log Ledger Transaction
            </h3>
            <form onSubmit={handleAddLedgerSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Type</label>
                  <select 
                    value={ledgerType}
                    onChange={(e) => setLedgerType(e.target.value as any)}
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
                    value={ledgerAmount}
                    onChange={(e) => setLedgerAmount(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Workspace Origin</label>
                <select 
                  value={ledgerWorkspace}
                  onChange={(e) => setLedgerWorkspace(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs cursor-pointer outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white"
                >
                  <option value="Personal">Personal</option>
                  <option value="Artbit">Artbit</option>
                  <option value="Axen">Axen</option>
                  <option value="Biggan">Biggan</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Description *</label>
                <input 
                  type="text" 
                  required
                  value={ledgerDesc}
                  onChange={(e) => setLedgerDesc(e.target.value)}
                  placeholder="e.g. Bio-Sensor licensing or Retainer"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddLedger(false)}
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

      {/* Edit Workspace Modal */}
      {showEditProfile && editingProfile && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl max-w-sm w-full p-6 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center">
                <Server className="w-4.5 h-4.5 text-black mr-2" /> Edit Workspace Profile
              </h3>
              {onDeleteBusiness && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete the workspace "${editingProfile.name}"?`)) {
                      onDeleteBusiness(editingProfile.id);
                      setShowEditProfile(false);
                    }
                  }}
                  className="text-red-600 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-all"
                  title="Delete Workspace"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              )}
            </div>
            <form onSubmit={handleEditProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Profile Name *</label>
                <input 
                  type="text" 
                  required
                  value={editProfileName}
                  onChange={(e) => setEditProfileName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-2 text-sm outline-none transition-all"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowEditProfile(false);
                    setEditingProfile(null);
                  }}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold uppercase font-mono"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold uppercase font-mono shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Team Member Modal */}
      {showAddTeamModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-250 rounded-xl shadow-xl max-w-sm w-full p-6 animate-scale-up">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center">
              <UserPlus className="w-4.5 h-4.5 text-black mr-2" /> Add Team Member
            </h3>
            <form onSubmit={handleAddTeamSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Full Name *</label>
                <input 
                  type="text" 
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Tasnim Rahman"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Phone Number</label>
                <input 
                  type="text" 
                  value={teamPhone}
                  onChange={(e) => setTeamPhone(e.target.value)}
                  placeholder="e.g. +880 1700-000000"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  value={teamEmail}
                  onChange={(e) => setTeamEmail(e.target.value)}
                  placeholder="e.g. tasnim@artbit.co"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Location</label>
                <input 
                  type="text" 
                  value={teamLocation}
                  onChange={(e) => setTeamLocation(e.target.value)}
                  placeholder="e.g. Dhaka, Bangladesh"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Role / Work Description</label>
                <input 
                  type="text" 
                  value={teamRole}
                  onChange={(e) => setTeamRole(e.target.value)}
                  placeholder="e.g. UI Designer or Operator"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddTeamModal(false)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold uppercase font-mono"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold uppercase font-mono shadow-xs"
                >
                  Add Operator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Member Modal */}
      {showEditTeamModal && editingTeamMember && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-250 rounded-xl shadow-xl max-w-sm w-full p-6 animate-scale-up">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center">
              <UserPlus className="w-4.5 h-4.5 text-black mr-2" /> Edit Team Member
            </h3>
            <form onSubmit={handleEditTeamSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Full Name *</label>
                <input 
                  type="text" 
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Phone Number</label>
                <input 
                  type="text" 
                  value={teamPhone}
                  onChange={(e) => setTeamPhone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  value={teamEmail}
                  onChange={(e) => setTeamEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Location</label>
                <input 
                  type="text" 
                  value={teamLocation}
                  onChange={(e) => setTeamLocation(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Role / Work Description</label>
                <input 
                  type="text" 
                  value={teamRole}
                  onChange={(e) => setTeamRole(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowEditTeamModal(false);
                    setEditingTeamMember(null);
                  }}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold uppercase font-mono"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold uppercase font-mono shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
