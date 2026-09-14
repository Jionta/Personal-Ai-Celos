export interface UserAccount {
  id: string;
  name: string;
  avatar: string;
  email?: string;
  role?: string;
  isLoggedIn: boolean;
  createdAt?: string;
}

export interface Task {
  id: string;
  title: string;
  subtitle: string;
  workspace: 'Artbit' | 'Axen' | 'Biggan' | 'Personal' | 'Internal';
  time?: string;
  urgent: boolean;
  completed: boolean;
  assignee: string;
  assigneeAvatar?: string;
  dueDate?: string;
}

export interface Prayer {
  id: string;
  name: string;
  time: string;
  status: 'checked' | 'active' | 'upcoming';
  completed: boolean;
}

export interface Habit {
  id: string;
  title: string;
  category: 'Daily' | 'Mandatory' | 'Creation' | 'System';
  description: string;
  completed: boolean;
  logStatus?: string;
}

export interface LedgerEntry {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  workspace: 'Artbit' | 'Axen' | 'Biggan' | 'Personal';
  description: string;
  date: string;
}

export interface BusinessProfile {
  id: string;
  name: string;
  currency: string;
}

export interface TeamMember {
  id: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  role: string;
}

export interface PendingInvoice {
  id: string;
  client: string;
  project: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  workspace?: string;
  type?: 'income' | 'expense';
}

export interface KnowledgeBaseDoc {
  id: string;
  title: string;
  source: string;
  docCount: number;
}

export interface LinkedFolder {
  id: string;
  name: string;
  linkedAt: string;
  link: string;
  filesCount?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isTyping?: boolean;
}

export interface AppState {
  tasks: Task[];
  prayers: Prayer[];
  habits: Habit[];
  ledger: LedgerEntry[];
  businessProfiles: BusinessProfile[];
  teamMembers: TeamMember[];
  pendingInvoices: PendingInvoice[];
  knowledgeBase: KnowledgeBaseDoc[];
  linkedFolders?: LinkedFolder[];
  settings: {
    geminiApiKey: string;
    longTermMemory: boolean;
    kbIndexingActive: boolean;
    baseCurrency: string;
    manualExchangeRate: string;
    autoDraftFollowups: boolean;
    defaultTaskView: 'Board' | 'List';
    notifications: boolean;
    darkMode: boolean;
    driveSyncEnabled: boolean;
    lastSyncTime: string;
    totalIndexedFiles: number;
  };
  chatHistory: ChatMessage[];
  quickNotes?: string;
}
