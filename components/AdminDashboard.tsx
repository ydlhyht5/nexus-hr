import React, { useState, useEffect } from 'react';
import { Employee, Gender, LeaveRequest, LeaveStatus, SalaryRecord } from '../types';
import { Card, NeonCard, Button, Input, Select, Badge, Modal, ToastContainer, ToastType } from './UI';
import { generatePinyinInitials } from '../services/geminiService';
import { UserPlus, Calendar, Check, X, Pencil, Calculator, Save, User, KeyRound, Briefcase, DollarSign, Clock, Trash2, LockKeyhole } from 'lucide-react';

interface AdminDashboardProps {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  salaryRecords: SalaryRecord[];
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onResetPassword: (id: string) => void;
  onUpdateLeaveStatus: (id: string, status: LeaveStatus, reason?: string) => void;
  onSaveSalary: (record: SalaryRecord) => void;
  onImportData: (file: File) => void;
  onExportData: () => void;
  onLogout: () => void;
}

// --- Helper Functions ---
const getSalaryStatus = (emp: Employee, monthStr: string): 'NOT_JOINED' | 'PROBATION' | 'OFFICIAL' => {
  if (!emp.joinDate) return 'PROBATION'; 
  
  // Calculate Join Month
  const joinDate = new Date(emp.joinDate);
  const joinYearMonth = joinDate.getFullYear() * 12 + joinDate.getMonth();
  
  // Calculate Selected Month
  const selectedDate = new Date(monthStr + '-01'); // Ensure day 1 to avoid timezone shifts on day 31
  const selectedYearMonth = selectedDate.getFullYear() * 12 + selectedDate.getMonth();

  if (selectedYearMonth < joinYearMonth) {
      return 'NOT_JOINED';
  }

  // Calculate Probation End Month
  const probationEnd = new Date(joinDate);
  probationEnd.setMonth(joinDate.getMonth() + emp.probationMonths);
  const probationTime = probationEnd.getFullYear() * 12 + probationEnd.getMonth();
  
  return selectedYearMonth < probationTime ? 'PROBATION' : 'OFFICIAL';
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
  const isNotJoined = status === 'NOT_JOINED';
  const basicSalary = isNotJoined ? 0 : (status === 'PROBATION' ? emp.probationSalary : emp.fullSalary);

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
    if (isNotJoined) return;
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
    <tr className={`border-b border-white/5 transition-colors group ${isNotJoined ? 'opacity-40 bg-black/20' : 'hover:bg-white/5'}`}>
      <td className="p-4">
        <div className="font-medium text-white flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-xs font-bold shadow-neon">
                {emp.name[0]}
            </div>
            <div>
                <div>{emp.name}</div>
            </div>
        </div>
      </td>
      <td className="p-4">
        {isNotJoined ? (
            <span className="text-xs text-nexus-muted">未入职</span>
        ) : (
            <>
                <Badge status={status} />
                <div className="text-sm font-mono mt-1 text-nexus-text opacity-70">¥{basicSalary.toLocaleString()}</div>
            </>
        )}
      </td>
      <td className="p-4">
        <div className={`flex items-center gap-1 bg-black/20 rounded-lg p-1 border border-white/5 focus-within:border-nexus-accent/50 transition-colors w-28 ${isNotJoined ? 'pointer-events-none' : ''}`}>
           <span className="text-nexus-muted text-xs pl-1">¥</span>
           <input 
              type="number" 
              className="bg-transparent border-none text-sm text-white focus:ring-0 w-full outline-none p-0"
              placeholder="0"
              value={sales}
              onChange={e => setSales(e.target.value)}
              disabled={isNotJoined}
           />
        </div>
      </td>
      <td className="p-4">
        <div className={`flex items-center gap-1 bg-black/20 rounded-lg p-1 border border-white/5 focus-within:border-nexus-accent/50 transition-colors w-20 ${isNotJoined ? 'pointer-events-none' : ''}`}>
           <input 
              type="number" 
              className="bg-transparent border-none text-sm text-white focus:ring-0 w-full outline-none p-0 text-center"
              placeholder="0"
              value={rate}
              onChange={e => setRate(e.target.value)}
              disabled={isNotJoined}
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
            disabled={isNotJoined}
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
  onDeleteEmployee,
  onResetPassword,
  onUpdateLeaveStatus,
  onSaveSalary,
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
    joinDate: new Date().toISOString().split('T')[0], // Default to today
    gender: Gender.MALE,
    probationSalary: 0,
    fullSalary: 0,
    probationMonths: 3
  });
  
  // ID Generation State
  const [generatedId, setGeneratedId] = useState('');
  const [pinyinCache, setPinyinCache] = useState('');

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Calculate Status Logic
  const calculateProbationStatus = () => {
     if (!newEmp.joinDate) return '-';
     const start = new Date(newEmp.joinDate);
     const end = new Date(start);
     end.setMonth(start.getMonth() + newEmp.probationMonths);
     
     if (new Date() >= end) {
         return <span className="text-green-400 font-bold">已转正</span>;
     }
     return end.toLocaleDateString();
  };

  // Instant ID Generator
  const triggerIdGeneration = async () => {
    if (editingId) return; // Do not regen for existing employees
    if (!newEmp.name || !newEmp.joinDate) return;

    // Logic: Extract MM and DD from YYYY-MM-DD
    const dateParts = newEmp.joinDate.split('-'); // [YYYY, MM, DD]
    if (dateParts.length !== 3) return;
    
    const mm = dateParts[1];
    const dd = dateParts[2];
    const dateSuffix = `${mm}${dd}`;

    // Get Initials
    let initials = '';
    // Simple cache check to avoid API spam if name hasn't changed
    if (pinyinCache && newEmp.name === pinyinCache.split('|')[0]) {
        initials = pinyinCache.split('|')[1];
    } else {
        initials = await generatePinyinInitials(newEmp.name);
        setPinyinCache(`${newEmp.name}|${initials}`);
    }

    setGeneratedId(`${initials}${dateSuffix}`);
  };

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
      setGeneratedId(emp.id); 
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
      joinDate: new Date().toISOString().split('T')[0], // Default today
      gender: Gender.MALE,
      probationSalary: 0,
      fullSalary: 0,
      probationMonths: 3
    });
  };

  const handleNameChange = (val: string) => {
    // Only allow letters, chinese characters, and spaces. No numbers or symbols.
    if (/^[a-zA-Z\u4e00-\u9fa5\s]*$/.test(val)) {
        setNewEmp({ ...newEmp, name: val });
    }
  };

  const handleFormSubmit = async () => {
    if (!newEmp.name || !newEmp.joinDate || !newEmp.jobTitle) {
      addToast('请填写完整信息', 'error');
      return;
    }

    if (newEmp.probationSalary > newEmp.fullSalary) {
      addToast('试用期工资不得高于转正工资', 'error');
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
          addToast('工号生成失败，请手动输入或检查姓名', 'error');
          return;
      }
      const newEmployee: Employee = {
        id: generatedId, // Use the generated (and possibly manually edited) ID
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
      // Check if joined
      if (getSalaryStatus(emp, selectedMonth) === 'NOT_JOINED') return sum;

      const record = salaryRecords.find(r => r.id === `${emp.id}_${selectedMonth}`);
      if (record) return sum + record.totalSalary;
      const status = getSalaryStatus(emp, selectedMonth);
      return sum + (status === 'PROBATION' ? emp.probationSalary : emp.fullSalary);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-nexus-dark text-nexus-text p-4 md:p-8">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Central Container */}
      <div className="max-w-6xl mx-auto">

        <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 border-b border-white/5 pb-6">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-nexus-muted tracking-tight">
              棠灿贸易后台管理
            </h1>
            <p className="text-nexus-muted text-xs mt-1 uppercase tracking-widest opacity-60">Nexus HR System v2.0</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={onLogout} size="sm" className="text-xs px-4">
               退出系统
            </Button>
          </div>
        </header>

        {/* Tab Navigation (Centered & Minimal) */}
        <div className="flex justify-center mb-10">
            <div className="bg-white/5 rounded-2xl p-1.5 flex gap-2 border border-white/5 backdrop-blur-md">
                {[
                    { id: 'employees', icon: User, label: '员工档案' },
                    { id: 'leaves', icon: Calendar, label: '请假审批' },
                    { id: 'salary', icon: Calculator, label: '薪资管理' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                            activeTab === tab.id 
                            ? 'bg-nexus-accent text-white shadow-neon' 
                            : 'text-nexus-muted hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <tab.icon size={16} /> {tab.label}
                        {tab.id === 'leaves' && leaveRequests.some(l => l.status === LeaveStatus.PENDING) && (
                           <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1"></span>
                        )}
                    </button>
                ))}
            </div>
        </div>

        {/* --- Content Area --- */}
        <div className="min-h-[600px]">
            {/* 1. EMPLOYEE GRID VIEW */}
            {activeTab === 'employees' && (
              <div className="space-y-6">
                  <div className="flex justify-between items-center px-2">
                      <h2 className="text-white font-bold text-lg">全员名单 <span className="text-nexus-muted font-normal text-sm ml-2">({employees.length}人)</span></h2>
                      <Button onClick={() => handleOpenModal()} icon={<UserPlus size={16} />} size="sm">
                        录入新员工
                      </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {employees.map(emp => {
                          const probationEnd = new Date(emp.joinDate);
                          probationEnd.setMonth(probationEnd.getMonth() + emp.probationMonths);
                          const isProbation = new Date() < probationEnd;

                          return (
                              <NeonCard key={emp.id} onClick={() => handleOpenModal(emp)}>
                                  {/* Header */}
                                  <div className="flex justify-between items-start mb-6">
                                      <div className="flex items-center gap-4">
                                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#1E2030] to-[#0B0C15] border border-white/10 flex items-center justify-center font-bold text-white shadow-inner">
                                              {emp.name[0]}
                                          </div>
                                          <div>
                                              <h3 className="text-lg font-bold text-white leading-none">{emp.name}</h3>
                                              <span className="text-xs text-nexus-muted font-mono tracking-wider">#{emp.id}</span>
                                          </div>
                                      </div>
                                      <Badge status={isProbation ? 'PROBATION' : 'OFFICIAL'} />
                                  </div>

                                  {/* Info Grid */}
                                  <div className="grid grid-cols-2 gap-4 text-sm mb-6 flex-grow">
                                      <div className="bg-white/5 rounded-lg p-3">
                                          <div className="text-[10px] text-nexus-muted uppercase mb-1 flex items-center gap-1"><Briefcase size={10}/> 职位</div>
                                          <div className="text-white font-medium truncate">{emp.jobTitle}</div>
                                      </div>
                                      <div className="bg-white/5 rounded-lg p-3">
                                          <div className="text-[10px] text-nexus-muted uppercase mb-1 flex items-center gap-1"><Calendar size={10}/> 入职</div>
                                          <div className="text-white font-mono truncate">{emp.joinDate}</div>
                                      </div>
                                      <div className="bg-white/5 rounded-lg p-3">
                                          <div className="text-[10px] text-nexus-muted uppercase mb-1 flex items-center gap-1"><DollarSign size={10}/> 试用薪资</div>
                                          <div className="text-white font-mono">¥{emp.probationSalary.toLocaleString()}</div>
                                      </div>
                                      <div className="bg-white/5 rounded-lg p-3">
                                          <div className="text-[10px] text-nexus-muted uppercase mb-1 flex items-center gap-1"><DollarSign size={10}/> 转正薪资</div>
                                          <div className="text-nexus-accent font-mono">¥{emp.fullSalary.toLocaleString()}</div>
                                      </div>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex gap-2 mt-auto pt-4 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                                      <Button 
                                          variant="secondary" 
                                          size="sm" 
                                          className="flex-1 text-xs" 
                                          onClick={() => handleOpenModal(emp)}
                                      >
                                          <Pencil size={12}/> 编辑
                                      </Button>
                                      
                                      <Button 
                                          variant="secondary" 
                                          size="sm" 
                                          className="flex-1 text-xs" 
                                          title="重置密码"
                                          onClick={() => {
                                              if(confirm(`确定要重置 ${emp.name} 的密码为默认密码 (1234) 吗?`)) {
                                                  onResetPassword(emp.id);
                                                  addToast('密码已重置', 'info');
                                              }
                                          }}
                                      >
                                          <LockKeyhole size={12}/> 重置
                                      </Button>

                                      <Button 
                                          variant="danger" 
                                          size="sm" 
                                          className="text-xs px-3" 
                                          title="删除员工"
                                          onClick={() => {
                                              if(confirm(`警告：确定删除 ${emp.name} (工号: ${emp.id}) 吗?\n此操作无法撤销，将删除其所有请假和薪资记录。`)) {
                                                  onDeleteEmployee(emp.id);
                                                  addToast('员工已删除', 'info');
                                              }
                                          }}
                                      >
                                          <Trash2 size={12}/>
                                      </Button>
                                  </div>
                              </NeonCard>
                          );
                      })}
                      
                      {/* Empty State placeholder if needed */}
                      {employees.length === 0 && (
                          <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-2xl bg-white/5">
                              <p className="text-nexus-muted">暂无员工数据</p>
                          </div>
                      )}
                  </div>
              </div>
            )}

            {/* 2. LEAVE REQUESTS */}
            {activeTab === 'leaves' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
                 {leaveRequests.length === 0 ? (
                   <Card className="text-center py-20 text-nexus-muted border-dashed border-2 border-white/5 bg-transparent">
                      <Calendar size={48} className="mx-auto mb-4 opacity-20"/>
                      <p>暂无待处理的请假申请。</p>
                   </Card>
                 ) : (
                   <div className="space-y-4">
                   {leaveRequests.map(req => (
                     <Card key={req.id} className="relative overflow-hidden group hover:border-nexus-accent/30 transition-colors">
                       {req.status === LeaveStatus.PENDING && (
                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500"></div>
                       )}
                       
                       <div className="pl-4 flex flex-col md:flex-row justify-between gap-6">
                           <div className="flex-grow">
                               <div className="flex items-center gap-3 mb-2">
                                   <span className="font-bold text-lg text-white">{req.employeeName}</span>
                                   <Badge status={req.status} />
                               </div>
                               <div className="flex items-center gap-4 text-sm text-nexus-muted mb-4">
                                   <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><Clock size={12}/> {req.days} 天</span>
                                   <span className="font-mono">{req.startDate} ➔ {req.endDate}</span>
                               </div>
                               <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                                   <p className="text-sm text-gray-300">"{req.reason}"</p>
                               </div>
                               {req.rejectionReason && (
                                 <div className="mt-2 text-xs text-red-400">拒绝原因: {req.rejectionReason}</div>
                               )}
                           </div>

                           {req.status === LeaveStatus.PENDING && (
                             <div className="flex flex-col justify-center gap-2 min-w-[140px]">
                               {rejectId === req.id ? (
                                 <div className="bg-black/50 p-2 rounded-xl animate-in fade-in">
                                   <input 
                                     type="text" 
                                     placeholder="拒绝理由..."
                                     value={rejectReason}
                                     onChange={(e) => setRejectReason(e.target.value)}
                                     className="bg-transparent text-xs w-full text-white mb-2 border-b border-white/20 focus:outline-none py-1"
                                     autoFocus
                                   />
                                   <div className="flex gap-2">
                                       <button onClick={() => handleReject(req.id)} className="bg-red-500 text-white text-xs px-2 py-1 rounded flex-1">确认</button>
                                       <button onClick={() => setRejectId(null)} className="text-xs text-nexus-muted px-2 py-1">取消</button>
                                   </div>
                                 </div>
                               ) : (
                                 <>
                                   <Button variant="success" size="sm" onClick={() => handleApprove(req.id)}>
                                     <Check size={16} /> 批准
                                   </Button>
                                   <Button variant="danger" size="sm" onClick={() => setRejectId(req.id)}>
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

            {/* 3. SALARY TABLE */}
            {activeTab === 'salary' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="min-h-[500px] border-none bg-transparent shadow-none p-0">
                    <div className="bg-nexus-card border border-white/5 rounded-2xl p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-6">
                       <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                              <Calculator size={24} className="text-white" />
                          </div>
                          <div>
                              <h2 className="text-xl font-bold text-white">工资结算表</h2>
                              <p className="text-xs text-nexus-muted">Monthly Payroll</p>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-4 bg-black/20 p-1 rounded-xl border border-white/5">
                          <input 
                            type="month" 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent text-white text-sm font-mono focus:outline-none text-center px-4 py-1"
                          />
                       </div>

                       <div className="text-right">
                          <div className="text-xs text-nexus-muted uppercase tracking-wider mb-1">本月发放总额</div>
                          <div className="text-2xl font-bold text-emerald-400 font-mono tracking-tight">¥{getTotalPayout().toLocaleString()}</div>
                       </div>
                    </div>
                    
                    <div className="overflow-x-auto rounded-2xl border border-white/5 bg-nexus-card/50 backdrop-blur-sm">
                      <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                          <tr className="text-nexus-muted text-xs uppercase tracking-wider border-b border-white/10 bg-white/5">
                            <th className="p-4 pl-6">员工</th>
                            <th className="p-4">底薪</th>
                            <th className="p-4 w-32">销售业绩</th>
                            <th className="p-4 w-24">提成%</th>
                            <th className="p-4">奖金</th>
                            <th className="p-4">实发工资</th>
                            <th className="p-4 text-right pr-6">状态</th>
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
                        </tbody>
                      </table>
                    </div>
                  </Card>
              </div>
            )}
        </div>

      </div>

      {/* --- ADD/EDIT EMPLOYEE MODAL (Clean & Symmetrical) --- */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? '编辑员工信息' : '新员工入职'}
        footer={
           <div className="flex gap-4">
             <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1">取消</Button>
             <Button 
                variant="primary" 
                onClick={handleFormSubmit} 
                className="flex-1"
             >
               {editingId ? '保存修改' : '确认入职'}
             </Button>
           </div>
        }
      >
         <div className="space-y-6">
            {/* ID Preview Header */}
            {!editingId && (
               <div className="text-center py-4 bg-white/5 rounded-2xl border border-white/5 mb-6 relative">
                  <div className="text-xs text-nexus-muted uppercase tracking-widest mb-2">系统自动生成工号 (可点击修改)</div>
                  
                  {/* Editable ID Field */}
                  <div className="flex justify-center">
                    <input 
                      type="text" 
                      value={generatedId}
                      onChange={(e) => setGeneratedId(e.target.value)}
                      className="bg-transparent text-3xl font-mono font-bold text-white tracking-widest text-center focus:outline-none focus:ring-0 w-full max-w-md border-b border-transparent hover:border-white/10 focus:border-nexus-accent transition-all"
                      placeholder="----"
                    />
                  </div>
                  
                  <div className="text-[10px] text-nexus-muted mt-2 opacity-60">规则: 拼音首字母 + 入职月日 (如 db1001)</div>
               </div>
            )}

            <div className="grid grid-cols-2 gap-6">
                <Input 
                  label="姓名 (中文/英文)" 
                  placeholder="如: 李茹 或 Mike" 
                  value={newEmp.name}
                  onChange={e => handleNameChange(e.target.value)}
                  onBlur={() => triggerIdGeneration()} // Instant generation on blur
                  autoFocus
                />
                <Input 
                  type="date" 
                  label="入职日期"
                  value={newEmp.joinDate}
                  onChange={e => {
                      setNewEmp({...newEmp, joinDate: e.target.value});
                      // Trigger generation if name is already there
                      if(newEmp.name) setTimeout(triggerIdGeneration, 0);
                  }}
                />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
                <Input 
                  label="职位名称" 
                  placeholder="如: 销售经理" 
                  value={newEmp.jobTitle}
                  onChange={e => setNewEmp({...newEmp, jobTitle: e.target.value})}
                />
                <Select 
                  label="性别"
                  options={[
                    { value: Gender.MALE, label: '男' },
                    { value: Gender.FEMALE, label: '女' },
                    { value: Gender.OTHER, label: '其他' }
                  ]}
                  value={newEmp.gender}
                  onChange={e => setNewEmp({...newEmp, gender: e.target.value as Gender})}
                />
            </div>

            <div className="border-t border-white/5 my-2"></div>
            
            <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                <h4 className="text-xs font-bold text-nexus-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                   <DollarSign size={12} /> 薪资结构设定
                </h4>
                <div className="grid grid-cols-2 gap-6 mb-4">
                   <Input 
                    type="number"
                    label="试用期工资"
                    value={newEmp.probationSalary}
                    onChange={e => setNewEmp({...newEmp, probationSalary: Number(e.target.value)})}
                    className="!bg-nexus-card"
                  />
                  <Input 
                    type="number"
                    label="转正后工资"
                    value={newEmp.fullSalary}
                    onChange={e => setNewEmp({...newEmp, fullSalary: Number(e.target.value)})}
                    className="!bg-nexus-card"
                  />
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <Input 
                           type="number"
                           label="试用期时长 (月)"
                           value={newEmp.probationMonths}
                           onChange={e => setNewEmp({...newEmp, probationMonths: Number(e.target.value)})}
                           className="!bg-nexus-card"
                         />
                    </div>
                    <div className="flex-1 text-right pt-6">
                        <span className="text-xs text-nexus-muted">预计转正: </span>
                        <span className="text-sm font-mono text-nexus-accent">
                           {calculateProbationStatus()}
                        </span>
                    </div>
                </div>
            </div>
         </div>
      </Modal>

    </div>
  );
};
