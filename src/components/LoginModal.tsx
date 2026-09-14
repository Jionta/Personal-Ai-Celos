import React, { useState, useEffect } from "react";
import { User, Check, Upload, Link as LinkIcon, ShieldCheck, ArrowRight, X, Key, Mail, Lock, Eye, EyeOff, Loader2, Laptop, Database } from "lucide-react";
import { UserAccount } from "../types";
import { compressImageFile } from "../lib/imageCompressor";

interface LoginModalProps {
  isOpen: boolean;
  currentUser: UserAccount | null;
  deviceId: string;
  onLoginSuccess: (user: UserAccount, token: string) => void;
  onClose?: () => void;
  canDismiss?: boolean;
}

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
  }
];

export default function LoginModal({ isOpen, currentUser, deviceId, onLoginSuccess, onClose, canDismiss = false }: LoginModalProps) {
  const [authMode, setAuthMode] = useState<"signin" | "signup">(currentUser?.isLoggedIn ? "signin" : "signin");
  const [email, setEmail] = useState(currentUser?.email || "jubayera40@gmail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState(currentUser?.name || "Jubayer Alam");
  const [role, setRole] = useState(currentUser?.role || "Clinical Operator");
  const [selectedAvatar, setSelectedAvatar] = useState(
    currentUser?.avatar || AVATAR_PRESETS[0].url
  );
  
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [showCustomUrlInput, setShowCustomUrlInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (currentUser?.isLoggedIn) {
      setName(currentUser.name);
      setEmail(currentUser.email || "jubayera40@gmail.com");
      setSelectedAvatar(currentUser.avatar);
      setRole(currentUser.role || "Clinical Operator");
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setError("");
      try {
        const compressed = await compressImageFile(file, 360, 360, 0.85);
        setSelectedAvatar(compressed);
      } catch (err) {
        console.error("Avatar compression error:", err);
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            setSelectedAvatar(reader.result);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrlInput.trim()) {
      setSelectedAvatar(customUrlInput.trim());
      setShowCustomUrlInput(false);
      setCustomUrlInput("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (authMode === "signin") {
        if (!email.trim() || !password.trim()) {
          setError("Please enter both email address and password");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            password: password.trim(),
            deviceId,
            deviceName: window.navigator.userAgent.includes("Mac") ? "Mac Device" : "Workstation"
          })
        });

        const data = await res.json();
        if (!data.success) {
          setError(data.error || "Login failed. Please check your credentials.");
          setLoading(false);
          return;
        }

        onLoginSuccess(data.user, data.token);
      } else {
        // Sign Up Mode
        if (!name.trim()) {
          setError("Full name is required.");
          setLoading(false);
          return;
        }
        if (!email.trim()) {
          setError("Email address is required.");
          setLoading(false);
          return;
        }
        if (!password.trim() || password.trim().length < 4) {
          setError("Password must be at least 4 characters long.");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password: password.trim(),
            role: role.trim() || "Clinical Operator",
            avatar: selectedAvatar,
            deviceId,
            deviceName: window.navigator.userAgent.includes("Mac") ? "Mac Device" : "Workstation"
          })
        });

        const data = await res.json();
        if (!data.success) {
          setError(data.error || "Registration failed. Please check input details.");
          setLoading(false);
          return;
        }

        onLoginSuccess(data.user, data.token);
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("Network or server error during authentication. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col relative">
        
        {/* Top Accent / Banner */}
        <div className="bg-gradient-to-r from-gray-900 via-black to-gray-800 text-white px-6 py-5 relative">
          {canDismiss && onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white rounded-lg bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center space-x-3 mb-1.5">
            <div className="p-2 bg-white/10 rounded-xl border border-white/20 backdrop-blur-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 font-mono">
                  Device Authentication
                </span>
                <span className="inline-flex items-center space-x-1 text-[9px] font-mono text-gray-300 bg-white/10 px-1.5 py-0.5 rounded">
                  <Laptop className="w-2.5 h-2.5" />
                  <span>{deviceId ? deviceId.substring(0, 10) + "..." : "New Device"}</span>
                </span>
              </div>
              <h2 className="text-xl font-semibold text-white tracking-tight">
                {authMode === "signin" ? "Device Login Required" : "Create Account & Authorize Device"}
              </h2>
            </div>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed pl-11">
            Every new device requires email and password authentication to access the Celouse OS workspace.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50/80 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => { setAuthMode("signin"); setError(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center ${
              authMode === "signin"
                ? "bg-white text-black shadow-2xs font-bold border border-gray-200"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Sign In with Password
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode("signup"); setError(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center ${
              authMode === "signup"
                ? "bg-white text-black shadow-2xs font-bold border border-gray-200"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Register New Account
          </button>
        </div>

        {/* Main Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[68vh]">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium animate-fade-in flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Profile Picture Selection Section (shown in signup or when updating) */}
          {authMode === "signup" && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono mb-2.5">
                Choose Profile Picture Avatar & Role
              </label>

              {/* Active Avatar Preview */}
              <div className="flex items-center space-x-4 bg-gray-50 border border-gray-200 p-3 rounded-xl mb-3">
                <div className="relative shrink-0">
                  <img
                    src={selectedAvatar}
                    alt="Selected avatar"
                    className="w-14 h-14 rounded-full border-2 border-white shadow-md object-cover bg-gray-200"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border border-white">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">Selected Avatar</p>
                  <p className="text-[10px] text-gray-400">Pick preset or upload custom picture</p>
                  
                  <div className="flex items-center space-x-2 mt-2">
                    <label className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white border border-gray-200 hover:border-black rounded-lg text-[10px] font-semibold text-gray-700 hover:text-black cursor-pointer shadow-3xs transition-all">
                      <Upload className="w-3 h-3 text-gray-500" />
                      <span>Upload Local</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowCustomUrlInput(!showCustomUrlInput)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white border border-gray-200 hover:border-black rounded-lg text-[10px] font-semibold text-gray-700 hover:text-black cursor-pointer shadow-3xs transition-all"
                    >
                      <LinkIcon className="w-3 h-3 text-gray-500" />
                      <span>Paste URL</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom URL Input Accordion */}
              {showCustomUrlInput && (
                <div className="mb-3 p-2.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2 animate-fade-in">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500 font-mono">Image Link</p>
                  <div className="flex space-x-2">
                    <input
                      type="url"
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      placeholder="https://images.unsplash.com/your-avatar.jpg"
                      className="flex-1 bg-white border border-gray-200 focus:border-black rounded-lg px-2.5 py-1 text-xs text-gray-900 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCustomUrlSubmit}
                      className="bg-black text-white text-xs font-semibold px-3 py-1 rounded-lg hover:bg-gray-800 transition-all cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}

              {/* Preset Avatars Grid */}
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_PRESETS.map((preset) => {
                  const isSelected = selectedAvatar === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedAvatar(preset.url)}
                      title={preset.label}
                      className={`relative p-0.5 rounded-xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? "border-black bg-gray-100 shadow-sm scale-105"
                          : "border-transparent hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-10 rounded-lg object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* User Name (only for Sign Up) */}
          {authMode === "signup" && (
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jubayer Alam"
                  className="w-full bg-white border border-gray-200 focus:border-black focus:ring-1 focus:ring-black rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-gray-900 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Email Address Field */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jubayera40@gmail.com"
                className="w-full bg-white border border-gray-200 focus:border-black focus:ring-1 focus:ring-black rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-gray-900 outline-none transition-all"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-800">
                Account Password <span className="text-red-500">*</span>
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-gray-200 focus:border-black focus:ring-1 focus:ring-black rounded-xl pl-10 pr-10 py-2.5 text-xs text-gray-900 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-black p-0.5 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Role (optional for Sign Up) */}
          {authMode === "signup" && (
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1">
                Title / Role
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Clinical Operator"
                className="w-full bg-white border border-gray-200 focus:border-black focus:ring-1 focus:ring-black rounded-xl px-3.5 py-2 text-xs text-gray-900 outline-none transition-all"
              />
            </div>
          )}

          {authMode === "signup" && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-900 flex items-start space-x-2.5">
              <Database className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Isolated Dedicated Database</p>
                <p className="text-[10px] text-emerald-700 mt-0.5">A fresh, isolated database file will be provisioned automatically for this account upon registration.</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black hover:bg-gray-800 text-white font-semibold text-xs py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating Device...</span>
                </>
              ) : (
                <>
                  <span>{authMode === "signin" ? "Authenticate & Sign In" : "Register & Authorize Device"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
