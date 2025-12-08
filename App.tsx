
import React, { useState, useEffect, useRef } from 'react';
import { Employee, LeaveRequest, UserRole, UserSession, LeaveStatus, SalaryRecord } from './types';
import { Button, Card, Input, ToastContainer, ToastType } from './components/UI';
import { AdminDashboard } from './components/AdminDashboard';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { Lock, User as UserIcon, Shield, Cloud, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { db } from './services/db';

const ADMIN_USER = 'admin';
const ADMIN_PASS = '8278';
const EMP_DEFAULT_PASS = '1234';
const AUTO_APPROVE_MS = 6 * 60 * 60 * 1000; // 6 hours
const SESSION_KEY = 'nexus_session_v1';

const App: React.FC = () => {
  // --- Global State ---
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [isDbReady, setIsDbReady] = useState(false);
  
  // Session Persistence: Initialize from localStorage
  const [session, setSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  
  // Sync & Network State
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // Toasts State (Lifted up to manage global notifications)
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([]);
  const addToast = (message: string, type: ToastType) => {
    const id = Date.now().toString() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  };
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  // --- Login State ---
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [error, setError] = useState('');
  
  // --- Change Password State ---
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  // --- Effects ---
  
  const loadData = async () => {
    try {
      const [loadedEmps, loadedLeaves, loadedSalaries] = await Promise.all([
        db.getAllEmployees(),
        db.getAllLeaves(),
        db.getAllSalaries()
      ]);
      setEmployees(loadedEmps);
      setLeaveRequests(loadedLeaves);
      setSalaryRecords(loadedSalaries);
      return true;
    } catch (err) {
      console.error("Failed to load data", err);
      return false;
    }
  };

  // Initialize DB and Network Listeners
  useEffect(() => {
    const initApp = async () => {
      await db.init();
      
      // Subscribe to sync count changes
      db.onSyncStatusChange((count) => {
        setPendingSyncCount(count);
      });

      await loadData();
      setIsDbReady(true);
    };

    initApp();

    // Network Listeners
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // REAL-TIME POLLING (Every 15s) to ensure data freshness
    const pollInterval = setInterval(() => {
        loadData();
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(pollInterval);
    };
  }, []);

  // --- Notification Logic (Refs to track previous states) ---
  const prevLeaveRequestsRef = useRef<LeaveRequest[]>([]);

  useEffect(() => {
    // 1. Admin Notification: New Pending Requests
    if (session?.role === UserRole.ADMIN) {
        const prevPendingCount = prevLeaveRequestsRef.current.filter(r => r.status === LeaveStatus.PENDING).length;
        const currPendingCount = leaveRequests.filter(r => r.status === LeaveStatus.PENDING).length;
        
        // Only notify if count INCREASED (new request came in)
        if (currPendingCount > prevPendingCount) {
            addToast('收到新的请假申请', 'info');
        }
    }

    // 2. Employee Notification: Status Changes
    if (session?.role === UserRole.EMPLOYEE) {
        const myPrevRequests = prevLeaveRequestsRef.current.filter(r => r.employeeId === session.id);
        const myCurrRequests = leaveRequests.filter(r => r.employeeId === session.id);

        myCurrRequests.forEach(curr => {
            const prev = myPrevRequests.find(p => p.id === curr.id);
            // Check if status changed from PENDING to APPROVED/REJECTED
            if (prev && prev.status === LeaveStatus.PENDING && curr.status !== LeaveStatus.PENDING) {
                if (curr.status === LeaveStatus.APPROVED) {
                    addToast(`您的请假申请 "${curr.reason}" 已被批准`, 'success');
                } else if (curr.status === LeaveStatus.REJECTED) {
                    addToast(`您的请假申请 "${curr.reason}" 被拒绝`, 'error');
                }
            }
        });
    }

    // Update ref
    prevLeaveRequestsRef.current = leaveRequests;
  }, [leaveRequests, session]);


  const triggerSync = async () => {
    if (pendingSyncCount > 0) {
      setIsSyncing(true);
      await db.syncPendingChanges();
      setIsSyncing(false);
      // Reload data to reflect cloud state
      await loadData(); 
    }
  };

  // Auto-Approve Worker
  useEffect(() => {
    if (!isDbReady) return;

    const interval = setInterval(() => {
      const now = Date.now();
      leaveRequests.forEach(async (req) => {
        if (req.status === LeaveStatus.PENDING && (now - req.createdAt > AUTO_APPROVE_MS)) {
           const updatedReq = { ...req, status: LeaveStatus.APPROVED };
           await db.saveLeave(updatedReq);
           setLeaveRequests(prev => prev.map(r => r.id === req.id ? updatedReq : r));
        }
      });
    }, 60000); 

    return () => clearInterval(interval);
  }, [leaveRequests, isDbReady]);


  // --- Handlers ---

  const saveSession = (sess: UserSession) => {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
      setSession(sess);
  };

  const clearSession = () => {
      localStorage.removeItem(SESSION_KEY);
      setSession(null);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Admin Check
    if (loginId === ADMIN_USER && loginPass === ADMIN_PASS) {
      saveSession({ id: 'admin', role: UserRole.ADMIN, name: '管理员' });
      return;
    }

    // Employee Check
    const emp = employees.find(e => e.id === loginId);
    if (emp) {
      if (emp.password === loginPass) {
        if (emp.isFirstLogin) {
          setShowPasswordChange(true);
        } else {
          saveSession({ id: emp.id, role: UserRole.EMPLOYEE, name: emp.name });
        }
      } else {
        setError('密码错误');
      }
    } else {
      setError('用户不存在');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setError('密码不能为空');
      return;
    }
    
    const targetEmp = employees.find(e => e.id === loginId);
    if (targetEmp) {
      const updatedEmp = { ...targetEmp, password: newPassword, isFirstLogin: false };
      await db.saveEmployee(updatedEmp);
      setEmployees(prev => prev.map(emp => emp.id === loginId ? updatedEmp : emp));
      saveSession({ id: updatedEmp.id, role: UserRole.EMPLOYEE, name: updatedEmp.name });
      setShowPasswordChange(false);
      setNewPassword('');
    }
  };

  const handleLogout = () => {
    clearSession();
    setLoginId('');
    setLoginPass('');
    setError('');
    loadData();
  };

  // --- Admin Actions ---

  const addEmployee = async (emp: Employee) => {
    await db.saveEmployee(emp);
    setEmployees(prev => [...prev, emp]); // Optimistic update
    loadData(); // Reload to ensure sync status is correct
  };

  const updateEmployee = async (updatedEmp: Employee) => {
    await db.saveEmployee(updatedEmp);
    setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
    loadData();
  };

  const deleteEmployee = async (id: string) => {
      await db.deleteEmployee(id);
      // Update state: remove employee and leaves, BUT KEEP SALARY RECORDS for reports
      setEmployees(prev => prev.filter(e => e.id !== id));
      setLeaveRequests(prev => prev.filter(req => req.employeeId !== id));
      // setSalaryRecords(prev => prev.filter(rec => rec.employeeId !== id)); // COMMENTED OUT TO KEEP HISTORY
      
      loadData();
  };

  const resetPassword = async (id: string, newPass?: string) => {
    const target = employees.find(e => e.id === id);
    if (target) {
      const passToSet = newPass || EMP_DEFAULT_PASS;
      const updated = { ...target, password: passToSet, isFirstLogin: true };
      await db.saveEmployee(updated);
      setEmployees(prev => prev.map(e => e.id === id ? updated : e));
    }
  };

  const updateLeaveStatus = async (reqId: string, status: LeaveStatus, reason?: string) => {
    const target = leaveRequests.find(r => r.id === reqId);
    if (target) {
      const updated = { ...target, status, rejectionReason: reason };
      await db.saveLeave(updated);
      setLeaveRequests(prev => prev.map(req => req.id === reqId ? updated : req));
    }
  };

  const saveSalary = async (record: SalaryRecord) => {
    await db.saveSalary(record);
    setSalaryRecords(prev => {
      const idx = prev.findIndex(r => r.id === record.id);
      if (idx >= 0) {
        const newArr = [...prev];
        newArr[idx] = record;
        return newArr;
      } else {
        return [...prev, record];
      }
    });
  };

  const handleImportData = (file: File) => alert("系统已启用自动云同步，无需手动导入。");
  const handleExportData = () => alert("数据已安全存储在云端 (Cloudflare D1)。");

  // --- Employee Actions ---

  const submitLeave = async (start: string, end: string, days: number, reason: string, existingId?: string) => {
    if (!session) return;
    if (existingId) {
      const target = leaveRequests.find(r => r.id === existingId);
      if (target) {
        const updated = { ...target, startDate: start, endDate: end, days, reason, createdAt: Date.now() };
        await db.saveLeave(updated);
        setLeaveRequests(prev => prev.map(req => req.id === existingId ? updated : req));
      }
    } else {
      const newReq: LeaveRequest = {
        id: `LR-${Date.now()}`,
        employeeId: session.id,
        employeeName: session.name,
        startDate: start,
        endDate: end,
        days,
        reason,
        status: LeaveStatus.PENDING,
        createdAt: Date.now()
      };
      await db.saveLeave(newReq);
      setLeaveRequests(prev => [newReq, ...prev]);
    }
  };

  // --- Render ---

  if (!isDbReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-nexus-dark text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nexus-accent mb-4"></div>
        <p className="text-nexus-muted animate-pulse">正在初始化系统...</p>
      </div>
    );
  }

  // --- Sync Indicator Footer ---
  const SyncFooter = () => (
    <div className={`fixed bottom-0 left-0 right-0 py-1 px-4 text-xs font-mono flex justify-between items-center z-[200] border-t border-white/5 backdrop-blur-md transition-colors ${isOnline ? 'bg-nexus-card/90 text-nexus-muted' : 'bg-red-900/50 text-red-200'}`}>
      <div className="flex items-center gap-2">
        {isOnline ? <Wifi size={12} className="text-green-500"/> : <WifiOff size={12} />}
        <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
      </div>
      
      <div className="flex items-center gap-2">
        {isSyncing ? (
          <>
            <RefreshCw size={12} className="animate-spin text-blue-400" />
            <span className="text-blue-400">正在同步...</span>
          </>
        ) : pendingSyncCount > 0 ? (
          <>
            <Cloud size={12} className="text-orange-400" />
            <span className="text-orange-400">{pendingSyncCount} 条数据待上传</span>
            {isOnline && <button onClick={triggerSync} className="underline hover:text-white ml-2">立即同步</button>}
          </>
        ) : (
          <>
            <Cloud size={12} className="text-green-500" />
            <span className="text-green-500">所有数据已同步</span>
          </>
        )}
      </div>
    </div>
  );

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        </div>
        
        {/* Global Toast Container for Login Screen */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />

        <Card className="w-full max-w-md bg-nexus-card/80 backdrop-blur-md border-white/10 shadow-2xl relative z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-neon transform rotate-3">
              <Shield className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">棠灿贸易</h1>
            <p className="text-nexus-muted mt-2">员工管理系统 (Ver 2.0)</p>
          </div>

          {showPasswordChange ? (
            <form onSubmit={handlePasswordChange} className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl text-yellow-200 text-sm text-center">
                安全提示: 检测到首次登录。<br/>请重新设置您的密码。
              </div>
              <Input 
                type="password" 
                placeholder="新密码" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoFocus
              />
              <Button type="submit" className="w-full">设置密码并登录</Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-nexus-muted group-focus-within:text-nexus-accent transition-colors" size={20} />
                  <Input 
                    placeholder="工号 / 用户名" 
                    value={loginId}
                    onChange={e => setLoginId(e.target.value)}
                    className="pl-12"
                  />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-nexus-muted group-focus-within:text-nexus-accent transition-colors" size={20} />
                  <Input 
                    type="password" 
                    placeholder="密码" 
                    value={loginPass}
                    onChange={e => setLoginPass(e.target.value)}
                    className="pl-12"
                  />
                </div>
              </div>

              {error && (
                <div className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full py-3 text-lg">
                登录系统
              </Button>
            </form>
          )}
        </Card>
        <SyncFooter />
      </div>
    );
  }

  // Lifted ToastContainer to be available globally
  return (
    <div className="pb-8 relative">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {session.role === UserRole.ADMIN ? (
        <AdminDashboard 
          employees={employees}
          leaveRequests={leaveRequests}
          salaryRecords={salaryRecords}
          onAddEmployee={addEmployee}
          onUpdateEmployee={updateEmployee}
          onDeleteEmployee={deleteEmployee}
          onResetPassword={resetPassword}
          onUpdateLeaveStatus={updateLeaveStatus}
          onSaveSalary={saveSalary}
          onImportData={handleImportData}
          onExportData={handleExportData}
          onLogout={handleLogout}
        />
      ) : (
        <EmployeeDashboard 
          employee={employees.find(e => e.id === session.id)!}
          requests={leaveRequests.filter(req => req.employeeId === session.id)}
          salaryRecords={salaryRecords}
          onSubmitLeave={submitLeave}
          onLogout={handleLogout}
        />
      )}
      <SyncFooter />
    </div>
  );
};

export default App;
