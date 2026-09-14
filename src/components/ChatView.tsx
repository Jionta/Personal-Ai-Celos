import React, { useState, useRef, useEffect } from "react";
import { Send, Paperclip, RefreshCw, Sparkles, CheckCircle2, DollarSign, Brain, X, Database } from "lucide-react";
import { ChatMessage, AppState } from "../types";

interface ChatViewProps {
  state: AppState;
  onSendMessage: (msg: string, pins: string[]) => void;
  onClearHistory: () => void;
  isSending: boolean;
}

export default function ChatView({ state, onSendMessage, onClearHistory, isSending }: ChatViewProps) {
  const [inputText, setInputText] = useState("");
  const [activePins, setActivePins] = useState<string[]>(["Artbit Studio Core", "Personal Background"]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.chatHistory, isSending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    onSendMessage(inputText, activePins);
    setInputText("");
  };

  const handleSuggestionClick = (query: string) => {
    setInputText(query);
  };

  const removePin = (pin: string) => {
    setActivePins(prev => prev.filter(p => p !== pin));
  };

  const addPin = (pin: string) => {
    if (!activePins.includes(pin)) {
      setActivePins(prev => [...prev, pin]);
    }
  };

  return (
    <div id="chat-container" className="flex flex-col h-[calc(100vh-130px)] md:h-[calc(100vh-64px)] max-w-4xl mx-auto w-full bg-white border border-gray-200 rounded-xl overflow-hidden mt-2 shadow-xs animate-fade-in">
      {/* Mini Info Panel */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-gray-700" />
          <span className="text-xs font-mono font-medium text-gray-500 uppercase tracking-wider">Indexed Workspaces: Personal, Artbit, Axen, Biggan, Habits, Prayers</span>
        </div>
        <button 
          onClick={onClearHistory}
          className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
          title="Clear Chat History"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="font-mono">Reset</span>
        </button>
      </div>

      {/* Suggestion Chips */}
      <div className="flex items-center space-x-2 px-4 py-3 bg-white border-b border-gray-200 overflow-x-auto scrollbar-none shrink-0">
        <button 
          onClick={() => handleSuggestionClick("Create a new pending invoice of ৳15,000 for client 'Delta Labs' under the Axen business/workspace")}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-50 text-gray-800 hover:bg-gray-100 text-xs font-medium rounded-full border border-gray-200 transition-all shrink-0 shadow-xs"
        >
          <DollarSign className="w-3.5 h-3.5 text-gray-700" />
          <span>New Pending Invoice</span>
        </button>
        <button 
          onClick={() => handleSuggestionClick("Show me my active pending invoices and total financial ledger overview")}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-50 text-gray-800 hover:bg-gray-100 text-xs font-medium rounded-full border border-gray-200 transition-all shrink-0 shadow-xs"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-gray-700" />
          <span>Financial Overview</span>
        </button>
        <button 
          onClick={() => handleSuggestionClick("Draft a weekly sync agenda incorporating the Q4 expansion task details")}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-50 text-gray-800 hover:bg-gray-100 text-xs font-medium rounded-full border border-gray-200 transition-all shrink-0 shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-gray-700" />
          <span>Sync Agenda</span>
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {state.chatHistory.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col max-w-[85%] ${msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
          >
            <span className="text-[10px] font-mono text-gray-400 mb-1 px-1">{msg.sender === "user" ? "You" : "Assistant"} • {msg.timestamp}</span>
            <div 
              className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                msg.sender === "user" 
                  ? "bg-black text-white rounded-tr-none shadow-sm" 
                  : "bg-white border border-gray-200 text-gray-950 rounded-tl-none shadow-xs"
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{msg.text}</div>
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex flex-col items-start max-w-[85%]">
            <span className="text-[10px] font-mono text-gray-400 mb-1 px-1">Assistant • Accessing DB...</span>
            <div className="p-3.5 bg-white border border-gray-200 text-black font-medium text-xs rounded-2xl rounded-tl-none shadow-xs flex items-center space-x-2">
              <span className="flex space-x-1">
                <span className="w-1.5 h-1.5 bg-black rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-black rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-black rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </span>
              <span className="font-mono text-gray-500">Accessing Artbit Finance Module & ledger...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Context Pins */}
      <div className="px-4 py-2.5 bg-white border-t border-gray-200 flex flex-wrap items-center gap-1.5 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-1.5 flex items-center">
          <Brain className="w-3 h-3 text-black mr-1" /> Context Pins:
        </span>
        {activePins.map(pin => (
          <span 
            key={pin} 
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-gray-100 border-gray-250 text-gray-800"
          >
            <span>{pin}</span>
            <button 
              onClick={() => removePin(pin)}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {activePins.length < 3 && (
          <div className="relative group inline-block">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  addPin(e.target.value);
                  e.target.value = "";
                }
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded-full border border-dashed border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 bg-transparent cursor-pointer"
            >
              <option value="" disabled>+ Pin Data</option>
              <option value="Habits Ledger">Habits Ledger</option>
              <option value="Active Tasks">Active Tasks</option>
              <option value="Prayer Times">Prayer Times</option>
              <option value="Monthly Ledger">Monthly Ledger</option>
            </select>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-200 flex items-center space-x-2 shrink-0">
        <label 
          className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
          title="Attach file to message"
        >
          <Paperclip className="w-5 h-5" />
          <input 
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setInputText(prev => prev ? `${prev} [Attached file: ${file.name}]` : `Reviewing attached document: ${file.name} - `);
              }
            }}
          />
        </label>
        <input 
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Message Gemini..."
          className="flex-1 bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-full px-4 py-2.5 text-sm outline-none transition-all"
        />
        <button 
          type="submit"
          disabled={!inputText.trim() || isSending}
          className={`p-2.5 rounded-full text-white transition-all ${
            inputText.trim() && !isSending
              ? "bg-black hover:bg-neutral-800 shadow-md"
              : "bg-gray-100 text-gray-300 cursor-not-allowed"
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
