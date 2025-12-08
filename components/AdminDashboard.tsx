import React, { useState, useEffect } from 'react';
import { Employee, Gender, LeaveRequest, LeaveStatus, SalaryRecord } from '../types';
import { Card, Button, Input, Select, Badge, Modal, ToastContainer, ToastType } from './UI';
import { generatePinyinInitials } from '../services/geminiService';
import { UserPlus, Calendar, Check, X, Search, Pencil, Calculator, Save, Wand2, User } from 'lucide-react';

interface AdminDashboardProps {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  salaryRecords: SalaryRecord[];
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onResetPassword: (id: string) => void;
  onUpdateLeaveStatus: (id: string, status: LeaveStatus, reason?: string) => void;
  onSaveSalary: (record: SalaryRecord) => void;
  onImportData: (file: File) => void;
  onExportData: () => void;
  onLogout: () => void;
}

// --- Helper Functions ---
const getSalaryStatus = (emp: Employee, monthStr: string) => {
  if (!emp.joinDate) return 'PROBATION'; 
  const join = new Date(emp.joinDate);
  const selected = new Date(monthStr + '-01');
  const probationEnd = new Date(join);
  probationEnd.setMonth(join.getMonth() + emp.probationMonths);
  
  // Calculate specific months to compare precisely
  const selectedTime = selected.getFullYear() * 12 + selected.getMonth();
  const probationTime = probationEnd.getFullYear() * 12 + probationEnd.getMonth();
  
  return selectedTime < probationTime ? 'PROBATION' : 'OFFICIAL';
};

// --- Salary Row Component ---
const SalaryRow: React.FC<{
  emp: Employee;
  selectedMonth: string;
  salaryRecords: SalaryRecord[];
  onSaveSalary: (record: SalaryRecord) => void;
  addToast: (msg: string, type: ToastType) => void;
}> = ({ emp, selectedMonth, salaryRecords, onSaveSalary, addToast }) => {
  const recordId = `${emp.id}_${selectedMonth}`;
  const existingRecord = salaryRecords.find(r => r.id === recordId);
  
  const status = getSalaryStatus(emp, selectedMonth);
  const basicSalary = status === 'PROBATION' ? emp.probationSalary : emp.fullSalary;

  const [sales, setSales] = useState(existingRecord?.salesAmount?.toString() || '');
  const [rate, setRate] = useState(existingRecord?.bonusRate?.toString() || '');
  
  useEffect(() => {
     const rec = salaryRecords.find(r => r.id === `${emp.id}_${selectedMonth}`);
     setSales(rec?.salesAmount?.toString() || '');
     setRate(rec?.bonusRate?.toString() || '');
  }, [selectedMonth, salaryRecords, emp.id]);

  const salesNum = parseFloat(sales) || 0;
  const rateNum = parseFloat(rate) || 0;
  const bonus = salesNum * (rateNum / 100);
  const total = basicSalary + bonus;

  const handleSave = () => {
    const record: SalaryRecord = {
      id: recordId,
      employeeId: emp.id,
      employeeName: emp.name,
      month: selectedMonth,
      basicSalary,
      salesAmount: salesNum,
      bonusRate: rateNum,
      bonusAmount: bonus,
      totalSalary: total,
      updatedAt: Date.now()
    };
    onSaveSalary(record);
    addToast('工资条已保存', 'success');
  };

  const isSaved = existingRecord && 
    existingRecord.salesAmount === salesNum && 
    existingRecord.bonusRate === rateNum;

  return (
    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors group">
      <td className="p-4">
        <div className="font-medium text-white flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-xs font-bold">
                {emp.name[0]}
            </div>
            <div>
                <div>{emp.name}</div>
                <div className="text-xs text-nexus-muted">{emp.jobTitle}</div>
            </div>
        </div>
      </td>
      <td className="p-4">
        <Badge status={status} />
        <div className="text-sm font-mono mt-1 text-nexus-text">¥{basicSalary.toLocaleString()}</div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-1 bg-black/20 rounded-lg p-1 border border-white/5 focus-within:border-nexus-accent/50 transition-colors w-28">
           <span className="text-nexus-muted text-xs pl-1">¥</span>
           <input 
              type="number" 
              className="bg-transparent border-none text-sm text-white focus:ring-0 w-full outline-none p-0"
              placeholder="0"
              value={sales}
              onChange={e => setSales(e.target.value)}
           />
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-1 bg-black/20 rounded-lg p-1 border border-white/5 focus-within:border-nexus-accent/50 transition-colors w-20">
           <input 
              type="number" 
              className="bg-transparent border-none text-sm text-white focus:ring-0 w-full outline-none p-0 text-center"
              placeholder="0"
              value={rate}
              onChange={e => setRate(e.target.value)}
           />
           <span className="text-nexus-muted text-xs pr-1">%</span>
        </div>
      </td>
      <td className="p-4 font-mono text-green-400">
        +¥{bonus.toFixed(2)}
      </td>
      <td className="p-4">
        <div className="font-bold text-lg text-white font-mono">¥{total.toFixed(2)}</div>
      </td>
      <td className="p-4 text-right">
         <Button 
            variant={isSaved ? "secondary" : "primary"} 
            onClick={handleSave} 
            size="sm"
            icon={<Save size={14} />}
            className={isSaved ? "opacity-50" : ""}
         >
           {isSaved ? "已存" : "保存"}
         </Button>
      </td>
    </tr>
  );
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  employees,
  leaveRequests,
  salaryRecords,
  onAddEmployee,
  onUpdateEmployee,
  onResetPassword,
  onUpdateLeaveStatus,
  onSaveSalary,
  onImportData,
  onExportData,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'employees' | 'leaves' | 'salary'>('employees');
  
  // -- Toast State --
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([]);
  const addToast = (message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  // -- Modal & Form State --
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newEmp, setNewEmp] = useState({
    name: '',
    jobTitle: '',
    joinDate: '',
    gender: Gender.MALE,
    probationSalary: 0,
    fullSalary: 0,
    probationMonths: 3
  });
  
  // ID Generation State
  const [generatedId, setGeneratedId] = useState('');
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [pinyinCache, setPinyinCache] = useState('');

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Effect: Auto Generate ID Preview when Name or Date changes
  useEffect(() => {
    // Only generate for new employees
    if (editingId) return;

    const generate = async () => {
        if (!newEmp.name || !newEmp.joinDate) {
            setGeneratedId('');
            return;
        }

        const dateObj = new Date(newEmp.joinDate);
        if (isNaN(dateObj.getTime())) return;
        
        const mm = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const dd = dateObj.getDate().toString().padStart(2, '0');
        const dateSuffix = `${mm}${dd}`;

        // If name matches cache, just append date
        if (pinyinCache && newEmp.name === pinyinCache.split('|')[0]) {
            setGeneratedId(`${pinyinCache.split('|')[1]}${dateSuffix}`);
            return;
        }

        setIsGeneratingId(true);
        // Call Gemini (or local logic)
        const initials = await generatePinyinInitials(newEmp.name);
        setPinyinCache(`${newEmp.name}|${initials}`);
        setGeneratedId(`${initials}${dateSuffix}`);
        setIsGeneratingId(false);
    };

    const timer = setTimeout(generate, 800); // Debounce
    return () => clearTimeout(timer);
  }, [newEmp.name, newEmp.joinDate, editingId, pinyinCache]);

  const handleOpenModal = (emp?: Employee) => {
    if (emp) {
      setNewEmp({
        name: emp.name,
        jobTitle: emp.jobTitle || '',
        joinDate: emp.joinDate,
        gender: emp.gender,
        probationSalary: emp.probationSalary,
        fullSalary: emp.fullSalary,
        probationMonths: emp.probationMonths
      });
      setEditingId(emp.id);
      setGeneratedId(emp.id); // Show existing ID
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setGeneratedId('');
    setPinyinCache('');
    setNewEmp({
      name: '',
      jobTitle: '',
      joinDate: '',
      gender: Gender.MALE,
      probationSalary: 0,
      fullSalary: 0,
      probationMonths: 3
    });
  };

  const handleFormSubmit = async () => {
    if (!newEmp.name || !newEmp.joinDate || !newEmp.jobTitle) {
      addToast('请填写完整信息', 'error');
      return;
    }

    if (newEmp.probationSalary >= newEmp.fullSalary) {
      addToast('试用期工资必须低于转正工资', 'error');
      return;
    }

    if (editingId) {
      const original = employees.find(e => e.id === editingId);
      if (original) {
        const updatedEmployee: Employee = { ...original, ...newEmp };
        onUpdateEmployee(updatedEmployee);
        addToast(`员工 ${updatedEmployee.name} 信息已更新`, 'success');
      }
    } else {
      if (!generatedId) {
          addToast('正在生成工号，请稍候...', 'info');
          return;
      }
      const newEmployee: Employee = {
        id: generatedId,
        ...newEmp,
        password: '1234',
        isFirstLogin: true
      };
      onAddEmployee(newEmployee);
      addToast(`员工已创建! 工号: ${generatedId}`, 'success');
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleReject = (id: string) => {
    onUpdateLeaveStatus(id, LeaveStatus.REJECTED, rejectReason || '无理由');
    setRejectId(null);
    setRejectReason('');
    addToast('请假申请已拒绝', 'info');
  };

  const handleApprove = (id: string) => {
      onUpdateLeaveStatus(id, LeaveStatus.APPROVED);
      addToast('请假申请已批准', 'success');
  };

  const getTotalPayout = () => {
    return employees.reduce((sum, emp) => {
      const record = salaryRecords.find(r => r.id === `${emp.id}_${selectedMonth}`);
      if (record) return sum + record.totalSalary;
      const status = getSalaryStatus(emp, selectedMonth);
      return sum + (status === 'PROBATION' ? emp.probationSalary : emp.fullSalary);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-nexus-dark text-nexus-text p-4 md:p-8">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-nexus-accent to-purple-400">
            棠灿贸易后台
          </h1>
          <p className="text-nexus-muted text-xs md:text-sm mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            System Operational
          </p>
        </div>
        <div className="flex items-center gap-4 self-end md:self-auto">
           {activeTab === 'employees' && (
              <Button onClick={() => handleOpenModal()} icon={<UserPlus size={18} />} className="shadow-lg shadow-indigo-500/20">
                录入新员工
              </Button>
           )}
           <div className="h-8 w-[1px] bg-white/10 hidden md:block"></div>
          <Button variant="secondary" onClick={onLogout} className="text-sm px-4 border border-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all">
             退出
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 md:gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide border-b border-white/5">
        <button 
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-3 text-sm font-medium transition-all relative ${activeTab === 'employees' ? 'text-white' : 'text-nexus-muted hover:text-white'}`}
        >
          <div className="flex items-center gap-2">
            <User size={18} /> <span>员工管理</span>
          </div>
          {activeTab === 'employees' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-nexus-accent shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('leaves')}
          className={`px-4 py-3 text-sm font-medium transition-all relative ${activeTab === 'leaves' ? 'text-white' : 'text-nexus-muted hover:text-white'}`}
        >
          <div className="flex items-center gap-2">
            <Calendar size={18} /> <span>请假审批</span>
            {leaveRequests.some(l => l.status === LeaveStatus.PENDING) && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
            )}
          </div>
          {activeTab === 'leaves' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-nexus-accent shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('salary')}
          className={`px-4 py-3 text-sm font-medium transition-all relative ${activeTab === 'salary' ? 'text-white' : 'text-nexus-muted hover:text-white'}`}
        >
          <div className="flex items-center gap-2">
            <Calculator size={18} /> <span>工资结算</span>
          </div>
          {activeTab === 'salary' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-nexus-accent shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>}
        </button>
      </div>

      <div className="min-h-[500px]">
          {activeTab === 'employees' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="p-0 overflow-hidden border-0 bg-transparent shadow-none">
                <div className="overflow-x-auto rounded-2xl border border-white/5 bg-nexus-card/50 backdrop-blur-sm">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="text-nexus-muted text-xs uppercase tracking-wider border-b border-white/10 bg-white/5">
                        <th className="p-4 pl-6">员工信息</th>
                        <th className="p-4">职位</th>
                        <th className="p-4">入职状态</th>
                        <th className="p-4">入职日期</th>
                        <th className="p-4 text-right pr-6">操作</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {employees.map(emp => {
                         const probationEnd = new Date(emp.joinDate);
                         probationEnd.setMonth(probationEnd.getMonth() + emp.probationMonths);
                         const isProbation = new Date() < probationEnd;
                         
                         return (
                        <tr key={emp.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                          <td className="p-4 pl-6">
                              <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center font-mono text-nexus-accent font-bold group-hover:scale-105 transition-transform shadow-inner">
                                      {emp.name[0]}
                                  </div>
                                  <div>
                                      <div className="font-bold text-white">{emp.name}</div>
                                      <div className="text-xs text-nexus-muted font-mono">{emp.id}</div>
                                  </div>
                              </div>
                          </td>
                          <td className="p-4 text-white">
                              <span className="bg-white/5 px-2 py-1 rounded text-xs border border-white/5">{emp.jobTitle || '-'}</span>
                          </td>
                          <td className="p-4">
                            <Badge status={isProbation ? 'PROBATION' : 'OFFICIAL'} />
                          </td>
                          <td className="p-4 text-nexus-muted font-mono text-xs">{emp.joinDate}</td>
                          <td className="p-4 text-right pr-6">
                            <div className="flex gap-2 justify-end">
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={() => handleOpenModal(emp)}
                                className="h-8 w-8 p-0 rounded-lg"
                                title="编辑"
                              >
                                <Pencil size={14}/>
                              </Button>
                              <Button 
                                variant="danger" 
                                size="sm"
                                onClick={() => {
                                  if(confirm(`确定重置 ${emp.name} 的密码吗?`)) {
                                      onResetPassword(emp.id);
                                      addToast('密码已重置', 'success');
                                  }
                                }}
                                className="h-8 w-8 p-0 rounded-lg"
                                title="重置密码"
                              >
                                <Wand2 size={14}/>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )})}
                      {employees.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-12 text-center text-nexus-muted">
                              <div className="flex flex-col items-center gap-4">
                                  <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center">
                                      <UserPlus size={24} className="opacity-50"/>
                                  </div>
                                  <p>暂无员工信息，点击右上方按钮录入。</p>
                              </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'leaves' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {leaveRequests.length === 0 ? (
                 <Card className="text-center py-20 text-nexus-muted border-dashed border-2 border-white/5 bg-transparent">
                    <Calendar size={48} className="mx-auto mb-4 opacity-20"/>
                    <p>暂无待处理的请假申请。</p>
                 </Card>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {leaveRequests.map(req => (
                   <Card key={req.id} className="relative overflow-hidden group hover:border-nexus-accent/30 transition-colors">
                     {req.status === LeaveStatus.PENDING && (
                       <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
                     )}
                     
                     <div className="pl-2">
                         <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-white font-bold">
                                    {req.employeeName[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{req.employeeName}</h3>
                                    <div className="text-xs text-nexus-muted font-mono">{req.employeeId}</div>
                                </div>
                            </div>
                            <Badge status={req.status} />
                         </div>

                         <div className="bg-black/20 rounded-xl p-3 mb-4 space-y-2">
                             <div className="flex justify-between text-sm">
                                 <span className="text-nexus-muted">请假时间</span>
                                 <span className="text-white font-mono">{req.startDate} <span className="text-nexus-muted">➔</span> {req.endDate}</span>
                             </div>
                             <div className="flex justify-between text-sm">
                                 <span className="text-nexus-muted">总天数</span>
                                 <span className="text-nexus-accent font-bold">{req.days} 天</span>
                             </div>
                             <div className="border-t border-white/5 pt-2 mt-2">
                                 <span className="text-nexus-muted text-xs block mb-1">理由</span>
                                 <p className="text-sm text-gray-300 italic">"{req.reason}"</p>
                             </div>
                         </div>
                         
                         {req.rejectionReason && (
                           <div className="bg-red-500/10 text-red-300 text-xs p-2 rounded mb-3">
                              拒绝原因: {req.rejectionReason}
                           </div>
                         )}

                         {req.status === LeaveStatus.PENDING && (
                           <div className="flex gap-2 mt-2">
                             {rejectId === req.id ? (
                               <div className="flex items-center gap-2 w-full bg-black/40 p-1 rounded-xl animate-in fade-in slide-in-from-right-5">
                                 <input 
                                   type="text" 
                                   placeholder="填写理由..."
                                   value={rejectReason}
                                   onChange={(e) => setRejectReason(e.target.value)}
                                   className="bg-transparent text-xs w-full text-white px-2 focus:outline-none"
                                   autoFocus
                                 />
                                 <button onClick={() => handleReject(req.id)} className="bg-red-500/20 text-red-400 p-1.5 rounded hover:bg-red-500 hover:text-white transition-colors"><Check size={14}/></button>
                                 <button onClick={() => setRejectId(null)} className="text-nexus-muted p-1.5 hover:text-white"><X size={14}/></button>
                               </div>
                             ) : (
                               <>
                                 <Button variant="success" className="flex-1" size="sm" onClick={() => handleApprove(req.id)}>
                                   <Check size={16} /> 批准
                                 </Button>
                                 <Button variant="danger" className="flex-1" size="sm" onClick={() => setRejectId(req.id)}>
                                   <X size={16} /> 拒绝
                                 </Button>
                               </>
                             )}
                           </div>
                         )}
                     </div>
                   </Card>
                 ))}
                 </div>
               )}
            </div>
          )}

          {activeTab === 'salary' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="min-h-[500px] border-none bg-transparent shadow-none p-0">
                  <div className="bg-nexus-card border border-white/5 rounded-2xl p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-6">
                     <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Calculator size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">工资结算</h2>
                            <p className="text-xs text-nexus-muted">Monthly Payroll</p>
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-4 bg-black/20 p-1 rounded-xl border border-white/5">
                        <button className="p-2 rounded-lg hover:bg-white/5 text-nexus-muted hover:text-white"><span className="text-lg">‹</span></button>
                        <input 
                          type="month" 
                          value={selectedMonth} 
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          className="bg-transparent text-white text-sm font-mono focus:outline-none text-center"
                        />
                        <button className="p-2 rounded-lg hover:bg-white/5 text-nexus-muted hover:text-white"><span className="text-lg">›</span></button>
                     </div>

                     <div className="text-right">
                        <div className="text-xs text-nexus-muted uppercase tracking-wider mb-1">本月预计发放总额</div>
                        <div className="text-2xl font-bold text-emerald-400 font-mono tracking-tight">¥{getTotalPayout().toLocaleString()}</div>
                     </div>
                  </div>
                  
                  <div className="overflow-x-auto rounded-2xl border border-white/5 bg-nexus-card/50 backdrop-blur-sm">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead>
                        <tr className="text-nexus-muted text-xs uppercase tracking-wider border-b border-white/10 bg-white/5">
                          <th className="p-4">员工信息</th>
                          <th className="p-4">底薪 (Basic)</th>
                          <th className="p-4 w-32">业绩 (Sales)</th>
                          <th className="p-4 w-24">提成 (%)</th>
                          <th className="p-4">奖金 (Bonus)</th>
                          <th className="p-4">总计 (Total)</th>
                          <th className="p-4 text-right">操作</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                         {employees.map(emp => (
                           <SalaryRow 
                              key={emp.id} 
                              emp={emp}
                              selectedMonth={selectedMonth}
                              salaryRecords={salaryRecords}
                              onSaveSalary={onSaveSalary}
                              addToast={addToast}
                           />
                         ))}
                         {employees.length === 0 && (
                           <tr><td colSpan={7} className="p-12 text-center text-nexus-muted">暂无员工数据。</td></tr>
                         )}
                      </tbody>
                    </table>
                  </div>
                </Card>
            </div>
          )}
      </div>

      {/* --- ADD/EDIT EMPLOYEE MODAL --- */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? '编辑员工档案' : '录入新员工'}
        footer={
           <div className="flex gap-3">
             <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1">取消</Button>
             <Button 
                variant="primary" 
                onClick={handleFormSubmit} 
                className="flex-1"
                disabled={!editingId && !generatedId} // Disable if generating
             >
               {editingId ? '保存修改' : '确认入职'}
             </Button>
           </div>
        }
      >
         <div className="space-y-6">
            {!editingId && (
               <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        {isGeneratingId ? <div className="animate-spin h-5 w-5 border-2 border-indigo-400 border-t-transparent rounded-full"></div> : <Wand2 size={20} className="text-indigo-400"/>}
                     </div>
                     <div>
                        <div className="text-xs text-indigo-300 uppercase font-bold tracking-wider">系统自动生成工号</div>
                        <div className="text-xl font-mono font-bold text-white tracking-widest">
                           {generatedId || <span className="text-white/20">Waiting...</span>}
                        </div>
                     </div>
                  </div>
                  <div className="text-right text-[10px] text-indigo-300/50">
                     AUTO-GEN<br/>PROTOCOL
                  </div>
               </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="姓名 (中文)" 
                  placeholder="例如：李茹" 
                  value={newEmp.name}
                  onChange={e => setNewEmp({...newEmp, name: e.target.value})}
                  autoFocus
                />
                <Input 
                  label="职位 / Role" 
                  placeholder="例如：销售经理" 
                  value={newEmp.jobTitle}
                  onChange={e => setNewEmp({...newEmp, jobTitle: e.target.value})}
                />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Input 
                type="date" 
                label="入职日期"
                value={newEmp.joinDate}
                onChange={e => setNewEmp({...newEmp, joinDate: e.target.value})}
              />
              <Select 
                label="性别"
                options={[
                  { value: Gender.MALE, label: '男' },
                  { value: Gender.FEMALE, label: '女' }
                ]}
                value={newEmp.gender}
                onChange={e => setNewEmp({...newEmp, gender: e.target.value as Gender})}
              />
            </div>

            <div className="border-t border-white/5 my-4"></div>
            
            <div className="space-y-4">
               <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calculator size={14} className="text-nexus-accent"/> 薪资设定
               </h4>
               <div className="grid grid-cols-2 gap-4">
                  <Input 
                   type="number"
                   label="试用期工资 (¥)"
                   value={newEmp.probationSalary}
                   onChange={e => setNewEmp({...newEmp, probationSalary: Number(e.target.value)})}
                 />
                 <Input 
                   type="number"
                   label="转正工资 (¥)"
                   value={newEmp.fullSalary}
                   onChange={e => setNewEmp({...newEmp, fullSalary: Number(e.target.value)})}
                 />
               </div>
               
               <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                  <div className="w-1/2 pr-4">
                      <Input 
                         type="number"
                         label="试用期 (月)"
                         value={newEmp.probationMonths}
                         onChange={e => setNewEmp({...newEmp, probationMonths: Number(e.target.value)})}
                         className="!bg-black/20"
                       />
                  </div>
                  <div className="w-1/2 text-right">
                      {newEmp.joinDate && (
                         <>
                            <div className="text-xs text-nexus-muted mb-1">预计转正日期</div>
                            <div className="text-sm text-nexus-accent font-mono font-bold">
                               {(() => {
                                  const d = new Date(newEmp.joinDate);
                                  d.setMonth(d.getMonth() + newEmp.probationMonths);
                                  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
                               })()}
                            </div>
                         </>
                      )}
                  </div>
               </div>
            </div>
         </div>
      </Modal>

    </div>
  );
};
