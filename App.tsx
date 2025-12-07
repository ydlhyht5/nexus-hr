
import React, { useState, useEffect } from 'react';
import { Employee, LeaveRequest, UserRole, UserSession, LeaveStatus, SalaryRecord } from './types';
import { Button, Card, Input } from './components/UI';
import { AdminDashboard } from './components/AdminDashboard';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { Lock, User as UserIcon, Shield, Database, Cloud, Wifi, WifiOff } from 'lucide-react';
import { db } from './services/db';

const ADMIN_USER = 'admin';
const ADMIN_PASS = '8278';
const EMP_DEFAULT_PASS = '1234';
const AUTO_APPROVE_MS = 6 * 60 * 60 * 1000; // 6 hours

const App: React.FC = () => {
  // --- Global State ---
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [isDbReady, setIsDbReady] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);
  const [dbMode, setDbMode] = useState<'CLOUD' | 'LOCAL'>('LOCAL');

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

  // Initialize DB and load data
  useEffect(() => {
    const initData = async () => {
      try {
        await db.init();
        setDbMode(db.getMode());
        await loadData();
        setIsDbReady(true);
      } catch (err) {
        console.error("Failed to initialize database", err);
        setIsDbReady(true);
      }
    };
    initData();
  }, []);

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
           console.log('Auto-approved pending request:', req.id);
        }
      });
    }, 60000); 

    return () => clearInterval(interval);
  }, [leaveRequests, isDbReady]);


  // --- Handlers ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Admin Check
    if (loginId === ADMIN_USER && loginPass === ADMIN_PASS) {
      setSession({ id: 'admin', role: UserRole.ADMIN, name: '管理员' });
      return;
    }

    // Employee Check
    const emp = employees.find(e => e.id === loginId);
    if (emp) {
      if (emp.password === loginPass) {
        // Check first login
        if (emp.isFirstLogin) {
          setShowPasswordChange(true);
        } else {
          setSession({ id: emp.id, role: UserRole.EMPLOYEE, name: emp.name });
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
    if (newPassword.length < 4) {
      setError('密码长度太短');
      return;
    }

    const targetEmp = employees.find(e => e.id === loginId);
    if (targetEmp) {
      const updatedEmp = { ...targetEmp, password: newPassword, isFirstLogin: false };
      await db.saveEmployee(updatedEmp);
      setEmployees(prev => prev.map(emp => emp.id === loginId ? updatedEmp : emp));
      
      setSession({ id: updatedEmp.id, role: UserRole.EMPLOYEE, name: updatedEmp.name });
      setShowPasswordChange(false);
      setNewPassword('');
    }
  };

  const handleLogout = () => {
    setSession(null);
    setLoginId('');
    setLoginPass('');
    setError('');
    loadData(); // Refresh data on logout to ensure sync
  };

  // --- Admin Actions ---

  const addEmployee = async (emp: Employee) => {
    await db.saveEmployee(emp);
    setEmployees(prev => [...prev, emp]);
  };

  const updateEmployee = async (updatedEmp: Employee) => {
    await db.saveEmployee(updatedEmp);
    setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
  };

  const resetPassword = async (id: string) => {
    const target = employees.find(e => e.id === id);
    if (target) {
      const updated = { ...target, password: EMP_DEFAULT_PASS, isFirstLogin: true };
      await db.saveEmployee(updated);
      setEmployees(prev => prev.map(e => e.id === id ? updated : e));
      alert(`${id} 的密码已重置为 ${EMP_DEFAULT_PASS}`);
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

  // Placeholders for local mode since we are hybrid now
  const handleImportData = (file: File) => {
     alert("数据同步由 Cloudflare D1 或本地 IndexedDB 自动处理。");
  };

  const handleExportData = () => {
     alert("数据已安全存储。");
  };

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

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono">
            {dbMode === 'CLOUD' ? (
                <>
                    <Wifi size={14} className="text-green-400" />
                    <span className="text-green-400">Cloud Online</span>
                </>
            ) : (
                <>
                    <WifiOff size={14} className="text-orange-400" />
                    <span className="text-orange-400">Local Mode</span>
                </>
            )}
        </div>

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
              
              <div className="flex items-center justify-center gap-2 text-xs text-nexus-muted mt-4">
                {dbMode === 'CLOUD' ? <Cloud size={12} /> : <Database size={12} />}
                <span>
                    {dbMode === 'CLOUD' 
                        ? '数据已同步至 Cloudflare D1' 
                        : '无法连接云端，使用本地 IndexedDB 存储'}
                </span>
              </div>
            </form>
          )}
        </Card>
      </div>
    );
  }

  if (session.role === UserRole.ADMIN) {
    return (
      <AdminDashboard 
        employees={employees}
        leaveRequests={leaveRequests}
        salaryRecords={salaryRecords}
        onAddEmployee={addEmployee}
        onUpdateEmployee={updateEmployee}
        onResetPassword={resetPassword}
        onUpdateLeaveStatus={updateLeaveStatus}
        onSaveSalary={saveSalary}
        onImportData={handleImportData}
        onExportData={handleExportData}
        onLogout={handleLogout}
      />
    );
  }

  const currentEmployee = employees.find(e => e.id === session.id);
  if (!currentEmployee) return (
     <div className="min-h-screen flex items-center justify-center bg-nexus-dark text-white flex-col gap-4">
        <div>加载用户信息失败...</div>
        <Button onClick={handleLogout}>返回登录</Button>
     </div>
  );

  return (
    <EmployeeDashboard 
      employee={currentEmployee}
      requests={leaveRequests.filter(req => req.employeeId === session.id)}
      salaryRecords={salaryRecords}
      onSubmitLeave={submitLeave}
      onLogout={handleLogout}
    />
  );
};

export default App;
