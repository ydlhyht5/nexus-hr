import { Employee, LeaveRequest, SalaryRecord, Syncable } from '../types';

// Safe access to environment variables
const getEnv = (): any => {
  try {
    // @ts-ignore
    return (import.meta && import.meta.env) ? import.meta.env : {};
  } catch (e) {
    return {};
  }
};

const env = getEnv();
// Production URL
const API_BASE_URL = env.VITE_API_URL || 'https://nexus-api.ydlhyht5.workers.dev';
const BASE_URL = API_BASE_URL.replace(/\/$/, '');

const DB_NAME = 'NexusHR_DB';
const DB_VERSION = 2;

class DatabaseService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private syncListeners: ((pendingCount: number) => void)[] = [];

  constructor() {
    this.dbPromise = this.initLocalDB();
  }

  // --- IndexedDB Initialization ---
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
    const url = `${BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      // For DELETE requests or empty responses
      if (response.status === 204 || response.headers.get('content-length') === '0') {
          return {} as T;
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  // Generic Local Helpers
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

  private async deleteLocal(storeName: string, id: string): Promise<void> {
    const db = await this.dbPromise;
    if (!db) return;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async clearStore(storeName: string): Promise<void> {
      const db = await this.dbPromise;
      if (!db) return;
      return new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  }

  private async bulkSaveLocal<T>(storeName: string, items: T[]): Promise<void> {
    const db = await this.dbPromise;
    if (!db) return;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      items.forEach(item => store.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Data Logic: Read (Cloud -> Cache -> Return) or (Fallback to Cache) ---
  
  private async getData<T extends Syncable>(storeName: string, endpoint: string): Promise<T[]> {
    try {
      // 1. Try Fetch from Cloud
      const data = await this.fetchAPI<T[]>(endpoint);
      // 2. If success, cache to local (marking as synced)
      const syncedData = data.map(item => ({ ...item, synced: true }));
      await this.bulkSaveLocal(storeName, syncedData);
      return syncedData;
    } catch (e) {
      console.warn(`[${storeName}] Offline or API fail, using local cache.`);
      // 3. Fallback to local
      return this.getLocalAll<T>(storeName);
    }
  }

  // --- Data Logic: Write (Local -> Try Cloud -> Update Synced Status) ---

  private async saveData<T extends Syncable>(storeName: string, endpoint: string, data: T): Promise<void> {
    // 1. Save to local first (optimistic UI), mark as unsynced initially
    const pendingData = { ...data, synced: false };
    await this.saveLocal(storeName, pendingData);
    this.notifySyncListeners(); // Update UI count

    try {
      // 2. Try push to cloud
      // We send the object. Cloudflare D1 doesn't care about extra fields, but good to know 'synced' is sent.
      await this.fetchAPI(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      // 3. If success, mark local as synced
      const syncedData = { ...data, synced: true };
      await this.saveLocal(storeName, syncedData);
      console.log(`[${storeName}] Synced to cloud successfully.`);
    } catch (e) {
      console.warn(`[${storeName}] Upload failed, kept as pending local change.`);
    }
    this.notifySyncListeners();
  }

  private async deleteData(storeName: string, endpoint: string, id: string): Promise<void> {
      // 1. Delete from local
      await this.deleteLocal(storeName, id);
      
      try {
          // 2. Try delete from cloud
          // Send DELETE request with ID as query param
          await this.fetchAPI(`${endpoint}?id=${id}`, {
              method: 'DELETE'
          });
          console.log(`[${storeName}] Deleted from cloud successfully.`);
      } catch(e) {
          console.warn(`[${storeName}] Cloud delete failed, but deleted locally.`, e);
      }
      this.notifySyncListeners();
  }

  // --- Public Methods ---

  async init(): Promise<void> {
    await this.dbPromise;
    // Attempt initial sync
    this.syncPendingChanges();
  }

  // Employees
  async getAllEmployees(): Promise<Employee[]> {
    return this.getData<Employee>('employees', '/api/employees');
  }
  async saveEmployee(emp: Employee): Promise<void> {
    return this.saveData('employees', '/api/employees', emp);
  }
  
  // Cascade Delete
  async deleteEmployee(id: string): Promise<void> {
      // 1. Delete related leaves
      const leaves = await this.getLocalAll<LeaveRequest>('leaves');
      const empLeaves = leaves.filter(l => l.employeeId === id);
      // Execute in parallel
      await Promise.all(empLeaves.map(l => this.deleteData('leaves', '/api/leaves', l.id)));

      // 3. Delete employee record
      return this.deleteData('employees', '/api/employees', id);
  }

  // Leaves
  async getAllLeaves(): Promise<LeaveRequest[]> {
    return this.getData<LeaveRequest>('leaves', '/api/leaves');
  }
  async saveLeave(leave: LeaveRequest): Promise<void> {
    return this.saveData('leaves', '/api/leaves', leave);
  }

  // Salaries
  async getAllSalaries(): Promise<SalaryRecord[]> {
    return this.getData<SalaryRecord>('salaries', '/api/salaries');
  }
  async saveSalary(record: SalaryRecord): Promise<void> {
    return this.saveData('salaries', '/api/salaries', record);
  }

  // --- FACTORY RESET ---
  async clearAllData(): Promise<void> {
      console.warn("⚠️ STARTING FACTORY RESET...");
      
      // 1. Clear Local DB
      await this.clearStore('employees');
      await this.clearStore('leaves');
      await this.clearStore('salaries');

      // 2. Attempt to clear Cloud DB
      // Since the API doesn't support bulk delete, we must fetch and delete individually.
      // This is slow but safe.
      try {
          const emps = await this.fetchAPI<Employee[]>('/api/employees');
          for (const e of emps) {
              await this.fetchAPI(`/api/employees?id=${e.id}`, { method: 'DELETE' });
          }

          const leaves = await this.fetchAPI<LeaveRequest[]>('/api/leaves');
          for (const l of leaves) {
              await this.fetchAPI(`/api/leaves?id=${l.id}`, { method: 'DELETE' });
          }

          const salaries = await this.fetchAPI<SalaryRecord[]>('/api/salaries');
          for (const s of salaries) {
              await this.fetchAPI(`/api/salaries?id=${s.id}`, { method: 'DELETE' });
          }
      } catch (e) {
          console.error("Cloud wipe failed (partially?)", e);
      }
      
      console.log("✅ FACTORY RESET COMPLETE");
      this.notifySyncListeners();
  }


  // --- Sync Engine ---

  async getPendingCount(): Promise<number> {
    const emps = await this.getLocalAll<Employee>('employees');
    const leaves = await this.getLocalAll<LeaveRequest>('leaves');
    const sals = await this.getLocalAll<SalaryRecord>('salaries');
    
    const count = [
      ...emps, ...leaves, ...sals
    ].filter(i => i.synced === false).length;
    
    return count;
  }

  onSyncStatusChange(cb: (count: number) => void) {
    this.syncListeners.push(cb);
    this.getPendingCount().then(cb);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== cb);
    };
  }

  private notifySyncListeners() {
    this.getPendingCount().then(count => {
      this.syncListeners.forEach(cb => cb(count));
    });
  }

  async syncPendingChanges(): Promise<void> {
    console.log("🔄 Starting sync of pending changes...");
    
    const trySyncStore = async <T extends Syncable>(store: string, endpoint: string) => {
      const items = await this.getLocalAll<T>(store);
      const pending = items.filter(i => i.synced === false);
      
      for (const item of pending) {
        try {
          // Upload
          await this.fetchAPI(endpoint, {
            method: 'POST',
            body: JSON.stringify(item)
          });
          // Mark synced
          await this.saveLocal(store, { ...item, synced: true });
        } catch (e) {
          console.error(`Failed to sync item in ${store}`, e);
        }
      }
    };

    await Promise.all([
      trySyncStore<Employee>('employees', '/api/employees'),
      trySyncStore<LeaveRequest>('leaves', '/api/leaves'),
      trySyncStore<SalaryRecord>('salaries', '/api/salaries')
    ]);

    console.log("✅ Sync attempt finished");
    this.notifySyncListeners();
  }
}

export const db = new DatabaseService();
