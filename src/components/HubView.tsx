import React from "react";
import { Mic, MicOff, ArrowRight, CheckCircle, Clock, Moon, Sun, Sunrise, Compass, UserCheck, TrendingUp, Sparkles, X, Volume2, Square, MessageSquare, Loader2, StickyNote, Trash2, Copy } from "lucide-react";
import { AppState, Task, LedgerEntry, Prayer } from "../types";

interface HubViewProps {
  state: AppState;
  onNavigateToTab: (tab: string) => void;
  onToggleTask: (task: Task) => void;
  onTogglePrayer: (prayerId: string, completed: boolean) => void;
  onUpdateQuickNotes: (quickNotes: string) => void;
}

export default function HubView({ state, onNavigateToTab, onToggleTask, onTogglePrayer, onUpdateQuickNotes }: HubViewProps) {
  const [quote, setQuote] = React.useState<{ quote: string; author: string } | null>(null);
  const [loadingQuote, setLoadingQuote] = React.useState(true);

  const [localNotes, setLocalNotes] = React.useState(state.quickNotes || "");
  const [isSaving, setIsSaving] = React.useState(false);

  // Sync with state prop if changed elsewhere
  React.useEffect(() => {
    if (state.quickNotes !== undefined && state.quickNotes !== localNotes) {
      setLocalNotes(state.quickNotes);
    }
  }, [state.quickNotes]);

  // Debounced save to API
  React.useEffect(() => {
    if (localNotes === (state.quickNotes || "")) return;

    setIsSaving(true);
    const timer = setTimeout(() => {
      onUpdateQuickNotes(localNotes);
      setIsSaving(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [localNotes, onUpdateQuickNotes]);

  // Voice Assistant states
  const [showVoice, setShowVoice] = React.useState(false);
  const [voiceState, setVoiceState] = React.useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [voiceText, setVoiceText] = React.useState("Tap the microphone or type below...");
  const [aiTextResponse, setAiTextResponse] = React.useState("");
  const [waveHeights, setWaveHeights] = React.useState<number[]>([10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
  const [manualInput, setManualInput] = React.useState("");

  const recognitionRef = React.useRef<any>(null);
  const hasErrorRef = React.useRef(false);
  const transcriptionRef = React.useRef("");

  // Animate sound waves during speech
  React.useEffect(() => {
    let interval: any;
    if (voiceState === "speaking" || voiceState === "listening") {
      interval = setInterval(() => {
        setWaveHeights(Array.from({ length: 16 }, () => Math.floor(Math.random() * 45) + 8));
      }, 90);
    } else {
      setWaveHeights(Array.from({ length: 16 }, () => 10));
    }
    return () => clearInterval(interval);
  }, [voiceState]);

  // Voice recognition lifecycle setup
  React.useEffect(() => {
    if (showVoice && typeof window !== "undefined") {
      hasErrorRef.current = false;
      transcriptionRef.current = "";

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recog = new SpeechRecognition();
          recog.continuous = false;
          recog.interimResults = true;
          recog.lang = "en-US";

          recog.onstart = () => {
            hasErrorRef.current = false;
            setVoiceState("listening");
            setVoiceText("Listening...");
          };

          recog.onresult = (event: any) => {
            let interimTranscript = "";
            let finalTranscript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
              } else {
                interimTranscript += event.results[i][0].transcript;
              }
            }
            const currentText = finalTranscript || interimTranscript;
            if (currentText) {
              transcriptionRef.current = currentText;
              setVoiceText(currentText);
            }
          };

          recog.onerror = (event: any) => {
            console.warn("Speech recognition error event:", event.error);
            hasErrorRef.current = true;
            if (event.error === "no-speech") {
              setVoiceText("No speech detected. Tap the microphone or type below.");
            } else if (event.error === "not-allowed" || event.error === "permission-denied" || event.error === "service-not-allowed") {
              setVoiceText("Microphone permission was denied or restricted. Type your message below.");
            } else if (event.error === "audio-capture") {
              setVoiceText("No microphone hardware detected. Type your message below.");
            } else if (event.error === "network") {
              setVoiceText("Network connection error. Tap to try again or type below.");
            } else if (event.error === "aborted") {
              // Ignore aborted
            } else {
              setVoiceText(`Speech recognition error (${event.error || "unknown"}). Type your message below.`);
            }
            setVoiceState("idle");
          };

          recog.onend = () => {
            if (!hasErrorRef.current && transcriptionRef.current && transcriptionRef.current.trim().length > 0) {
              setVoiceState("processing");
            } else {
              setVoiceState("idle");
            }
          };

          recognitionRef.current = recog;
          
          // Start recording after a small transition delay
          const timer = setTimeout(() => {
            try {
              recog.start();
            } catch (e) {
              console.warn("Error auto-starting speech recognition:", e);
              hasErrorRef.current = true;
              setVoiceText("Tap the microphone or type your query below...");
              setVoiceState("idle");
            }
          }, 300);

          return () => clearTimeout(timer);
        } catch (err) {
          console.warn("Speech recognition initialization failed:", err);
          setVoiceText("Speech recognition is unavailable in this environment. You can type below.");
        }
      } else {
        setVoiceText("Speech recognition is not supported in this browser. You can type below.");
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
    };
  }, [showVoice]);

  // Handle server proxy communication
  React.useEffect(() => {
    if (voiceState === "processing") {
      const textToSend = voiceText;
      if (!textToSend || textToSend === "Listening..." || textToSend === "Tap the microphone to start talking..." || textToSend.startsWith("No speech detected") || textToSend.startsWith("Microphone permission") || textToSend.startsWith("Speech recognition error") || textToSend.startsWith("Error")) {
        setVoiceState("idle");
        setVoiceText("Tap the microphone or type below...");
        return;
      }

      const token = localStorage.getItem("celouse_session_token");
      fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ message: textToSend, activePins: ["Artbit Studio Core"] })
      })
      .then(res => res.json())
      .then(data => {
        const messages = data.messages || [];
        const lastAssistantMsg = messages.filter((m: any) => m.sender === "assistant").pop();
        if (lastAssistantMsg) {
          // Format text cleanly for natural browser speaking
          let cleanText = lastAssistantMsg.text.replace(/```json[\s\S]*?```/g, "").trim();
          cleanText = cleanText.replace(/[\*\#\_\-]/g, "").trim();
          
          setAiTextResponse(lastAssistantMsg.text);
          setVoiceText(cleanText);
          speakText(cleanText);
        } else {
          setVoiceState("idle");
          setVoiceText("I encountered an issue processing your request.");
        }
      })
      .catch(err => {
        console.error("Error in voice assistant chat:", err);
        setVoiceState("idle");
        setVoiceText("Network connection failed.");
      });
    }
  }, [voiceState]);

  const speakText = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
          setVoiceState("speaking");
        };
        utterance.onend = () => {
          setVoiceState("idle");
        };
        utterance.onerror = (e) => {
          console.warn("Speech synthesis error", e);
          setVoiceState("idle");
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("Speech synthesis error:", err);
        setVoiceState("idle");
      }
    } else {
      setVoiceState("idle");
    }
  };

  const handleStartListening = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    hasErrorRef.current = false;
    transcriptionRef.current = "";
    setVoiceText("Listening...");
    setVoiceState("listening");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Error starting speech recognition:", e);
        setVoiceText("Microphone or speech recognition unavailable. Type below.");
        setVoiceState("idle");
      }
    } else {
      setVoiceText("Speech recognition unavailable in this browser. Type your message below.");
      setVoiceState("idle");
    }
  };

  const handleStopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    setVoiceState("idle");
    setVoiceText("Tap the microphone or type below...");
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const text = manualInput.trim();
    setManualInput("");
    setVoiceText(text);
    transcriptionRef.current = text;
    hasErrorRef.current = false;
    setVoiceState("processing");
  };

  React.useEffect(() => {
    fetch("/api/quote")
      .then(res => res.json())
      .then(data => {
        setQuote(data);
        setLoadingQuote(false);
      })
      .catch(err => {
        console.error("Error fetching quote:", err);
        setLoadingQuote(false);
      });
  }, []);

  // Filters
  const urgentTasks = state.tasks.filter(t => t.urgent && !t.completed).slice(0, 3);
  const todayDateStr = new Date().toISOString().split("T")[0];
  const todayTasks = state.tasks.filter(t => !t.dueDate || t.dueDate === todayDateStr);
  const totalTodayTasks = todayTasks.length;
  const completedTodayTasks = todayTasks.filter(t => t.completed).length;
  const taskProgressPct = totalTodayTasks > 0 ? Math.round((completedTodayTasks / totalTodayTasks) * 100) : 0;
  const ledgerTotal = state.ledger.reduce((acc, cur) => acc + (cur.type === "income" ? cur.amount : -cur.amount), 0);
  const totalIncome = state.ledger.filter(l => l.type === "income").reduce((acc, cur) => acc + cur.amount, 0);
  const totalExpenses = state.ledger.filter(l => l.type === "expense").reduce((acc, cur) => acc + cur.amount, 0);

  // Prayer active status helper
  const getPrayerIcon = (name: string) => {
    switch (name) {
      case "Fajr": return <Sunrise className="w-4.5 h-4.5" />;
      case "Dhuhr": return <Sun className="w-4.5 h-4.5" />;
      case "Asr": return <Compass className="w-4.5 h-4.5" />;
      case "Maghrib": return <Moon className="w-4.5 h-4.5" />;
      default: return <Clock className="w-4.5 h-4.5" />;
    }
  };

  // SVG bar chart parameters
  // Max expense/income among recent items or static heights based on ledger.
  // Let's draw five responsive SVG bars.
  const chartBars = [
    { label: "Artbit", val: 5200, color: "var(--color-workspace-artbit)" },
    { label: "Axen", val: 10200, color: "var(--color-workspace-axen)" },
    { label: "Biggan", val: 3500, color: "var(--color-workspace-biggan)" },
    { label: "Personal", val: 2250, color: "var(--color-workspace-personal)" },
    { label: "Internal", val: 1500, color: "rgb(156, 163, 175)" }
  ];
  const maxVal = Math.max(...chartBars.map(b => b.val));

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full pb-10">
      {/* Daily Gemini Inspiration Banner */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5 transition-all">
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">
            <Sparkles className="w-3.5 h-3.5 text-black animate-pulse" />
            <span>Daily Gemini Pulse</span>
          </div>
          {loadingQuote ? (
            <div className="space-y-2 py-1">
              <div className="h-4 bg-gray-100 rounded w-4/5 animate-pulse"></div>
              <div className="h-3 bg-gray-100 rounded w-1/4 animate-pulse"></div>
            </div>
          ) : (
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-800 leading-relaxed italic">
                "{quote?.quote || "Precision, discipline, and vision are the keystones of continuous transformation."}"
              </p>
              <p className="text-[10px] text-gray-500 font-bold font-mono uppercase mt-1">
                — {quote?.author || "Gemini Core"}
              </p>
            </div>
          )}
        </div>

        {/* Improved Gemini CTA Button */}
        <button
          onClick={() => setShowVoice(true)}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 sm:px-5 py-3 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs uppercase tracking-wider shrink-0 cursor-pointer group active:scale-95 min-h-[44px]"
        >
          <Mic className="w-4 h-4 text-white group-hover:scale-110 transition-transform animate-bounce" />
          <span>Ask Gemini Voice</span>
          <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Today's Tasks */}
        <div id="today-tasks-card" className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-950">Today's Tasks</h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">Dual-line records of high-density tasks</p>
            </div>
            <span className="bg-red-50 text-red-700 text-[10px] font-bold uppercase px-2 py-1 rounded border border-red-100 tracking-wider">
              {state.tasks.filter(t => t.urgent && !t.completed).length} Urgent
            </span>
          </div>          <div className="space-y-3.5 flex-1">
            {urgentTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <CheckCircle className="w-8 h-8 text-gray-200 mb-1" />
                <span className="text-xs font-mono">No pending urgent tasks</span>
              </div>
            ) : (
              urgentTasks.map(task => (
                <div 
                  key={task.id} 
                  className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors group cursor-pointer"
                  onClick={() => onToggleTask(task)}
                >
                  <input 
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => {}}
                    className="mt-1 h-4 w-4 rounded text-black border-gray-300 focus:ring-black cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 group-hover:text-black transition-colors">{task.title}</p>
                    <div className="flex items-center space-x-2 mt-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        task.workspace === "Artbit" ? "bg-cyan-50 border-cyan-100 text-cyan-700" :
                        task.workspace === "Axen" ? "bg-indigo-50 border-indigo-100 text-indigo-700" :
                        task.workspace === "Biggan" ? "bg-orange-50 border-orange-100 text-orange-700" :
                        "bg-gray-100 border-gray-200 text-gray-600"
                      }`}>
                        {task.workspace}
                      </span>
                      {task.time && (
                        <span className="text-[10px] text-gray-400 font-mono font-medium flex items-center">
                          <Clock className="w-3 h-3 mr-0.5" /> {task.time}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Daily Task Progress Circle Widget */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/70 p-4 rounded-xl border border-gray-150 animate-fade-in">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 font-mono block">Today's Task Velocity</span>
              <p className="text-sm font-bold text-gray-900 font-mono">
                {completedTodayTasks} / {totalTodayTasks} Tasks Completed
              </p>
              <p className="text-[11px] text-gray-500 font-medium">
                {taskProgressPct === 100 ? "All clear! Brilliant work." : 
                 taskProgressPct >= 75 ? "Almost there! Keep pushing." :
                 taskProgressPct >= 50 ? "Halfway through! Steady pace." :
                 taskProgressPct > 0 ? "Underway! Step by step." :
                 totalTodayTasks === 0 ? "No active tasks today." : "Ready to tackle the day."}
              </p>
            </div>
            <div className="relative flex items-center justify-center shrink-0">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="24"
                  className="stroke-gray-150"
                  strokeWidth="5"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="24"
                  className="stroke-black transition-all duration-500 ease-out"
                  strokeWidth="5"
                  strokeDasharray={2 * Math.PI * 24}
                  strokeDashoffset={2 * Math.PI * 24 - (taskProgressPct / 100) * (2 * Math.PI * 24)}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xs font-extrabold font-mono text-gray-950">{taskProgressPct}%</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => onNavigateToTab("Tasks")}
            className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-center space-x-1 text-xs text-gray-900 hover:text-black font-semibold tracking-wide transition-all uppercase"
          >
            <span>Manage All Tasks</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Spiritual Pulse */}
        <div id="spiritual-pulse-card" className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-950">Spiritual Pulse</h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">Muslim prayer log & status sync</p>
            </div>
            <span className="bg-gray-100 text-gray-800 text-[10px] font-bold uppercase px-2.5 py-1 rounded border border-gray-200 tracking-wider font-mono">
              {state.prayers.filter(p => p.completed).length}/5 Complete
            </span>
          </div>

          <div className="flex items-center justify-between py-4 sm:py-6 px-0.5 sm:px-1 overflow-x-auto scrollbar-none gap-1 sm:gap-2">
            {state.prayers.map((prayer) => {
              const isCompleted = prayer.completed;
              const isActive = prayer.status === "active";
              return (
                <div 
                  key={prayer.id} 
                  className="flex flex-col items-center space-y-1.5 sm:space-y-2 group cursor-pointer shrink-0 min-w-[52px]"
                  onClick={() => onTogglePrayer(prayer.id, !prayer.completed)}
                >
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border transition-all ${
                    isCompleted 
                      ? "bg-black border-black text-white shadow-sm" 
                      : isActive 
                        ? "bg-gray-100 border-gray-400 text-gray-900 ring-2 ring-gray-200/50 ring-offset-1 animate-pulse" 
                        : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 hover:border-gray-300"
                  }`}>
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : getPrayerIcon(prayer.name)}
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-wider">{prayer.name}</span>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] sm:text-[11px] text-gray-400 font-mono text-center mt-auto py-1">
            Current Active Window: <span className="font-bold text-black">Asr (03:45 PM)</span>
          </p>
        </div>

      </div>

      {/* Quick Notes Card */}
      <div id="quick-notes-card" className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-gray-50 rounded-lg border border-gray-200 text-gray-700">
              <StickyNote className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-950">Quick Notes</h3>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium mt-0.5">Jot down thoughts, ideas, or clip lists instantly</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono">
            {isSaving ? (
              <span className="text-[10px] font-bold text-amber-600 animate-pulse bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Saving...</span>
            ) : (
              <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-150">Synced</span>
            )}
          </div>
        </div>

        <div className="relative">
          <textarea
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            placeholder="Type your scratchpad ideas or temporary thoughts here... They will automatically save and persist."
            className="w-full min-h-[140px] bg-gray-50/50 hover:bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-xl p-3 sm:p-3.5 text-xs text-gray-800 outline-none transition-all resize-y font-sans leading-relaxed"
          />
          
          <div className="absolute bottom-3.5 right-3.5 flex items-center space-x-1.5">
            <button
              onClick={() => {
                navigator.clipboard.writeText(localNotes);
              }}
              title="Copy to Clipboard"
              className="p-2 bg-white border border-gray-200 hover:border-black text-gray-500 hover:text-black rounded-lg shadow-2xs transition-all cursor-pointer active:scale-95 animate-fade-in min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to clear your quick notes?")) {
                  setLocalNotes("");
                }
              }}
              title="Clear Notes"
              className="p-2 bg-white border border-gray-200 hover:border-red-500 text-gray-500 hover:text-red-500 rounded-lg shadow-2xs transition-all cursor-pointer active:scale-95 animate-fade-in min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Ledger Card */}
      <div id="monthly-ledger-card" className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 sm:mb-5">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-950">Monthly Ledger</h3>
            <p className="text-[11px] sm:text-xs text-gray-400 font-medium mt-0.5">Financial statistics & budget performance</p>
          </div>
          <span className="text-[10px] font-extrabold text-gray-400 tracking-wider uppercase font-mono bg-gray-50 px-2 py-1 rounded border border-gray-100">OCTOBER 2023</span>
        </div>

        {/* Ledger Indicators Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 font-mono block">Net Profit</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-gray-900 block mt-1.5">৳{ledgerTotal.toLocaleString()}</span>
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest block mt-1">BDT</span>
          </div>
          <div className="p-3 bg-emerald-50/20 rounded-lg border border-emerald-100 text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 font-mono block">Revenue</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-emerald-600 block mt-1.5">৳{totalIncome.toLocaleString()}</span>
            <span className="text-[9px] font-bold text-emerald-600/80 uppercase tracking-widest block mt-1">BDT</span>
          </div>
          <div className="p-3 bg-red-50/20 rounded-lg border border-red-100 text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-700 font-mono block">Expenses</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-red-600 block mt-1.5">৳{totalExpenses.toLocaleString()}</span>
            <span className="text-[9px] font-bold text-red-600/80 uppercase tracking-widest block mt-1">BDT</span>
          </div>
        </div>

        {/* Custom SVG Bar Chart */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
            <TrendingUp className="w-4 h-4 text-black mr-1" /> Budget Allocation by Workspace
          </h4>
          <div className="h-28 flex items-end justify-between px-2 sm:px-4 pt-4 border-b border-gray-200">
            {chartBars.map((bar) => {
              const heightPct = maxVal > 0 ? (bar.val / maxVal) * 90 : 20;
              return (
                <div key={bar.label} className="flex flex-col items-center flex-1 group">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] font-mono rounded px-1.5 py-0.5 mb-1 absolute transform -translate-y-8 pointer-events-none">
                    ৳{bar.val}
                  </div>
                  <div 
                    className="w-6 sm:w-8 rounded-t-sm transition-all duration-500 hover:brightness-95 shadow-xs"
                    style={{ 
                      height: `${heightPct}%`, 
                      backgroundColor: bar.color 
                    }}
                  ></div>
                </div>
              );
            })}
          </div>
          {/* Labels Row */}
          <div className="flex justify-between px-1 sm:px-4 mt-2">
            {chartBars.map((bar) => (
              <div key={bar.label} className="flex-1 text-center">
                <span className="text-[8px] sm:text-[9px] font-bold text-gray-500 uppercase tracking-wider block truncate">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Voice Assistant Overlay */}
      {showVoice && (
        <div className="fixed inset-0 bg-neutral-950/95 backdrop-blur-md flex flex-col items-center justify-between p-6 z-50 text-white animate-fade-in">
          {/* Top Info Bar */}
          <div className="w-full max-w-lg flex items-center justify-between mt-4">
            <div className="flex items-center space-x-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="text-[10px] font-bold tracking-widest text-neutral-400 font-mono uppercase">
                {voiceState === "listening" ? "Listening..." : voiceState === "processing" ? "Thinking..." : voiceState === "speaking" ? "Speaking..." : "Voice Pulse Connected"}
              </span>
            </div>
            <button 
              onClick={() => {
                if (recognitionRef.current) {
                  try { recognitionRef.current.abort(); } catch (e) {}
                }
                if (typeof window !== "undefined") {
                  window.speechSynthesis.cancel();
                }
                setShowVoice(false);
                setVoiceState("idle");
              }}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Center Sound Waves Visualizer & Mic status */}
          <div className="flex-1 flex flex-col items-center justify-center space-y-10 w-full max-w-lg">
            
            {/* Pulsating Orbit ring */}
            <div className="relative flex items-center justify-center">
              <div className={`absolute w-36 h-36 rounded-full bg-cyan-500/10 blur-xl transition-all duration-700 ${
                voiceState === "listening" ? "scale-125 opacity-70 animate-pulse" :
                voiceState === "processing" ? "scale-110 opacity-50 rotate-180 duration-1000" :
                voiceState === "speaking" ? "scale-135 opacity-90 animate-pulse" : "scale-100 opacity-20"
              }`} />
              
              <div className={`w-28 h-28 rounded-full flex items-center justify-center bg-neutral-900 border transition-all duration-300 ${
                voiceState === "listening" ? "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]" :
                voiceState === "processing" ? "border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]" :
                voiceState === "speaking" ? "border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)]" : "border-neutral-800"
              }`}>
                {voiceState === "listening" ? (
                  <Mic className="w-10 h-10 text-red-500 animate-pulse" />
                ) : voiceState === "processing" ? (
                  <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
                ) : voiceState === "speaking" ? (
                  <Volume2 className="w-10 h-10 text-cyan-400 animate-bounce" />
                ) : (
                  <MicOff className="w-10 h-10 text-neutral-500" />
                )}
              </div>
            </div>

            {/* Simulated Dynamic Soundwave Visualizer */}
            <div className="h-16 flex items-center justify-center space-x-1 w-full px-4">
              {waveHeights.map((h, i) => (
                <div 
                  key={i} 
                  className={`w-1 rounded-full transition-all duration-75 ${
                    voiceState === "listening" ? "bg-red-500" :
                    voiceState === "processing" ? "bg-yellow-500/60" :
                    voiceState === "speaking" ? "bg-cyan-400 animate-pulse" : "bg-neutral-800"
                  }`}
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>

            {/* Spoken Text transcription console */}
            <div className="w-full text-center px-4">
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 min-h-28 flex flex-col justify-center shadow-inner">
                <p className="text-xs font-mono text-neutral-500 uppercase tracking-wider mb-2">Transcript</p>
                <p className="text-sm font-medium leading-relaxed text-neutral-200 select-all font-mono whitespace-pre-line break-words max-h-36 overflow-y-auto">
                  {voiceText}
                </p>
              </div>

              {/* Text Input Fallback */}
              <form onSubmit={handleManualSubmit} className="w-full mt-3 flex items-center space-x-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Or type a query to the voice assistant..."
                  className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-neutral-700 rounded-full px-4 py-2 text-xs text-white placeholder-neutral-500 outline-none transition-all font-sans"
                />
                <button
                  type="submit"
                  disabled={!manualInput.trim() || voiceState === "processing"}
                  className="bg-white text-black font-semibold text-xs px-4 py-2 rounded-full hover:bg-neutral-200 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  Send
                </button>
              </form>
            </div>

          </div>

          {/* Bottom Action controllers */}
          <div className="w-full max-w-lg flex flex-col items-center space-y-4 mb-4">
            <div className="flex items-center space-x-4">
              {voiceState === "speaking" ? (
                <button 
                  onClick={handleStopSpeaking}
                  className="flex items-center space-x-2 bg-neutral-800 hover:bg-neutral-700 text-white font-mono uppercase text-xs font-bold px-5 py-3 rounded-full border border-neutral-700 transition-all cursor-pointer active:scale-95"
                >
                  <Square className="w-3.5 h-3.5 text-red-500" />
                  <span>Stop Assistant</span>
                </button>
              ) : (
                <button 
                  onClick={handleStartListening}
                  disabled={voiceState === "processing"}
                  className="flex items-center space-x-2 bg-white text-black hover:bg-neutral-100 font-mono uppercase text-xs font-bold px-6 py-3.5 rounded-full shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Tap to Speak</span>
                </button>
              )}

              <button 
                onClick={() => {
                  if (recognitionRef.current) {
                    try { recognitionRef.current.abort(); } catch (e) {}
                  }
                  if (typeof window !== "undefined") {
                    window.speechSynthesis.cancel();
                  }
                  setShowVoice(false);
                  onNavigateToTab("Chat");
                }}
                className="flex items-center space-x-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono uppercase text-xs font-bold px-5 py-3 rounded-full border border-neutral-800 transition-all cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Text Mode</span>
              </button>
            </div>
            <p className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">
              Powered by Celouse Client Speech Engine & Gemini Core API
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
