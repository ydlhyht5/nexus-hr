import { Employee, LeaveRequest, SalaryRecord } from '../types';

// Safe access to environment variables
const getEnv = () => {
  try {
    // @ts-ignore
    return (import.meta && import.meta.env) ? import.meta.env : {};
  } catch (e) {
    return {};
  }
};

const env = getEnv();
const API_BASE_URL = env.VITE_API_URL || 'http://localhost:8787';

const DB_NAME = 'NexusHR_DB';
const DB_VERSION = 2;

class DatabaseService {
  private mode: 'CLOUD' | 'LOCAL' = 'LOCAL';
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    this.dbPromise = this.initLocalDB();
  }

  // --- IndexedDB Initialization (Fallback) ---
  private initLocalDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.error("IndexedDB not supported");
        resolve(null as any); 
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
        console.error("IndexedDB Error:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('employees')) {
          db.createObjectStore('employees', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('leaves')) {
          db.createObjectStore('leaves', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('salaries')) {
          db.createObjectStore('salaries', { keyPath: 'id' });
        }
      };
    });
  }

  // --- Helper Methods ---

  private async fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return await response.json();
  }

  private async getLocalAll<T>(storeName: string): Promise<T[]> {
    const db = await this.dbPromise;
    if (!db) return [];
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async saveLocal<T>(storeName: string, data: T): Promise<void> {
    const db = await this.dbPromise;
    if (!db) return;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Public Methods ---

  async init(): Promise<void> {
    try {
      const env = getEnv();
      if (!env.VITE_API_URL) {
          console.log("No API URL configured, using LOCAL mode.");
          this.mode = 'LOCAL';
          return;
      }

      // Try to ping the backend
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); 
      
      const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        this.mode = 'CLOUD';
        console.log("✅ Connected to Cloudflare Backend");
      } else {
        throw new Error("Health check returned non-200");
      }
    } catch (e) {
      console.warn("⚠️ Backend unavailable, switching to Local Mode (IndexedDB)");
      this.mode = 'LOCAL';
    }
  }

  getMode() {
    return this.mode;
  }

  // --- Employees ---

  async getAllEmployees(): Promise<Employee[]> {
    if (this.mode === 'CLOUD') {
      try {
        return await this.fetchAPI<Employee[]>('/api/employees');
      } catch (e) {
        console.error("API failed, falling back to local", e);
        this.mode = 'LOCAL';
      }
    }
    return this.getLocalAll<Employee>('employees');
  }

  async saveEmployee(employee: Employee): Promise<void> {
    if (this.mode === 'CLOUD') {
      try {
        await this.fetchAPI('/api/employees', {
          method: 'POST',
          body: JSON.stringify(employee)
        });
        return;
      } catch (e) {
        console.error("API failed, falling back to local", e);
        this.mode = 'LOCAL';
      }
    }
    await this.saveLocal('employees', employee);
  }

  // --- Leaves ---

  async getAllLeaves(): Promise<LeaveRequest[]> {
    if (this.mode === 'CLOUD') {
      try {
        return await this.fetchAPI<LeaveRequest[]>('/api/leaves');
      } catch (e) {
        console.error("API failed, falling back to local", e);
        this.mode = 'LOCAL';
      }
    }
    return this.getLocalAll<LeaveRequest>('leaves');
  }

  async saveLeave(leave: LeaveRequest): Promise<void> {
    if (this.mode === 'CLOUD') {
      try {
        await this.fetchAPI('/api/leaves', {
          method: 'POST',
          body: JSON.stringify(leave)
        });
        return;
      } catch (e) {
        console.error("API failed, falling back to local", e);
        this.mode = 'LOCAL';
      }
    }
    await this.saveLocal('leaves', leave);
  }

  // --- Salaries ---

  async getAllSalaries(): Promise<SalaryRecord[]> {
    if (this.mode === 'CLOUD') {
      try {
        return await this.fetchAPI<SalaryRecord[]>('/api/salaries');
      } catch (e) {
        console.error("API failed, falling back to local", e);
        this.mode = 'LOCAL';
      }
    }
    return this.getLocalAll<SalaryRecord>('salaries');
  }

  async saveSalary(record: SalaryRecord): Promise<void> {
    if (this.mode === 'CLOUD') {
      try {
        await this.fetchAPI('/api/salaries', {
          method: 'POST',
          body: JSON.stringify(record)
        });
        return;
      } catch (e) {
        console.error("API failed, falling back to local", e);
        this.mode = 'LOCAL';
      }
    }
    await this.saveLocal('salaries', record);
  }
}

export const db = new DatabaseService();
