import React, { useState } from "react";
import { Plus, Database, Check, ChevronDown, Trash2, Calendar, User, Search, Edit2, LayoutGrid, List } from "lucide-react";
import { Task, AppState } from "../types";

interface TasksViewProps {
  state: AppState;
  onAddTask: (task: Partial<Task>) => void;
  onToggleTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onEditTask?: (task: Task) => void;
}

export default function TasksView({ state, onAddTask, onToggleTask, onDeleteTask, onEditTask }: TasksViewProps) {
  const [activeFilter, setActiveFilter] = useState<string>("All Tasks");
  const [sortBy, setSortBy] = useState<string>("Due Date");
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"List" | "Board" | "Calendar">(state.settings.defaultTaskView || "List");

  // Edit form state
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editWorkspace, setEditWorkspace] = useState<Task["workspace"]>("Personal");
  const [editTime, setEditTime] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editUrgent, setEditUrgent] = useState(false);
  const [editCompleted, setEditCompleted] = useState(false);
  const [editAssignee, setEditAssignee] = useState("Jubayer Alam");

  // Create form states
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newWorkspace, setNewWorkspace] = useState<Task["workspace"]>("Personal");
  const [newTime, setNewTime] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [newAssignee, setNewAssignee] = useState("Jubayer Alam");

  // Calendar states
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split("T")[0]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Dynamic filter lists & workspaces
  const filterPills = Array.from(new Set([
    "All Tasks",
    "Artbit",
    "Axen",
    "Biggan",
    "Personal",
    "Internal",
    ...(state.businessProfiles ? state.businessProfiles.map(p => p.name) : [])
  ]));

  const availableWorkspaces = Array.from(new Set([
    "Personal",
    "Artbit",
    "Axen",
    "Biggan",
    "Internal",
    ...(state.businessProfiles ? state.businessProfiles.map(p => p.name) : [])
  ]));

  // Task processing
  let filteredTasks = state.tasks;
  if (activeFilter !== "All Tasks") {
    filteredTasks = filteredTasks.filter(t => t.workspace.toLowerCase() === activeFilter.toLowerCase());
  }
  if (searchQuery.trim() !== "") {
    filteredTasks = filteredTasks.filter(t => 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Sorting
  if (sortBy === "Priority") {
    filteredTasks = [...filteredTasks].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
  } else if (sortBy === "Completed") {
    filteredTasks = [...filteredTasks].sort((a, b) => (b.completed ? 1 : 0) - (a.completed ? 1 : 0));
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    onAddTask({
      title: newTitle,
      subtitle: newDesc,
      workspace: newWorkspace,
      time: newTime || "Anytime",
      dueDate: newDate,
      urgent: isUrgent,
      assignee: newAssignee
    });

    // Reset Form
    setNewTitle("");
    setNewDesc("");
    setNewWorkspace("Personal");
    setNewTime("");
    setNewDate(new Date().toISOString().split("T")[0]);
    setIsUrgent(false);
    setNewAssignee("Jubayer Alam");
    setShowAddModal(false);
  };

  const handleOpenEdit = (task: Task) => {
    setTaskToEdit(task);
    setEditTitle(task.title);
    setEditDesc(task.subtitle || "");
    setEditWorkspace(task.workspace);
    setEditTime(task.time || "");
    setEditDate(task.dueDate || new Date().toISOString().split("T")[0]);
    setEditUrgent(task.urgent);
    setEditCompleted(task.completed);
    setEditAssignee(task.assignee || "Jubayer Alam");
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToEdit || !editTitle.trim()) return;

    if (onEditTask) {
      onEditTask({
        ...taskToEdit,
        title: editTitle,
        subtitle: editDesc,
        workspace: editWorkspace,
        time: editTime,
        dueDate: editDate,
        urgent: editUrgent,
        completed: editCompleted,
        assignee: editAssignee
      });
    }
    setTaskToEdit(null);
  };

  const getWorkspaceStyles = (ws: string) => {
    switch (ws) {
      case "Artbit": return "bg-cyan-50 border-cyan-100 text-cyan-700";
      case "Axen": return "bg-indigo-50 border-indigo-100 text-indigo-700";
      case "Biggan": return "bg-orange-50 border-orange-100 text-orange-700";
      case "Personal": return "bg-emerald-50 border-emerald-100 text-emerald-700";
      default: return "bg-gray-55 border-gray-200 text-gray-700";
    }
  };

  // Columns for Board View
  const boardColumns = [
    { id: "todo", title: "Backlog / To Do", tasks: filteredTasks.filter(t => !t.completed && !t.urgent) },
    { id: "urgent", title: "Urgent Priorities", tasks: filteredTasks.filter(t => !t.completed && t.urgent) },
    { id: "completed", title: "Completed", tasks: filteredTasks.filter(t => t.completed) }
  ];

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 pb-12" id="tasks-dashboard-container">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 border border-gray-200 rounded-xl shadow-xs animate-fade-in">
        {/* Workspace Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          {filterPills.map(pill => (
            <button 
              key={pill}
              onClick={() => setActiveFilter(pill)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                (activeFilter === pill || (pill === "All Tasks" && activeFilter === "All")) 
                  ? "bg-black text-white border-black font-semibold shadow-2xs" 
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {pill}
            </button>
          ))}
        </div>

        {/* View Mode & Add and Sort */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* List vs Board vs Calendar Toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
            <button 
              onClick={() => setViewMode("List")}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer flex items-center space-x-1 ${
                viewMode === "List" 
                  ? "bg-white text-gray-800 border border-gray-200 shadow-3xs" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <List className="w-3 h-3" />
              <span>List</span>
            </button>
            <button 
              onClick={() => setViewMode("Board")}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer flex items-center space-x-1 ${
                viewMode === "Board" 
                  ? "bg-white text-gray-800 border border-gray-200 shadow-3xs" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Board</span>
            </button>
            <button 
              onClick={() => setViewMode("Calendar")}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer flex items-center space-x-1 ${
                viewMode === "Calendar" 
                  ? "bg-white text-gray-800 border border-gray-200 shadow-3xs" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>Calendar</span>
            </button>
          </div>

          <div className="relative">
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 hover:border-gray-300 text-xs font-semibold rounded-lg outline-none cursor-pointer text-gray-600 font-mono"
            >
              <option value="Due Date">Due Date</option>
              <option value="Priority">Priority</option>
              <option value="Completed">Completed</option>
            </select>
            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs uppercase tracking-wide cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search and query workspace tasks..."
          className="w-full bg-white border border-gray-200 focus:border-black focus:ring-1 focus:ring-black rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none shadow-xs transition-all"
        />
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
      </div>

      {/* Conditional View Rendering */}
      {viewMode === "List" ? (
        /* TASK LIST VIEW */
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs animate-fade-in">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 px-6 py-3.5 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">
            <div className="col-span-1 text-center">Done</div>
            <div className="col-span-2">Workspace</div>
            <div className="col-span-6">Task Details</div>
            <div className="col-span-3 text-right">Assignee & Actions</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-100">
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Database className="w-10 h-10 text-gray-200 mb-2" />
                <p className="text-xs font-mono">No workspace tasks found matching filters</p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div 
                  key={task.id}
                  className={`grid grid-cols-12 gap-2 items-center px-6 py-4 hover:bg-gray-50/50 transition-colors group ${
                    task.completed ? "bg-gray-50/20 opacity-70" : ""
                  }`}
                >
                  {/* Complete Checkbox */}
                  <div className="col-span-1 flex justify-center">
                    <button 
                      onClick={() => onToggleTask(task)}
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-all cursor-pointer ${
                        task.completed 
                          ? "bg-black border-black text-white" 
                          : "border-gray-300 hover:border-black bg-white"
                      }`}
                    >
                      {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                  </div>

                  {/* Workspace Tag */}
                  <div className="col-span-2">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${getWorkspaceStyles(task.workspace)}`}>
                      {task.workspace}
                    </span>
                  </div>

                  {/* Task Details */}
                  <div className="col-span-6 pr-4">
                    <p className={`text-sm font-semibold text-gray-800 ${task.completed ? "line-through text-gray-400" : ""}`}>
                      {task.title}
                    </p>
                    {task.subtitle && (
                      <p className="text-xs text-gray-400 mt-1 font-medium leading-relaxed">{task.subtitle}</p>
                    )}
                    <div className="flex items-center space-x-1 mt-2 text-[10px] text-gray-400 font-mono font-bold">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{task.dueDate || "No date set"}{task.time ? ` • ${task.time}` : ""}</span>
                      {task.urgent && (
                        <span className="text-[9px] font-extrabold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.2 rounded-sm uppercase tracking-wide ml-2">Urgent</span>
                      )}
                    </div>
                  </div>

                  {/* Assignee & Action */}
                  <div className="col-span-3 flex items-center justify-end space-x-2 text-right">
                    {task.assigneeAvatar ? (
                      <img 
                        src={task.assigneeAvatar} 
                        alt={task.assignee}
                        className="w-6.5 h-6.5 rounded-full object-cover border border-gray-200"
                        title={task.assignee}
                      />
                    ) : (
                      <span 
                        className="w-6.5 h-6.5 rounded-full bg-gray-100 text-gray-700 font-extrabold text-[9px] flex items-center justify-center border border-gray-200"
                        title={task.assignee}
                      >
                        {task.assignee === "Self" ? "Self" : task.assignee.substring(0, 2).toUpperCase()}
                      </span>
                    )}

                    {/* Edit Trigger */}
                    <button 
                      onClick={() => handleOpenEdit(task)}
                      className="p-1 text-gray-400 hover:text-black rounded hover:bg-gray-100 transition-colors cursor-pointer"
                      title="Edit task"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Trigger */}
                    <button 
                      onClick={() => onDeleteTask(task)}
                      className="p-1 text-gray-300 hover:text-red-500 rounded hover:bg-red-55 transition-colors cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : viewMode === "Board" ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in" id="kanban-board-container">
          {boardColumns.map((col) => (
            <div key={col.id} className="bg-gray-100/60 border border-gray-200 rounded-xl p-4 flex flex-col min-h-[450px]">
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-200/80 mb-4">
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wide font-sans">{col.title}</span>
                <span className="bg-white border border-gray-200 text-gray-500 text-[10px] font-extrabold font-mono px-2 py-0.5 rounded-md">
                  {col.tasks.length}
                </span>
              </div>

              <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[500px] scrollbar-none">
                {col.tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400/85">
                    <Database className="w-8 h-8 text-gray-300 mb-1" />
                    <span className="text-[10px] font-mono uppercase tracking-wider">Empty Column</span>
                  </div>
                ) : (
                  col.tasks.map((task) => (
                    <div 
                      key={task.id}
                      className="bg-white border border-gray-250/80 hover:border-black rounded-xl p-4 shadow-3xs hover:shadow-2xs transition-all group flex flex-col"
                    >
                      {/* Badge Row */}
                      <div className="flex justify-between items-center mb-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getWorkspaceStyles(task.workspace)}`}>
                          {task.workspace}
                        </span>
                        {task.urgent && !task.completed && (
                          <span className="text-[8px] font-extrabold text-red-700 bg-red-50 border border-red-100 px-1.5 py-0.2 rounded uppercase">Urgent</span>
                        )}
                      </div>

                      {/* Content */}
                      <h4 className={`text-sm font-bold text-gray-900 leading-tight ${task.completed ? "line-through text-gray-400" : ""}`}>
                        {task.title}
                      </h4>
                      {task.subtitle && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{task.subtitle}</p>
                      )}

                      {/* Footer Info & Actions */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-150">
                        <div className="flex items-center space-x-1 text-[9px] font-mono text-gray-400 font-bold">
                          <Calendar className="w-3 h-3" />
                          <span>{task.dueDate || "No date set"}{task.time ? ` • ${task.time}` : ""}</span>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          {/* Toggle Completion */}
                          <button
                            onClick={() => onToggleTask(task)}
                            className={`w-5 h-5 rounded border flex items-center justify-center transition-all cursor-pointer ${
                              task.completed 
                                ? "bg-black border-black text-white" 
                                : "border-gray-300 hover:border-black bg-white"
                            }`}
                            title={task.completed ? "Mark pending" : "Mark completed"}
                          >
                            {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>

                          {/* Edit Trigger */}
                          <button
                            onClick={() => handleOpenEdit(task)}
                            className="p-1 text-gray-400 hover:text-black hover:bg-gray-50 rounded transition-colors cursor-pointer"
                            title="Edit task"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Trigger */}
                          <button
                            onClick={() => onDeleteTask(task)}
                            className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TASK CALENDAR VIEW */
        <div className="space-y-6 animate-fade-in" id="tasks-calendar-container">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
            {/* Calendar Control Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-gray-950 font-mono uppercase tracking-wider">
                  {monthNames[currentMonth]} {currentYear}
                </h3>
              </div>
              <div className="flex items-center space-x-1.5">
                <button 
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 px-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  &larr;
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setCurrentMonth(new Date().getMonth());
                    setCurrentYear(new Date().getFullYear());
                    setSelectedDate(new Date().toISOString().split("T")[0]);
                  }}
                  className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer font-mono"
                >
                  Today
                </button>
                <button 
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 px-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  &rarr;
                </button>
              </div>
            </div>

            {/* Weekdays Labels Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono pb-2">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Padding empty cells for previous month days */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[70px] bg-gray-50/50 rounded-lg border border-transparent"></div>
              ))}

              {/* Day cells */}
              {Array.from({ length: totalDays }).map((_, i) => {
                const day = i + 1;
                const formattedMonth = String(currentMonth + 1).padStart(2, "0");
                const formattedDay = String(day).padStart(2, "0");
                const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
                
                const isSelected = selectedDate === dateStr;
                const isToday = new Date().toISOString().split("T")[0] === dateStr;
                
                // Find tasks matching this date
                const dayTasks = filteredTasks.filter(t => t.dueDate === dateStr);

                return (
                  <div 
                    key={`day-${day}`}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`min-h-[80px] p-1.5 border rounded-lg transition-all flex flex-col justify-between cursor-pointer group relative ${
                      isSelected 
                        ? "bg-gray-50 border-gray-950 ring-1 ring-gray-950/20" 
                        : isToday 
                          ? "bg-gray-100/70 border-gray-300 font-bold" 
                          : "bg-white border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {/* Day Number */}
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-mono font-extrabold ${
                        isToday ? "text-black underline decoration-2 decoration-black" : "text-gray-500"
                      }`}>
                        {day}
                      </span>
                      {dayTasks.length > 0 && (
                        <span className="text-[8px] font-bold bg-black text-white px-1 py-0.2 rounded font-mono">
                          {dayTasks.length}
                        </span>
                      )}
                    </div>

                    {/* Compact Day Tasks Previews */}
                    <div className="mt-1 space-y-1 flex-1 overflow-y-auto scrollbar-none max-h-[48px]">
                      {dayTasks.slice(0, 2).map((t) => (
                        <div 
                          key={t.id}
                          className={`text-[8px] font-bold px-1 py-0.5 rounded-xs border truncate ${
                            t.completed 
                              ? "bg-gray-50 border-gray-200 text-gray-400 line-through" 
                              : t.workspace === "Artbit" ? "bg-cyan-50 border-cyan-100 text-cyan-800" :
                                t.workspace === "Axen" ? "bg-indigo-50 border-indigo-100 text-indigo-800" :
                                t.workspace === "Biggan" ? "bg-orange-50 border-orange-100 text-orange-800" :
                                t.workspace === "Personal" ? "bg-emerald-50 border-emerald-100 text-emerald-800" :
                                "bg-gray-100 border-gray-200 text-gray-800"
                          }`}
                          title={t.title}
                        >
                          {t.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="text-[7px] font-mono font-extrabold text-gray-400 text-center">
                          +{dayTasks.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Date Tasks List Panel */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h4 className="text-sm font-bold text-gray-950 font-sans tracking-tight">
                  Tasks for {selectedDate ? new Date(selectedDate).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "Select Date"}
                </h4>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5 font-bold">DATE ID: {selectedDate}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (selectedDate) {
                    setNewDate(selectedDate);
                    setShowAddModal(true);
                  }
                }}
                className="flex items-center space-x-1 px-2.5 py-1 bg-black hover:bg-neutral-800 text-white rounded-lg text-[10px] font-bold uppercase transition-all tracking-wide cursor-pointer font-mono"
              >
                <Plus className="w-3 h-3" />
                <span>Add for Day</span>
              </button>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredTasks.filter(t => t.dueDate === selectedDate).length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-400 font-mono">
                  No tasks registered on this specific calendar date registry.
                </p>
              ) : (
                filteredTasks.filter(t => t.dueDate === selectedDate).map((task) => (
                  <div key={task.id} className="flex items-center justify-between py-3.5 group">
                    <div className="flex items-center space-x-3">
                      <button 
                        type="button"
                        onClick={() => onToggleTask(task)}
                        className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all cursor-pointer ${
                          task.completed 
                            ? "bg-black border-black text-white" 
                            : "border-gray-300 hover:border-black bg-white"
                        }`}
                      >
                        {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                      <div>
                        <p className={`text-xs font-semibold text-gray-800 ${task.completed ? "line-through text-gray-400" : ""}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-bold border ${getWorkspaceStyles(task.workspace)}`}>
                            {task.workspace}
                          </span>
                          {task.time && (
                            <span className="text-[9px] text-gray-400 font-mono">{task.time}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button 
                        type="button"
                        onClick={() => handleOpenEdit(task)}
                        className="p-1 text-gray-400 hover:text-black rounded hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => onDeleteTask(task)}
                        className="p-1 text-gray-300 hover:text-red-500 rounded hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl max-w-md w-full p-6 animate-scale-up">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center">
              <Database className="w-5 h-5 text-black mr-2" /> Add Workspace Task
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Task Title *</label>
                <input 
                  type="text" 
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Q4 Market Expansion Research"
                  className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-2 text-sm outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Description / Subtitle</label>
                <textarea 
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Analyze competitor performance in SE Asian sector..."
                  className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-2 text-sm outline-none transition-all h-16"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Workspace</label>
                  <select 
                    value={newWorkspace}
                    onChange={(e) => setNewWorkspace(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-black focus:bg-white rounded-lg px-2.5 py-2 text-xs outline-none transition-all cursor-pointer"
                  >
                    {availableWorkspaces.map(ws => (
                      <option key={ws} value={ws}>{ws}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Due Date *</label>
                  <input 
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-2 py-1.5 text-xs outline-none transition-all font-mono"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Due Time</label>
                  <input 
                    type="text" 
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="e.g. 10:00 AM"
                    className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-2.5 py-2 text-xs outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center pt-2">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    id="modal-urgent"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    className="h-4 w-4 rounded text-black border-gray-300 focus:ring-black cursor-pointer"
                  />
                  <label htmlFor="modal-urgent" className="text-xs text-gray-600 font-medium cursor-pointer">Mark as Urgent</label>
                </div>
                <div>
                  <input 
                    type="text" 
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    placeholder="Assignee (e.g. Self)"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:bg-white rounded-lg px-2.5 py-1.5 text-xs outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-100 mt-2">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold tracking-wide uppercase transition-all font-mono"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold tracking-wide uppercase transition-all shadow-xs font-mono"
                >
                  Confirm Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal Overlay */}
      {taskToEdit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-gray-250 rounded-xl shadow-xl max-w-md w-full p-6 animate-scale-up">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center">
              <Edit2 className="w-5 h-5 text-black mr-2 animate-pulse" /> Edit Workspace Task
            </h3>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Task Title *</label>
                <input 
                  type="text" 
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-2 text-sm outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Description / Subtitle</label>
                <textarea 
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-3 py-2 text-sm outline-none transition-all h-16"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Workspace</label>
                  <select 
                    value={editWorkspace}
                    onChange={(e) => setEditWorkspace(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-black focus:bg-white rounded-lg px-2.5 py-2 text-xs outline-none transition-all cursor-pointer"
                  >
                    {availableWorkspaces.map(ws => (
                      <option key={ws} value={ws}>{ws}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Due Date *</label>
                  <input 
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-2 py-1.5 text-xs outline-none transition-all font-mono"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Due Time</label>
                  <input 
                    type="text" 
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-black focus:ring-1 focus:ring-black focus:bg-white rounded-lg px-2.5 py-2 text-xs outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center pt-2">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    id="edit-modal-urgent"
                    checked={editUrgent}
                    onChange={(e) => setEditUrgent(e.target.checked)}
                    className="h-4 w-4 rounded text-black border-gray-300 focus:ring-black cursor-pointer"
                  />
                  <label htmlFor="edit-modal-urgent" className="text-xs text-gray-600 font-medium cursor-pointer">Mark as Urgent</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    id="edit-modal-completed"
                    checked={editCompleted}
                    onChange={(e) => setEditCompleted(e.target.checked)}
                    className="h-4 w-4 rounded text-black border-gray-300 focus:ring-black cursor-pointer"
                  />
                  <label htmlFor="edit-modal-completed" className="text-xs text-gray-600 font-medium cursor-pointer">Completed</label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1.5">Assignee</label>
                <input 
                  type="text" 
                  value={editAssignee}
                  onChange={(e) => setEditAssignee(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:bg-white rounded-lg px-2.5 py-1.5 text-xs outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-100 mt-2">
                <button 
                  type="button"
                  onClick={() => setTaskToEdit(null)}
                  className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold tracking-wide uppercase transition-all font-mono"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold tracking-wide uppercase transition-all shadow-xs font-mono"
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
