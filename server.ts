import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { AppState, ChatMessage, Task, LedgerEntry, Prayer, Habit } from "./src/types";

const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), "data-store.json");
const USERS_FILE = path.join(process.cwd(), "users-store.json");
const SESSIONS_FILE = path.join(process.cwd(), "sessions-store.json");

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  avatar: string;
  createdAt: string;
}

interface StoredSession {
  token: string;
  userId: string;
  deviceId: string;
  deviceName?: string;
  createdAt: string;
  lastActive: string;
}

const defaultUsers: StoredUser[] = [
  {
    id: "usr-1",
    email: "jubayera40@gmail.com",
    passwordHash: "Artbit24",
    name: "Jubayer Alam",
    role: "Clinical Operator",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces",
    createdAt: new Date().toISOString()
  },
  {
    id: "usr-2",
    email: "admin@celouse.io",
    passwordHash: "adminpassword",
    name: "Clinical Admin",
    role: "System Administrator",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces",
    createdAt: new Date().toISOString()
  }
];

function readUsers(): StoredUser[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading users file:", err);
  }
  return defaultUsers;
}

function writeUsers(users: StoredUser[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing users file:", err);
  }
}

function readSessions(): StoredSession[] {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const content = fs.readFileSync(SESSIONS_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading sessions file:", err);
  }
  return [];
}

function writeSessions(sessions: StoredSession[]) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing sessions file:", err);
  }
}

if (!fs.existsSync(USERS_FILE)) {
  writeUsers(defaultUsers);
}
if (!fs.existsSync(SESSIONS_FILE)) {
  writeSessions([]);
}

// Helper to get Gemini client lazily
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Initial state matching the requested UI screens and data specs
const defaultState: AppState = {
  tasks: [
    {
      id: "task-1",
      title: "Review Q3 Financial Projections with Board",
      subtitle: "Prepare breakdown of expenses across Artbit and Axen workspaces.",
      workspace: "Axen",
      time: "10:00 AM",
      urgent: true,
      completed: false,
      assignee: "Self"
    },
    {
      id: "task-2",
      title: "Finalize API Integration Documentation",
      subtitle: "Document the webhook response format for health telemetry.",
      workspace: "Artbit",
      time: "1:30 PM",
      urgent: true,
      completed: false,
      assignee: "Self"
    },
    {
      id: "task-3",
      title: "Draft Weekly Sync Agenda",
      subtitle: "Focus on cross-functional alignment and next milestone.",
      workspace: "Internal",
      time: "3:00 PM",
      urgent: true,
      completed: false,
      assignee: "Self"
    },
    {
      id: "task-4",
      title: "Q4 Market Expansion Research",
      subtitle: "Analyze competitor performance in SE Asian sector.",
      workspace: "Axen",
      time: "5:00 PM",
      urgent: false,
      completed: false,
      assignee: "Self"
    },
    {
      id: "task-5",
      title: "V3 Interface Polish",
      subtitle: "Finalize CSS variables for dark mode compatibility.",
      workspace: "Artbit",
      time: "Anytime",
      urgent: false,
      completed: false,
      assignee: "Tasnim",
      assigneeAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces"
    },
    {
      id: "task-6",
      title: "Bio-Sensor API Integration",
      subtitle: "Map health telemetry data to habit tracking ledger.",
      workspace: "Biggan",
      time: "11:30 AM",
      urgent: false,
      completed: false,
      assignee: "JD"
    }
  ],
  prayers: [
    { id: "prayer-fajr", name: "Fajr", time: "05:14 AM", status: "checked", completed: true },
    { id: "prayer-dhuhr", name: "Dhuhr", time: "12:30 PM", status: "checked", completed: true },
    { id: "prayer-asr", name: "Asr", time: "03:45 PM", status: "active", completed: false },
    { id: "prayer-maghrib", name: "Maghrib", time: "06:12 PM", status: "upcoming", completed: false },
    { id: "prayer-isha", name: "Isha", time: "07:45 PM", status: "upcoming", completed: false }
  ],
  habits: [
    {
      id: "habit-1",
      title: "Expense Audit",
      category: "Daily",
      description: "Clear all pending ledger entries.",
      completed: false
    },
    {
      id: "habit-2",
      title: "Sleep Optimization",
      category: "Mandatory",
      description: "Minimum 7h with 15m deep sleep.",
      completed: true,
      logStatus: "Logged via Wearable"
    },
    {
      id: "habit-3",
      title: "Content Batching",
      category: "Creation",
      description: "Draft 3 core system updates.",
      completed: false
    }
  ],
  ledger: [
    { id: "led-1", type: "income", amount: 10200, workspace: "Axen", description: "Axen Valley Consultancy Retainer Q3", date: "2023-10-10" },
    { id: "led-2", type: "income", amount: 8000, workspace: "Artbit", description: "Artbit Studio Core Milestone V3", date: "2023-10-14" },
    { id: "led-3", type: "expense", amount: 3500, workspace: "Biggan", description: "Bio-Sensor API Platform Licensing", date: "2023-10-15" },
    { id: "led-4", type: "expense", amount: 2250, workspace: "Personal", description: "Workspace High-Density Studio setup", date: "2023-10-16" }
  ],
  businessProfiles: [
    { id: "b-1", name: "Artbit Studio", currency: "BDT" },
    { id: "b-2", name: "Axen Valley", currency: "BDT" },
    { id: "b-3", name: "Biggan PiC", currency: "BDT" },
    { id: "b-4", name: "Personal", currency: "BDT" }
  ],
  teamMembers: [
    { id: "tm-1", name: "Tasnim", phone: "+8801700000001", email: "tasnim@artbit.co", location: "Dhaka, Bangladesh", role: "UI Designer" },
    { id: "tm-2", name: "JD", phone: "+14155552671", email: "jd@axen.co", location: "San Francisco, USA", role: "API Engineer" },
    { id: "tm-3", name: "Jubayer Alam", phone: "+8801800000002", email: "admin@celouse.io", location: "Dhaka, Bangladesh", role: "Clinical Operator" }
  ],
  pendingInvoices: [
    { id: "inv-1", client: "Artbit Creative", project: "Design System Retainer", amount: 240000, dueDate: "2023-11-15", status: "pending" },
    { id: "inv-2", client: "Axen Rockets", project: "API Platform Integration", amount: 115000, dueDate: "2023-11-20", status: "pending" }
  ],
  knowledgeBase: [
    { id: "kb-1", title: "Business Core", source: "Artbit, Axen profiles, Q3 Reports", docCount: 42 },
    { id: "kb-2", title: "Workflow Preferences", source: "Rules, formatting, tone guidelines", docCount: 12 },
    { id: "kb-3", title: "Technical Specs", source: "API docs, schema, architecture", docCount: 89 }
  ],
  linkedFolders: [],
  settings: {
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    longTermMemory: true,
    kbIndexingActive: true,
    baseCurrency: "BDT - Bangladeshi Taka",
    manualExchangeRate: "110.50",
    autoDraftFollowups: false,
    defaultTaskView: "List",
    notifications: true,
    darkMode: false,
    driveSyncEnabled: true,
    lastSyncTime: "2 mins ago",
    totalIndexedFiles: 1248
  },
  chatHistory: [
    {
      id: "c-1",
      sender: "assistant",
      text: "System initialization complete. Local database indexed for all Artbit Studio modules. How can I assist with your workflow today?",
      timestamp: "10:00 AM"
    }
  ],
  quickNotes: ""
};

// ==========================================
// PER-USER DATABASE ARCHITECTURE & STORAGE
// ==========================================
const DATABASES_DIR = path.join(process.cwd(), "databases");
if (!fs.existsSync(DATABASES_DIR)) {
  fs.mkdirSync(DATABASES_DIR, { recursive: true });
}

function getUserDbFile(userId: string): string {
  const safeId = (userId || "usr-1").replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(DATABASES_DIR, `${safeId}.json`);
}

function createFreshUserDatabase(user: StoredUser): AppState {
  const today = new Date().toISOString().split("T")[0];
  const userName = user.name || "Operator";
  const userRole = user.role || "Clinical Operator";

  return {
    tasks: [
      {
        id: "task-" + Date.now(),
        title: `Welcome ${userName} - Workspace Setup`,
        subtitle: "Your new isolated database has been created for your account. You can now manage your daily action items, financial ledger, and team.",
        workspace: "Personal",
        time: "Anytime",
        dueDate: today,
        urgent: false,
        completed: false,
        assignee: "Self"
      }
    ],
    prayers: [
      { id: "prayer-fajr", name: "Fajr", time: "05:14 AM", status: "upcoming", completed: false },
      { id: "prayer-dhuhr", name: "Dhuhr", time: "12:30 PM", status: "upcoming", completed: false },
      { id: "prayer-asr", name: "Asr", time: "03:45 PM", status: "upcoming", completed: false },
      { id: "prayer-maghrib", name: "Maghrib", time: "06:12 PM", status: "upcoming", completed: false },
      { id: "prayer-isha", name: "Isha", time: "07:45 PM", status: "upcoming", completed: false }
    ],
    habits: [
      {
        id: "habit-1",
        title: "Daily Goal Review",
        category: "Daily",
        description: "Review active tasks and daily action items.",
        completed: false
      },
      {
        id: "habit-2",
        title: "Financial Ledger Sync",
        category: "Mandatory",
        description: "Review receivables, expenses, and pending invoices.",
        completed: false
      }
    ],
    ledger: [],
    businessProfiles: [
      { id: "b-" + Date.now(), name: "Personal", currency: "BDT" },
      { id: "b-" + (Date.now() + 1), name: `${userName}'s Studio`, currency: "BDT" }
    ],
    teamMembers: [
      {
        id: "tm-" + Date.now(),
        name: userName,
        phone: "",
        email: user.email,
        location: "Dhaka, Bangladesh",
        role: userRole
      }
    ],
    pendingInvoices: [],
    knowledgeBase: [
      { id: "kb-1", title: "Personal Workspace", source: `${userName} notes & guidelines`, docCount: 1 },
      { id: "kb-2", title: "Workflow Rules", source: "Formatting and priority guidelines", docCount: 1 }
    ],
    linkedFolders: [],
    settings: {
      geminiApiKey: process.env.GEMINI_API_KEY || "",
      longTermMemory: true,
      kbIndexingActive: true,
      baseCurrency: "BDT - Bangladeshi Taka",
      manualExchangeRate: "110.50",
      autoDraftFollowups: false,
      defaultTaskView: "List",
      notifications: true,
      darkMode: false,
      driveSyncEnabled: true,
      lastSyncTime: "Just now",
      totalIndexedFiles: 0
    },
    chatHistory: [
      {
        id: "c-1",
        sender: "assistant",
        text: `Welcome ${userName}! Your dedicated, isolated database has been initialized for your account (${user.email}). How can I assist you with your tasks or workflow today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ],
    quickNotes: `Welcome to your personal Clinical Intelligence workspace, ${userName}!`
  };
}

// Ensure database for initial user usr-1 exists (migrating legacy data-store.json if present)
const usr1File = getUserDbFile("usr-1");
if (!fs.existsSync(usr1File)) {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      fs.writeFileSync(usr1File, content, "utf-8");
    } catch (e) {
      fs.writeFileSync(usr1File, JSON.stringify(defaultState, null, 2), "utf-8");
    }
  } else {
    fs.writeFileSync(usr1File, JSON.stringify(defaultState, null, 2), "utf-8");
  }
}

// Helper to resolve the authenticated or requested userId from any incoming request
function resolveUserIdFromRequest(req: express.Request): string {
  // 1. Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const sessions = readSessions();
    const session = sessions.find(s => s.token === token);
    if (session) return session.userId;
  }

  // 2. x-session-token header
  const sessionTokenHeader = req.headers["x-session-token"] as string;
  if (sessionTokenHeader) {
    const sessions = readSessions();
    const session = sessions.find(s => s.token === sessionTokenHeader);
    if (session) return session.userId;
  }

  // 3. x-user-id header
  const userIdHeader = req.headers["x-user-id"] as string;
  if (userIdHeader) {
    const users = readUsers();
    if (users.some(u => u.id === userIdHeader)) {
      return userIdHeader;
    }
  }

  // 4. Request body checks
  if (req.body) {
    if (req.body.token) {
      const sessions = readSessions();
      const session = sessions.find(s => s.token === req.body.token);
      if (session) return session.userId;
    }
    if (req.body.userId) {
      const users = readUsers();
      if (users.some(u => u.id === req.body.userId)) {
        return req.body.userId;
      }
    }
    if (req.body.deviceId) {
      const sessions = readSessions();
      const session = sessions.find(s => s.deviceId === req.body.deviceId);
      if (session) return session.userId;
    }
  }

  // 5. Query params
  if (req.query) {
    if (req.query.token) {
      const sessions = readSessions();
      const session = sessions.find(s => s.token === req.query.token);
      if (session) return session.userId;
    }
    if (req.query.userId) {
      const users = readUsers();
      if (users.some(u => u.id === req.query.userId)) {
        return req.query.userId as string;
      }
    }
    if (req.query.deviceId) {
      const sessions = readSessions();
      const session = sessions.find(s => s.deviceId === req.query.deviceId);
      if (session) return session.userId;
    }
  }

  // 6. x-device-id header
  const deviceIdHeader = req.headers["x-device-id"] as string;
  if (deviceIdHeader) {
    const sessions = readSessions();
    const session = sessions.find(s => s.deviceId === deviceIdHeader);
    if (session) return session.userId;
  }

  // 7. Default to primary user
  const users = readUsers();
  return users.length > 0 ? users[0].id : "usr-1";
}

// State storage utilities per-user
function readState(userId?: string): AppState {
  const targetId = userId || "usr-1";
  const userFile = getUserDbFile(targetId);

  try {
    if (fs.existsSync(userFile)) {
      const content = fs.readFileSync(userFile, "utf-8");
      const state = JSON.parse(content);
      if (!state.tasks) state.tasks = [];
      if (!state.prayers) state.prayers = [];
      if (!state.habits) state.habits = [];
      if (!state.ledger) state.ledger = [];
      if (!state.businessProfiles) state.businessProfiles = [];
      if (!state.teamMembers) state.teamMembers = [];
      if (!state.pendingInvoices) state.pendingInvoices = [];
      if (!state.knowledgeBase) state.knowledgeBase = [];
      if (!state.linkedFolders) state.linkedFolders = [];
      if (state.quickNotes === undefined) state.quickNotes = "";
      if (!state.chatHistory) state.chatHistory = [];
      if (!state.settings) state.settings = { ...defaultState.settings };
      return state;
    }
  } catch (err) {
    console.error(`Error reading database file for user ${targetId}:`, err);
  }

  // If userFile doesn't exist, create fresh dedicated database
  const users = readUsers();
  const user = users.find(u => u.id === targetId);
  const fresh = createFreshUserDatabase(user || {
    id: targetId,
    email: `${targetId}@celouse.io`,
    passwordHash: "",
    name: "User",
    role: "Clinical Operator",
    avatar: "",
    createdAt: new Date().toISOString()
  });
  writeState(targetId, fresh);
  return fresh;
}

function writeState(userId: string, state: AppState) {
  const targetId = userId || "usr-1";
  const userFile = getUserDbFile(targetId);
  try {
    fs.writeFileSync(userFile, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error(`Error writing database for user ${targetId}:`, err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Middleware to catch body parser / payload errors and always return JSON
  app.use((err: any, req: any, res: any, next: any) => {
    if (err) {
      console.error("Express middleware error:", err);
      return res.status(err.status || 400).json({
        success: false,
        error: err.message || "Request parsing failed"
      });
    }
    next();
  });

  // API Auth Route - Verify Device & Token Session
  app.post("/api/auth/verify", (req, res) => {
    const { deviceId, token } = req.body;
    if (!deviceId || !token) {
      return res.json({ valid: false });
    }
    const sessions = readSessions();
    const session = sessions.find(s => s.deviceId === deviceId && s.token === token);
    if (!session) {
      return res.json({ valid: false });
    }
    const users = readUsers();
    const user = users.find(u => u.id === session.userId);
    if (!user) {
      return res.json({ valid: false });
    }
    session.lastActive = new Date().toISOString();
    writeSessions(sessions);

    res.json({
      valid: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isLoggedIn: true,
        createdAt: user.createdAt
      }
    });
  });

  // API Auth Route - Email & Password Login
  app.post("/api/auth/login", (req, res) => {
    const { email, password, deviceId, deviceName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }
    const users = readUsers();
    const cleanEmail = email.trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(401).json({ success: false, error: "No account found with this email. Please sign up." });
    }

    if (user.passwordHash !== password.trim()) {
      return res.status(401).json({ success: false, error: "Incorrect password. Please verify your credentials." });
    }

    const token = "session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
    const sessions = readSessions();
    const filteredSessions = sessions.filter(s => s.deviceId !== deviceId);
    filteredSessions.push({
      token,
      userId: user.id,
      deviceId: deviceId || "dev-" + Date.now(),
      deviceName: deviceName || "Unknown Device",
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    });
    writeSessions(filteredSessions);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isLoggedIn: true,
        createdAt: user.createdAt
      }
    });
  });

  // API Auth Route - Account Registration
  app.post("/api/auth/register", (req, res) => {
    const { email, password, name, avatar, role, deviceId, deviceName } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: "Name, email, and password are required." });
    }
    const users = readUsers();
    const cleanEmail = email.trim().toLowerCase();

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({ success: false, error: "An account with this email address already exists. Please log in." });
    }

    if (password.trim().length < 4) {
      return res.status(400).json({ success: false, error: "Password must be at least 4 characters long." });
    }

    const newUser: StoredUser = {
      id: "usr-" + Date.now(),
      email: cleanEmail,
      passwordHash: password.trim(),
      name: name.trim(),
      role: role ? role.trim() : "Clinical Operator",
      avatar: avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces",
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeUsers(users);

    // Explicitly provision a brand new, isolated database for this newly registered user!
    const newUserDb = createFreshUserDatabase(newUser);
    writeState(newUser.id, newUserDb);
    console.log(`[Database Provisioning] New isolated database created at ${getUserDbFile(newUser.id)} for ${newUser.email}`);

    const token = "session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
    const sessions = readSessions();
    const filteredSessions = sessions.filter(s => s.deviceId !== deviceId);
    filteredSessions.push({
      token,
      userId: newUser.id,
      deviceId: deviceId || "dev-" + Date.now(),
      deviceName: deviceName || "Unknown Device",
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    });
    writeSessions(filteredSessions);

    res.json({
      success: true,
      token,
      database: {
        id: `db_${newUser.id}`,
        file: `${newUser.id}.json`,
        status: "isolated_provisioned"
      },
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar,
        isLoggedIn: true,
        createdAt: newUser.createdAt
      }
    });
  });

  // API Route - Get active database status & info
  app.get("/api/database/info", (req, res) => {
    const userId = resolveUserIdFromRequest(req);
    const users = readUsers();
    const user = users.find(u => u.id === userId);
    const userFile = getUserDbFile(userId);
    const exists = fs.existsSync(userFile);
    let fileSize = 0;
    if (exists) {
      fileSize = fs.statSync(userFile).size;
    }
    res.json({
      databaseId: `db_${userId}`,
      userId,
      userEmail: user ? user.email : "unknown",
      userName: user ? user.name : "Operator",
      databaseFile: `${userId}.json`,
      exists,
      sizeBytes: fileSize,
      isolationMode: "per_user_isolated"
    });
  });

  // API Auth Route - Logout
  app.post("/api/auth/logout", (req, res) => {
    const { deviceId } = req.body;
    if (deviceId) {
      const sessions = readSessions().filter(s => s.deviceId !== deviceId);
      writeSessions(sessions);
    }
    res.json({ success: true });
  });

  // API Auth Route - Update Profile
  app.post("/api/auth/update-profile", (req, res) => {
    const { deviceId, token, userId, name, avatar, role, email, newPassword } = req.body;
    const users = readUsers();
    let user: StoredUser | undefined;

    if (deviceId && token) {
      const sessions = readSessions();
      const session = sessions.find(s => s.deviceId === deviceId && s.token === token);
      if (session) {
        user = users.find(u => u.id === session.userId);
      }
    }

    if (!user && userId) {
      user = users.find(u => u.id === userId);
    }

    if (!user && email) {
      const cleanEmail = email.trim().toLowerCase();
      user = users.find(u => u.email.toLowerCase() === cleanEmail);
    }

    if (!user && users.length > 0) {
      user = users[0]; // fallback to primary operator
    }

    if (!user) {
      return res.status(404).json({ success: false, error: "User account not found" });
    }

    if (name && name.trim()) user.name = name.trim();
    if (avatar) user.avatar = avatar;
    if (role && role.trim()) user.role = role.trim();
    if (email && email.trim()) user.email = email.trim().toLowerCase();
    if (newPassword && newPassword.trim().length >= 4) {
      user.passwordHash = newPassword.trim();
    }

    writeUsers(users);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isLoggedIn: true,
        createdAt: user.createdAt
      }
    });
  });

  // API Route - Get current state for authenticated user
  app.get("/api/state", (req, res) => {
    const userId = resolveUserIdFromRequest(req);
    const state = readState(userId);
    // Sync environment variables with state settings
    state.settings.geminiApiKey = process.env.GEMINI_API_KEY || state.settings.geminiApiKey || "";
    res.json(state);
  });

  // API Route - Update tasks
  app.post("/api/tasks", (req, res) => {
    const userId = resolveUserIdFromRequest(req);
    const state = readState(userId);
    const { action, task } = req.body;

    if (action === "add") {
      const newTask: Task = {
        id: "task-" + Date.now(),
        title: task.title || "Untitled Task",
        subtitle: task.subtitle || "",
        workspace: task.workspace || "Personal",
        time: task.time || "Anytime",
        dueDate: task.dueDate || new Date().toISOString().split("T")[0],
        urgent: !!task.urgent,
        completed: false,
        assignee: task.assignee || "Self"
      };
      state.tasks.push(newTask);
    } else if (action === "toggle") {
      const t = state.tasks.find(x => x.id === task.id);
      if (t) {
        t.completed = !t.completed;
      }
    } else if (action === "edit") {
      const idx = state.tasks.findIndex(x => x.id === task.id);
      if (idx !== -1) {
        state.tasks[idx] = { ...state.tasks[idx], ...task };
      }
    } else if (action === "delete") {
      state.tasks = state.tasks.filter(x => x.id !== task.id);
    }

    writeState(userId, state);
    res.json({ success: true, tasks: state.tasks });
  });

  // API Route - Toggle prayer status
  app.post("/api/prayers", (req, res) => {
    const userId = resolveUserIdFromRequest(req);
    const state = readState(userId);
    const { prayerId, completed } = req.body;
    const p = state.prayers.find(x => x.id === prayerId);
    if (p) {
      p.completed = completed;
      p.status = completed ? "checked" : (prayerId === "prayer-asr" ? "active" : "upcoming");
    }
    writeState(userId, state);
    res.json({ success: true, prayers: state.prayers });
  });

  // API Route - Toggle/Complete Habit
  app.post("/api/habits", (req, res) => {
    const userId = resolveUserIdFromRequest(req);
    const state = readState(userId);
    const { habitId, completed } = req.body;
    const h = state.habits.find(x => x.id === habitId);
    if (h) {
      h.completed = completed;
    }
    writeState(userId, state);
    res.json({ success: true, habits: state.habits });
  });

  // API Route - Update Quick Notes
  app.post("/api/quicknotes", (req, res) => {
    const userId = resolveUserIdFromRequest(req);
    const { quickNotes } = req.body;
    const state = readState(userId);
    state.quickNotes = quickNotes !== undefined ? quickNotes : "";
    writeState(userId, state);
    res.json({ success: true, quickNotes: state.quickNotes });
  });

  // API Route - Update Settings
  app.post("/api/settings", (req, res) => {
    const userId = resolveUserIdFromRequest(req);
    const state = readState(userId);
    state.settings = { ...state.settings, ...req.body };
    writeState(userId, state);
    res.json({ success: true, settings: state.settings });
  });

  // API Route - Add/Edit/Delete Business Profile
  app.post("/api/business", (req, res) => {
    const userId = resolveUserIdFromRequest(req);
    const state = readState(userId);
    const { action, id, name, currency } = req.body;

    if (action === "edit") {
      const p = state.businessProfiles.find(x => x.id === id);
      if (p) {
        if (name) p.name = name;
        p.currency = "BDT";
      }
    } else if (action === "delete") {
      state.businessProfiles = state.businessProfiles.filter(x => x.id !== id);
    } else {
      // Default / Add behavior
      const profName = name || req.body.name;
      if (profName) {
        state.businessProfiles.push({
          id: "b-" + Date.now(),
          name: profName,
          currency: "BDT"
        });
      }
    }
    writeState(userId, state);
    res.json({ success: true, businessProfiles: state.businessProfiles });
  });

  // API Route - Team Management (Add/Edit/Delete)
  app.post("/api/team", (req, res) => {
    const userId = resolveUserIdFromRequest(req);
    const state = readState(userId);
    const { action, id, name, phone, email, location, role } = req.body;

    if (action === "add") {
      state.teamMembers.push({
        id: "tm-" + Date.now(),
        name: name || "New Member",
        phone: phone || "",
        email: email || "",
        location: location || "",
        role: role || "Operator"
      });
    } else if (action === "edit") {
      const tm = state.teamMembers.find(x => x.id === id);
      if (tm) {
        if (name !== undefined) tm.name = name;
        if (phone !== undefined) tm.phone = phone;
        if (email !== undefined) tm.email = email;
        if (location !== undefined) tm.location = location;
        if (role !== undefined) tm.role = role;
      }
    } else if (action === "delete") {
      state.teamMembers = state.teamMembers.filter(x => x.id !== id);
    }
    writeState(userId, state);
    res.json({ success: true, teamMembers: state.teamMembers });
  });

  // API Route - Pending Invoices Management (Add/Edit/Delete/Pay)
  app.post("/api/invoices", (req, res) => {
    const userId = resolveUserIdFromRequest(req);
    const state = readState(userId);
    const { action, id, client, project, amount, dueDate, status, workspace, type } = req.body;

    if (action === "add") {
       state.pendingInvoices.push({
         id: "inv-" + Date.now(),
         client: client || "Client",
         project: project || "Project",
         amount: Number(amount) || 0,
         dueDate: dueDate || new Date().toISOString().split("T")[0],
         status: status || "pending",
         workspace: workspace || "Personal",
         type: type || "income"
       });
    } else if (action === "edit") {
       const inv = state.pendingInvoices.find(x => x.id === id);
       if (inv) {
         if (client !== undefined) inv.client = client;
         if (project !== undefined) inv.project = project;
         if (amount !== undefined) inv.amount = Number(amount);
         if (dueDate !== undefined) inv.dueDate = dueDate;
         if (status !== undefined) inv.status = status;
         if (workspace !== undefined) inv.workspace = workspace;
         if (type !== undefined) inv.type = type;
       }
    } else if (action === "delete") {
       state.pendingInvoices = state.pendingInvoices.filter(x => x.id !== id);
    } else if (action === "pay") {
       // Mark as paid and add to ledger automatically!
       const inv = state.pendingInvoices.find(x => x.id === id);
       if (inv) {
         inv.status = "paid";
         const invType = inv.type || "income";
         // Create matching ledger entry
         state.ledger.push({
           id: "led-" + Date.now(),
           type: invType,
           amount: inv.amount,
           workspace: (inv.workspace || "Personal") as any,
           description: invType === "expense" ? `Bill payment: ${inv.client} - ${inv.project}` : `Invoice collection: ${inv.client} - ${inv.project}`,
           date: new Date().toISOString().split("T")[0]
         });
         state.pendingInvoices = state.pendingInvoices.filter(x => x.id !== id);
       }
    }
    writeState(userId, state);
    res.json({ success: true, pendingInvoices: state.pendingInvoices, ledger: state.ledger });
  });

  // API Route - Add Ledger Entry
  app.post("/api/ledger", (req, res) => {
    const userId = resolveUserIdFromRequest(req);
    const state = readState(userId);
    const { type, amount, workspace, description, date } = req.body;
    if (amount) {
      const newEntry: LedgerEntry = {
        id: "led-" + Date.now(),
        type: type || "expense",
        amount: Number(amount),
        workspace: workspace || "Personal",
        description: description || "No description",
        date: date || new Date().toISOString().split("T")[0]
      };
      state.ledger.push(newEntry);
      writeState(userId, state);
    }
    res.json({ success: true, ledger: state.ledger });
  });

  // API Route - Delete Ledger Entry
  app.post("/api/ledger/delete", (req, res) => {
    const userId = resolveUserIdFromRequest(req);
    const state = readState(userId);
    const { id } = req.body;
    if (id) {
      state.ledger = state.ledger.filter(item => item.id !== id);
      writeState(userId, state);
    }
    res.json({ success: true, ledger: state.ledger });
  });

  // API Route - Sync Knowledge Base
  app.post("/api/kb/sync", (req, res) => {
    const userId = resolveUserIdFromRequest(req);
    const state = readState(userId);
    state.settings.lastSyncTime = "Just now";
    state.settings.totalIndexedFiles = Math.floor(state.settings.totalIndexedFiles * 1.05 + 5);
    writeState(userId, state);
    res.json({ success: true, settings: state.settings });
  });

  // API Route - Manage Linked Google Drive Folders
  app.post("/api/drive/folders", (req, res) => {
    const userId = resolveUserIdFromRequest(req);
    const state = readState(userId);
    const { action, id, name, link } = req.body;

    if (!state.linkedFolders) {
      state.linkedFolders = [];
    }

    if (action === "add") {
      const folderId = id || "folder-" + Date.now();
      // Avoid duplicate folder linking
      if (!state.linkedFolders.some(f => f.id === folderId)) {
        state.linkedFolders.push({
          id: folderId,
          name: name || "Google Drive Folder",
          link: link || "",
          linkedAt: new Date().toISOString().split("T")[0]
        });
      }
    } else if (action === "delete") {
      state.linkedFolders = state.linkedFolders.filter(f => f.id !== id);
    } else if (action === "update") {
      const folder = state.linkedFolders.find(f => f.id === id);
      if (folder) {
        if (name !== undefined) folder.name = name;
        if (link !== undefined) folder.link = link;
      }
    }

    writeState(userId, state);
    res.json({ success: true, linkedFolders: state.linkedFolders });
  });

  // API Route - Search Knowledge Base
  app.post("/api/kb/query", async (req, res) => {
    const userId = resolveUserIdFromRequest(req);
    const { query } = req.body;
    const ai = getGeminiClient();
    const state = readState(userId);

    if (!ai) {
      // High fidelity mock local response based on active documents
      const docsContext = state.knowledgeBase.map(d => `${d.title} (${d.source}): ${d.docCount} docs`).join(", ");
      res.json({
        answer: `[Simulation Mode - Gemini Key Missing] Grounding query in local indices: ${docsContext}.\n\nBased on indexed documents matching "${query || 'all'}", found relevant records in Artbit Studio and Axen Valley workspace specifications detailing financial and workflow preferences.`
      });
      return;
    }

    try {
      const docsContext = state.knowledgeBase.map(d => `- Name: ${d.title}, Data Sources: ${d.source}, Count: ${d.docCount} records`).join("\n");
      const systemPrompt = `You are a high-precision Clinical AI Assistant running inside the Clinical Intelligence Hub.
Your user is querying the indexed Knowledge Base documents. Here is the active context:
${docsContext}

Provide a concise, precise, professional response summarizing the relevant context. Address the user's query: "${query}"`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: query || "What documents are indexed?",
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.3
        }
      });

      res.json({ answer: response.text });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Gemini API Call Failed" });
    }
  });

  // Cached quote storage
  let cachedQuote: { quote: string; author: string; date: string } | null = null;

  // API Route - Get Daily Inspiring Quote by Gemini
  app.get("/api/quote", async (req, res) => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (cachedQuote && cachedQuote.date === todayStr) {
      return res.json(cachedQuote);
    }

    const ai = getGeminiClient();
    if (!ai) {
      const fallback = {
        quote: "Precision, discipline, and vision are the keystones of continuous transformation.",
        author: "Gemini Core (Simulated)",
        date: todayStr
      };
      cachedQuote = fallback;
      return res.json(fallback);
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: "Provide a highly inspiring, unique, short professional quote for a business and productivity dashboard. Keep it under 15 words. Return ONLY a JSON object of the form: {\"quote\": \"...\", \"author\": \"...\"}",
        config: {
          responseMimeType: "application/json"
        }
      });
      const parsed = JSON.parse(response.text || "{}");
      const result = {
        quote: parsed.quote || "The only way to do great work is to love what you do.",
        author: parsed.author || "Steve Jobs",
        date: todayStr
      };
      cachedQuote = result;
      res.json(result);
    } catch (err) {
      const fallback = {
        quote: "Build your own dreams, or someone else will hire you to build theirs.",
        author: "Farrah Gray",
        date: todayStr
      };
      res.json(fallback);
    }
  });

  // Helper to parse JSON actions from assistant text and apply them
  function parseAndApplyAssistantActions(text: string, appState: AppState): boolean {
    try {
      const jsonRegex = /```json\s*([\s\S]*?)\s*```/g;
      let match;
      let modified = false;
      while ((match = jsonRegex.exec(text)) !== null) {
        try {
          const actionData = JSON.parse(match[1].trim());
          if (actionData && actionData.action) {
            const action = actionData.action;
            if (action === "create_task" && actionData.task) {
              const newTask: Task = {
                id: "task-" + Date.now() + Math.floor(Math.random() * 1000),
                title: actionData.task.title || "Untitled Task",
                subtitle: actionData.task.subtitle || "",
                workspace: actionData.task.workspace || "Personal",
                time: actionData.task.time || "Anytime",
                dueDate: actionData.task.dueDate || new Date().toISOString().split("T")[0],
                urgent: !!actionData.task.urgent,
                completed: !!actionData.task.completed,
                assignee: actionData.task.assignee || "Self"
              };
              appState.tasks.push(newTask);
              modified = true;
            } else if (action === "delete_task" && actionData.id) {
              appState.tasks = appState.tasks.filter(x => x.id !== actionData.id);
              modified = true;
            } else if (action === "edit_task" && actionData.task && actionData.task.id) {
              const idx = appState.tasks.findIndex(x => x.id === actionData.task.id);
              if (idx !== -1) {
                appState.tasks[idx] = { ...appState.tasks[idx], ...actionData.task };
                modified = true;
              }
            } else if (action === "toggle_task" && actionData.id) {
              const t = appState.tasks.find(x => x.id === actionData.id);
              if (t) {
                t.completed = !t.completed;
                modified = true;
              }
            } else if (action === "create_invoice" && actionData.invoice) {
              const newInv = {
                id: "inv-" + Date.now() + Math.floor(Math.random() * 1000),
                client: actionData.invoice.client || "Client",
                project: actionData.invoice.project || "Project",
                amount: Number(actionData.invoice.amount) || 0,
                dueDate: actionData.invoice.dueDate || new Date().toISOString().split("T")[0],
                status: actionData.invoice.status || "pending",
                workspace: actionData.invoice.workspace || "Personal",
                type: actionData.invoice.type || "income"
              };
              appState.pendingInvoices.push(newInv);
              modified = true;
            } else if (action === "delete_invoice" && actionData.id) {
              appState.pendingInvoices = appState.pendingInvoices.filter(x => x.id !== actionData.id);
              modified = true;
            } else if (action === "pay_invoice" && actionData.id) {
              const inv = appState.pendingInvoices.find(x => x.id === actionData.id);
              if (inv) {
                inv.status = "paid";
                const invType = inv.type || "income";
                appState.ledger.push({
                  id: "led-" + Date.now(),
                  type: invType,
                  amount: inv.amount,
                  workspace: (inv.workspace || "Personal") as any,
                  description: invType === "expense" ? `Bill payment: ${inv.client} - ${inv.project}` : `Invoice collection: ${inv.client} - ${inv.project}`,
                  date: new Date().toISOString().split("T")[0]
                });
                appState.pendingInvoices = appState.pendingInvoices.filter(x => x.id !== actionData.id);
                modified = true;
              }
            }
          }
        } catch (e) {
          console.error("Error parsing action block:", e);
        }
      }
      return modified;
    } catch (err) {
      console.error("Error running parseAndApplyAssistantActions:", err);
      return false;
    }
  }

  // API Route - Chat with Gemini Core Assistant
  app.post("/api/chat", async (req, res) => {
    const userId = resolveUserIdFromRequest(req);
    const { message, activePins } = req.body;
    const state = readState(userId);
    
    // Add User Message to History
    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      sender: "user",
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    state.chatHistory.push(userMsg);

    const ai = getGeminiClient();
    
    if (!ai) {
      // High fidelity Simulated Core responses with Task mutation capability if API Key is not set up yet
      setTimeout(() => {
        let text = "";
        const lower = message.toLowerCase();
        
        if (lower.includes("create task") || lower.includes("add task") || lower.includes("create a task") || lower.includes("add a task")) {
          let title = "Review Core Documents";
          const match = message.match(/(?:task to|task|add) (.*?)(?:$|for|at|in|with)/i);
          if (match && match[1]) {
            title = match[1].charAt(0).toUpperCase() + match[1].slice(1).trim();
          }
          const tempId = "task-" + Date.now();
          const today = new Date().toISOString().split("T")[0];
          text = `Understood. I have initiated the creation protocol for the task: **"${title}"** inside the **Internal** workspace.\n\nHere are the details configured:\n- Title: ${title}\n- Workspace: Internal\n- Assignee: Self\n- Due Date: ${today}\n\n\`\`\`json\n{\n  "action": "create_task",\n  "task": {\n    "title": "${title}",\n    "subtitle": "Created automatically via AI Core Assistant request",\n    "workspace": "Internal",\n    "time": "Anytime",\n    "dueDate": "${today}",\n    "urgent": false,\n    "completed": false,\n    "assignee": "Self"\n  }\n}\n\`\`\``;
        } else if (lower.includes("remove task") || lower.includes("delete task") || lower.includes("cancel task")) {
          let foundTask = state.tasks[0];
          const idMatch = message.match(/task-\d+/i);
          if (idMatch) {
            foundTask = state.tasks.find(t => t.id === idMatch[0]) || foundTask;
          }
          if (foundTask) {
            text = `Understood. I have removed the task: **"${foundTask.title}"** (ID: ${foundTask.id}) from the active database registers.\n\n\`\`\`json\n{\n  "action": "delete_task",\n  "id": "${foundTask.id}"\n}\n\`\`\``;
          } else {
            text = "I couldn't locate any tasks matching that identifier in the active registry database.";
          }
        } else if (lower.includes("edit task") || lower.includes("update task") || lower.includes("modify task")) {
          let foundTask = state.tasks[0];
          const idMatch = message.match(/task-\d+/i);
          if (idMatch) {
            foundTask = state.tasks.find(t => t.id === idMatch[0]) || foundTask;
          }
          if (foundTask) {
            text = `Understood. I have updated the task: **"${foundTask.title}"** in the active registry database.\n\n\`\`\`json\n{\n  "action": "edit_task",\n  "task": {\n    "id": "${foundTask.id}",\n    "title": "UPDATED: ${foundTask.title}",\n    "urgent": true\n  }\n}\n\`\`\``;
          } else {
            text = "I couldn't locate any tasks matching that identifier to update.";
          }
        } else if (lower.includes("toggle task") || lower.includes("complete task") || lower.includes("check task")) {
          let foundTask = state.tasks.find(t => !t.completed) || state.tasks[0];
          const idMatch = message.match(/task-\d+/i);
          if (idMatch) {
            foundTask = state.tasks.find(t => t.id === idMatch[0]) || foundTask;
          }
          if (foundTask) {
            text = `Understood. I have marked the task: **"${foundTask.title}"** (ID: ${foundTask.id}) completion status.\n\n\`\`\`json\n{\n  "action": "toggle_task",\n  "id": "${foundTask.id}"\n}\n\`\`\``;
          } else {
            text = "No pending tasks found to toggle.";
          }
        } else if (lower.includes("create invoice") || lower.includes("add invoice") || lower.includes("create an invoice") || lower.includes("add an invoice")) {
          let client = "Acme Corp";
          let amount = 12000;
          let project = "Consulting Services";
          let workspace = "Artbit";
          
          const match = message.match(/(?:invoice for|invoice to) (.*?)(?:$|for|at|in|with|of|amount)/i);
          if (match && match[1]) {
            client = match[1].charAt(0).toUpperCase() + match[1].slice(1).trim();
          }
          const amtMatch = message.match(/(?:amount|of|৳|bdt)\s*(\d+)/i);
          if (amtMatch && amtMatch[1]) {
            amount = Number(amtMatch[1]);
          }
          const bizMatch = message.match(/(?:workspace|business|for)\s*(Artbit|Axen|Biggan|Personal)/i);
          if (bizMatch && bizMatch[1]) {
            workspace = bizMatch[1];
          }

          const today = new Date().toISOString().split("T")[0];
          text = `Understood! I have registered a new pending invoice for **"${client}"** of **৳${amount.toLocaleString()}** under the **${workspace}** workspace.\n\nHere are the details configured:\n- Client: ${client}\n- Project: ${project}\n- Workspace: ${workspace}\n- Amount: ৳${amount}\n- Due Date: ${today}\n\n\`\`\`json\n{\n  "action": "create_invoice",\n  "invoice": {\n    "client": "${client}",\n    "project": "${project}",\n    "amount": ${amount},\n    "dueDate": "${today}",\n    "workspace": "${workspace}"\n  }\n}\n\`\`\``;
        } else if (lower.includes("pay invoice") || lower.includes("collect invoice") || lower.includes("settle invoice")) {
          let foundInv = state.pendingInvoices[0];
          const idMatch = message.match(/inv-\d+/i);
          if (idMatch) {
            foundInv = state.pendingInvoices.find(i => i.id === idMatch[0]) || foundInv;
          }
          if (foundInv) {
            text = `Understood. Processing payment for pending invoice **${foundInv.id}** issued to **${foundInv.client}** (৳${foundInv.amount.toLocaleString()}).\nI've marked the invoice as paid and automatically added a matching income transaction to the Financial Ledger under workspace: **${foundInv.workspace || "Personal"}**.\n\n\`\`\`json\n{\n  "action": "pay_invoice",\n  "id": "${foundInv.id}"\n}\n\`\`\``;
          } else {
            text = "I couldn't locate any pending invoices to pay in the database.";
          }
        } else if (lower.includes("delete invoice") || lower.includes("remove invoice") || lower.includes("cancel invoice")) {
          let foundInv = state.pendingInvoices[0];
          const idMatch = message.match(/inv-\d+/i);
          if (idMatch) {
            foundInv = state.pendingInvoices.find(i => i.id === idMatch[0]) || foundInv;
          }
          if (foundInv) {
            text = `Understood. I have deleted the pending invoice **${foundInv.id}** from the active database records.\n\n\`\`\`json\n{\n  "action": "delete_invoice",\n  "id": "${foundInv.id}"\n}\n\`\`\``;
          } else {
            text = "No pending invoices found matching that identifier to remove.";
          }
        } else if (lower.includes("financial") || lower.includes("projection") || lower.includes("ledger")) {
          const invSum = state.pendingInvoices.reduce((acc, cur) => acc + cur.amount, 0);
          text = `Accessing Financial Ledger records and Pending Invoices... Done.\n\nHere is your financial status overview:\n- Net Balance sum: ৳${state.ledger.reduce((acc, cur) => acc + (cur.type === "income" ? cur.amount : -cur.amount), 0)}\n- Pending Receivables (Invoices): ৳${invSum.toLocaleString()}\n- Workspace distribution: Artbit, Axen, Biggan, Personal.\n\nWould you like me to register any new ledger entries or pending invoices for you?`;
        } else if (lower.includes("task") || lower.includes("velocity") || lower.includes("polish")) {
          text = "Analyzing task completion lists... Active tracking shows 4 URGENT items today. The primary blocker is 'V3 Interface Polish' (Workspace: Artbit). Task velocity in Axen is solid with 2/3 completed. I recommend clearing 'Review Q3 Financial Projections with Board' next.";
        } else if (lower.includes("prayer") || lower.includes("spiritual") || lower.includes("fajr") || lower.includes("asr")) {
          text = "Your Spiritual Pulse is currently at 2/5 completed today. Fajr and Dhuhr have been logged as On-Time. You are inside the Active Window for Asr (03:45 PM). Would you like to log Asr as complete now?";
        } else {
          text = `I have received your request: "${message}". Pinned context: [${(activePins || []).join(", ") || "None"}]. System is operating in clinical simulation mode. Please configure your actual Gemini API Key in Settings to enable real-time generative capabilities. Let me know how I should update your ledger or tasks!`;
        }

        const botMsg: ChatMessage = {
          id: "assistant-" + Date.now(),
          sender: "assistant",
          text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        state.chatHistory.push(botMsg);
        
        // Apply local mutations from simulator text block
        parseAndApplyAssistantActions(text, state);
        
        writeState(userId, state);
        res.json({ messages: state.chatHistory, state });
      }, 1000);
      return;
    }

    try {
      // Build systemic context of current assistant data to ground the model
      const tasksStr = state.tasks.map(t => `- [${t.workspace}] ${t.title} (${t.completed ? "Done" : "Pending"}, ${t.time || "Anytime"}, ID: ${t.id})`).join("\n");
      const prayersStr = state.prayers.map(p => `- ${p.name}: ${p.time} (${p.status})`).join("\n");
      const habitsStr = state.habits.map(h => `- ${h.title}: ${h.category} (${h.completed ? "Done" : "Pending"})`).join("\n");
      const ledgerSum = state.ledger.reduce((acc, cur) => acc + (cur.type === "income" ? cur.amount : -cur.amount), 0);
      const ledgerStr = state.ledger.map(l => `- [${l.workspace}] ${l.type === "income" ? "+" : "-"}৳${l.amount}: ${l.description}`).join("\n");
      const invoicesStr = state.pendingInvoices.map(inv => `- [${inv.workspace || "Personal"}] ${inv.client} - ${inv.project}: ৳${inv.amount} (Status: ${inv.status}, Due: ${inv.dueDate}, ID: ${inv.id})`).join("\n");

      const systemPrompt = `You are "Gemini Core", a hyper-efficient, clinical, state-of-the-art AI Assistant running inside the user's Business Hub and Clinical Intelligence system.
You have absolute access to the user's active database:
1. Tasks:
${tasksStr}

2. Spiritual Pulse (Islamic Prayers):
${prayersStr}

3. Habits:
${habitsStr}

4. Ledger (Net Balance sum: ৳${ledgerSum}):
${ledgerStr}

5. Pending Invoices:
${invoicesStr}

Active Pinned context chips: [${(activePins || []).join(", ")}]

Provide highly concise, precise, factual, helpful, and beautifully styled markdown answers. Avoid fluffy intros. Address the user's specific workflow instruction immediately and directly.

CRITICAL INSTRUCTION FOR TASK MUTATION:
If the user asks you to create, edit, toggle, or delete/remove a task, you MUST execute that operation by writing a valid JSON block inside a \`\`\`json markdown block at the very end of your response text.
Here are the exact formats you MUST use:

- To CREATE a task:
\`\`\`json
{
  "action": "create_task",
  "task": {
    "title": "Task title",
    "subtitle": "Task description",
    "workspace": "Personal" | "Artbit" | "Axen" | "Biggan" | "Internal",
    "time": "10:00 AM" | "Anytime" | "3:00 PM" | etc,
    "dueDate": "YYYY-MM-DD",
    "urgent": true | false,
    "assignee": "Self" | "Tasnim" | "JD" | etc
  }
}
\`\`\`

- To DELETE/REMOVE a task:
\`\`\`json
{
  "action": "delete_task",
  "id": "task-id"
}
\`\`\`

- To EDIT/UPDATE a task:
\`\`\`json
{
  "action": "edit_task",
  "task": {
    "id": "task-id",
    "title": "New Title" (optional),
    "subtitle": "New description" (optional),
    "workspace": "Personal" | "Artbit" | "Axen" | "Biggan" | "Internal" (optional),
    "time": "Anytime" | etc (optional),
    "urgent": true | false (optional),
    "completed": true | false (optional),
    "assignee": "..." (optional)
  }
}
\`\`\`

- To TOGGLE COMPLETION of a task:
\`\`\`json
{
  "action": "toggle_task",
  "id": "task-id"
}
\`\`\`

- To CREATE/ADD a pending invoice or bill:
\`\`\`json
{
  "action": "create_invoice",
  "invoice": {
    "client": "Client or Vendor Name",
    "project": "Project/Bill description",
    "amount": number_amount_value,
    "dueDate": "YYYY-MM-DD",
    "workspace": "Personal" | "Artbit" | "Axen" | "Biggan",
    "type": "income" | "expense"
  }
}
\`\`\`

- To DELETE/REMOVE a pending invoice:
\`\`\`json
{
  "action": "delete_invoice",
  "id": "invoice-id"
}
\`\`\`

- To PAY/SETTLE a pending invoice or bill (which automatically registers an income or expense entry in the financial ledger matching the invoice's workspace, amount, and type):
\`\`\`json
{
  "action": "pay_invoice",
  "id": "invoice-id"
}
\`\`\`

Do not output anything after the JSON block. Explain your actions to the user in the main body of your text.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: message,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.2
        }
      });

      const responseText = response.text || "";

      const botMsg: ChatMessage = {
        id: "assistant-" + Date.now(),
        sender: "assistant",
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      state.chatHistory.push(botMsg);
      
      // Parse any assistant actions and mutate state
      parseAndApplyAssistantActions(responseText, state);
      
      writeState(userId, state);
      res.json({ messages: state.chatHistory, state });
    } catch (err: any) {
      console.error("Gemini Assistant error:", err);
      const botMsg: ChatMessage = {
        id: "assistant-error-" + Date.now(),
        sender: "assistant",
        text: `Error invoking Gemini model: ${err.message || "Unknown error"}. Operating in local fallback context.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      state.chatHistory.push(botMsg);
      writeState(userId, state);
      res.json({ messages: state.chatHistory, state });
    }
  });

  // Clear chat history
  app.post("/api/chat/clear", (req, res) => {
    const userId = resolveUserIdFromRequest(req);
    const state = readState(userId);
    const users = readUsers();
    const user = users.find(u => u.id === userId);
    const userName = user ? user.name : "Operator";
    state.chatHistory = [
      {
        id: "c-1",
        sender: "assistant",
        text: `System initialization complete. Local database indexed for ${userName}. How can I assist with your workflow today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    writeState(userId, state);
    res.json({ success: true, messages: state.chatHistory });
  });

  // Integrate Vite Dev Server Middleware or Serve Built Static Assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Clinical Intelligence Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
