import {
  MaskResult,
  ScanAudit,
  SystemHealthStatus,
  PrivacyRiskAnalysis,
  User,
  MaskingStrategy,
} from '../types/index.ts';

const TOKEN_KEY = 'privyshield_auth_token';
const USER_KEY = 'privyshield_auth_user';
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredAuth = (token: string, user: User) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearStoredAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getStoredUser = (): User | null => {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return data;
}

export const api = {
  // System Health
  async getStatus(): Promise<SystemHealthStatus> {
    const res = await request<{ success: boolean; integrations: any; service: string; version: string; timestamp: string; uptimeSeconds: number; disclaimer: string }>(
      '/api/system/status'
    );
    return res as unknown as SystemHealthStatus;
  },

  async reconnectMongo(uri: string): Promise<{ success: boolean; status: any }> {
    return request('/api/system/database/reconnect', {
      method: 'POST',
      body: JSON.stringify({ uri }),
    });
  },

  async getApiDocs(): Promise<any> {
    return request('/api/system/docs');
  },

  // Masking Engine
  async maskText(payload: {
    text: string;
    title?: string;
    strategy?: MaskingStrategy;
    categoryOverrides?: Record<string, MaskingStrategy>;
    enabledCategories?: string[];
    customSalt?: string;
    saveAudit?: boolean;
  }): Promise<{ success: boolean; data: MaskResult }> {
    return request('/api/mask/text', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async maskDocument(formData: FormData): Promise<{ success: boolean; data: MaskResult }> {
    return request('/api/mask/document', {
      method: 'POST',
      body: formData,
    });
  },

  async getCatalog(): Promise<{ success: boolean; categories: any[]; strategies: any[] }> {
    return request('/api/mask/catalog');
  },

  // AI Privacy Engine
  async evaluateRisk(payload: {
    categoryCounts: Record<string, number>;
    totalEntities: number;
    textLength: number;
    inputType: string;
    currentStrategy: string;
    sampleSanitizedContext?: string;
  }): Promise<{ success: boolean; data: PrivacyRiskAnalysis }> {
    return request('/api/ai/evaluate-risk', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async chatAssistant(
    message: string,
    history: Array<{ role: 'user' | 'model'; text: string }> = []
  ): Promise<{ success: boolean; reply: string }> {
    return request('/api/ai/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    });
  },

  // Audit Logs & Statistics
  async getAudits(search?: string): Promise<{ success: boolean; count: number; audits: ScanAudit[] }> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return request(`/api/history/audits${query}`);
  },

  async getStats(): Promise<{ success: boolean; stats: any }> {
    return request('/api/history/stats');
  },

  async deleteAudit(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/history/audits/${id}`, {
      method: 'DELETE',
    });
  },

  // Policy Rules
  async getRules(): Promise<{ success: boolean; rules: any[] }> {
    return request('/api/rules');
  },

  async updateRule(
    ruleId: string,
    updates: { defaultStrategy?: string; isEnabled?: boolean }
  ): Promise<{ success: boolean; rule: any }> {
    return request(`/api/rules/${ruleId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // Auth & RBAC
  async register(payload: {
    name: string;
    email: string;
    password: string;
    organization?: string;
    department?: string;
  }): Promise<{ success: boolean; token: string; user: User }> {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async login(payload: {
    email: string;
    password: string;
  }): Promise<{ success: boolean; token: string; user: User }> {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getProfile(): Promise<{ success: boolean; user: User }> {
    return request('/api/auth/me');
  },
};


