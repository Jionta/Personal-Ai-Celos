import React from "react";
import { CheckCircle, Clock, Moon, Sunrise, Sun, ShieldAlert, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { AppState, Prayer, Habit } from "../types";

interface HabitsViewProps {
  state: AppState;
  onTogglePrayer: (prayerId: string, completed: boolean) => void;
  onToggleHabit: (habitId: string, completed: boolean) => void;
}

export default function HabitsView({ state, onTogglePrayer, onToggleHabit }: HabitsViewProps) {
  // Compute true live metrics
  const totalItems = state.prayers.length + state.habits.length;
  const completedItems = state.prayers.filter(p => p.completed).length + state.habits.filter(h => h.completed).length;
  const progressPct = Math.round((completedItems / totalItems) * 100);
  const remainingCount = totalItems - completedItems;

  const getPrayerIcon = (name: string) => {
    switch (name) {
      case "Fajr": return <Sunrise className="w-4 h-4 text-gray-700" />;
      case "Dhuhr": return <Sun className="w-4 h-4 text-gray-700" />;
      case "Asr": return <Sparkles className="w-4 h-4 text-gray-700" />;
      case "Maghrib": return <Moon className="w-4 h-4 text-gray-700" />;
      default: return <Clock className="w-4 h-4 text-gray-700" />;
    }
  };

  const getHabitBadgeStyle = (category: string) => {
    switch (category) {
      case "Daily": return "bg-cyan-50 border-cyan-100 text-cyan-600";
      case "Mandatory": return "bg-indigo-50 border-indigo-100 text-indigo-700";
      case "Creation": return "bg-orange-50 border-orange-100 text-orange-600";
      default: return "bg-gray-100 border-gray-200 text-gray-600";
    }
  };

  // 90-Day Consistency Grid:
  // Let's draw 18 weeks (columns) x 7 days (rows).
  // Seeding realistic frequency values for the heatmap.
  const heatmapData = [
    [4, 2, 4, 3, 4, 1, 3], // Week 1
    [3, 0, 4, 2, 3, 2, 4], // Week 2
    [4, 3, 1, 4, 2, 4, 3], // Week 3
    [2, 4, 3, 0, 4, 3, 4], // Week 4
    [4, 3, 4, 4, 3, 4, 2], // Week 5
    [3, 1, 3, 2, 4, 1, 4], // Week 6
    [4, 4, 2, 3, 3, 4, 3], // Week 7
    [3, 2, 4, 1, 4, 3, 4], // Week 8
    [4, 3, 3, 4, 2, 4, 2], // Week 9
    [3, 4, 1, 3, 4, 2, 4], // Week 10
    [4, 2, 4, 4, 3, 4, 3], // Week 11
    [2, 3, 3, 2, 4, 1, 4], // Week 12
    [4, 4, 4, 3, 4, 3, 4]  // Week 13 (current week)
  ];

  const getHeatmapColor = (intensity: number) => {
    switch (intensity) {
      case 0: return "bg-gray-100 border-gray-200/50";
      case 1: return "bg-black/10 border-black/5";
      case 2: return "bg-black/30 border-black/10";
      case 3: return "bg-black/60 border-black/20";
      case 4: return "bg-black border-black";
      default: return "bg-gray-100";
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Precision Tracking</h2>
          <p className="text-xs text-gray-500 font-mono font-bold mt-1">Cycle 42 • Day 88/90</p>
        </div>
      </div>

      {/* Today's Progress Summary */}
      <div id="today-progress-dial" className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-center justify-around gap-6 animate-fade-in">
        {/* Dynamic SVG Circular Progress */}
        <div className="relative w-36 h-36 flex items-center justify-center">
          {/* SVG circle */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle 
              cx="50" 
              cy="50" 
              r="40" 
              className="stroke-gray-100" 
              strokeWidth="8" 
              fill="none" 
            />
            <circle 
              cx="50" 
              cy="50" 
              r="40" 
              className="stroke-black transition-all duration-1000 ease-out" 
              strokeWidth="8" 
              fill="none" 
              strokeDasharray="251.2"
              strokeDashoffset={251.2 - (251.2 * progressPct) / 100}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-2xl font-bold font-mono text-gray-900 block">{progressPct}%</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mt-0.5">Total Output</span>
          </div>
        </div>

        {/* Text Metrics */}
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto flex-1 justify-center md:justify-start md:pl-6">
          <div className="flex-1 p-4 bg-gray-50 border border-gray-200 rounded-xl text-center md:text-left">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 font-mono">Remaining Tasks</span>
            <span className="text-xl font-extrabold font-mono text-black block mt-1.5">{remainingCount}/{totalItems}</span>
          </div>
          <div className="flex-1 p-4 bg-emerald-50/20 border border-emerald-100 rounded-xl text-center md:text-left">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 font-mono">Active Streak</span>
            <span className="text-xl font-extrabold font-mono text-emerald-600 block mt-1.5">14d</span>
          </div>
        </div>
      </div>

      {/* Islamic Prayers Checklist */}
      <div id="prayers-checklist" className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4.5 h-4.5 text-black" />
            <h3 className="text-base font-semibold text-gray-950">Islamic Prayers</h3>
          </div>
          <span className="text-[10px] font-bold text-gray-800 bg-gray-100 border border-gray-200 px-2 py-1 rounded font-mono uppercase tracking-wide">
            Current: Asr
          </span>
        </div>

        <div className="space-y-3">
          {state.prayers.map((prayer) => (
            <div 
              key={prayer.id}
              onClick={() => onTogglePrayer(prayer.id, !prayer.completed)}
              className={`flex items-center justify-between p-3 border rounded-lg transition-all cursor-pointer ${
                prayer.completed 
                  ? "bg-gray-50/30 border-gray-200 opacity-80" 
                  : prayer.status === "active"
                    ? "bg-white border-black ring-1 ring-gray-200 shadow-xs" 
                    : "bg-white border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${prayer.completed ? "bg-gray-100 text-gray-700" : "bg-gray-50 text-gray-400"}`}>
                  {getPrayerIcon(prayer.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-950">{prayer.name}</p>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                    {prayer.time} • {prayer.completed ? "On Time" : prayer.status === "active" ? "Active Window" : "Upcoming"}
                  </p>
                </div>
              </div>

              <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                prayer.completed 
                  ? "bg-black border-black text-white" 
                  : "border-gray-200 group-hover:border-black bg-white"
              }`}>
                {prayer.completed && <CheckCircle className="w-4 h-4 stroke-[3]" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operational Habits */}
      <div id="habits-checklist" className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4.5 h-4.5 text-black" />
            <h3 className="text-base font-semibold text-gray-950">Operational Habits</h3>
          </div>
          <span className="text-[10px] font-extrabold text-gray-400 tracking-wider uppercase font-mono bg-gray-50 px-2 py-1 rounded border border-gray-100">Daily Ledger Sync</span>
        </div>

        <div className="space-y-4">
          {state.habits.map((habit) => (
            <div 
              key={habit.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 rounded-xl bg-white hover:bg-gray-50/20 transition-all gap-4 animate-fade-in"
            >
              <div className="flex items-start space-x-3">
                <div className={`mt-0.5 p-2 rounded-lg ${habit.completed ? "bg-gray-100 text-gray-700" : "bg-gray-100 text-gray-500"}`}>
                  {habit.category === "Daily" ? <RefreshCw className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} /> : <Clock className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-semibold text-gray-800">{habit.title}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getHabitBadgeStyle(habit.category)}`}>
                      {habit.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 font-medium">{habit.description}</p>
                  {habit.logStatus && (
                    <span className="text-[9px] text-gray-700 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded font-mono font-bold mt-2 inline-block">
                      {habit.logStatus}
                    </span>
                  )}
                </div>
              </div>

              <button 
                onClick={() => onToggleHabit(habit.id, !habit.completed)}
                className={`w-full sm:w-auto px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                  habit.completed 
                    ? "bg-gray-100 text-gray-800 border-gray-200" 
                    : "bg-white border-black hover:bg-gray-50 text-black"
                }`}
              >
                {habit.completed ? "Completed" : "Mark Complete"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 90-Day Consistency Heatmap Grid */}
      <div id="90-day-heatmap" className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">90-Day Consistency Heatmap</h3>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">QUARTER START • CYCLE STATUS</p>
          </div>
          <span className="text-[10px] font-bold text-black font-mono">13 Weeks logged</span>
        </div>

        {/* Heatmap Grid container */}
        <div className="flex items-start space-x-3 overflow-x-auto py-2 scrollbar-none">
          {/* Day Names column */}
          <div className="flex flex-col justify-between h-28 text-[9px] font-extrabold text-gray-400 font-mono select-none pr-1 uppercase">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
            <span>Sun</span>
          </div>

          {/* Grid columns represent weeks */}
          <div className="flex space-x-1.5">
            {heatmapData.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col space-y-1.5">
                {week.map((intensity, dayIdx) => (
                  <div 
                    key={dayIdx} 
                    className={`w-3.5 h-3.5 rounded-sm border transition-colors hover:brightness-95 cursor-pointer ${getHeatmapColor(intensity)}`}
                    title={`Week ${weekIdx + 1}, Day ${dayIdx + 1}: Completion Rank ${intensity}/4`}
                  ></div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center text-[9px] font-mono text-gray-400 pt-4 border-t border-gray-100 mt-4 select-none">
          <span>QUARTER START</span>
          <div className="flex items-center space-x-1">
            <span>Less</span>
            <div className="w-2.5 h-2.5 rounded-xs bg-gray-100 border border-gray-200"></div>
            <div className="w-2.5 h-2.5 rounded-xs bg-black/10"></div>
            <div className="w-2.5 h-2.5 rounded-xs bg-black/30"></div>
            <div className="w-2.5 h-2.5 rounded-xs bg-black/60"></div>
            <div className="w-2.5 h-2.5 rounded-xs bg-black"></div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
