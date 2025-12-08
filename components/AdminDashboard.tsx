import React, { useState, useEffect, useRef } from 'react';
import { Employee, Gender, LeaveRequest, LeaveStatus, SalaryRecord } from '../types';
import { Card, NeonCard, Button, Input, CustomSelect, CustomDatePicker, CustomMonthPicker, Badge, Modal, ToastContainer, ToastType, BarChart, Avatar, Pagination } from './UI';
import { generatePinyinInitials } from '../services/geminiService';
import { UserPlus, Calendar, Check, X, Pencil, Calculator, Save, User, KeyRound, Briefcase, DollarSign, Clock, Trash2, LockKeyhole, AlertTriangle, BarChart3, TrendingUp, Search, ChevronRight } from 'lucide-react';

interface AdminDashboardProps {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  salaryRecords: SalaryRecord[];
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onResetPassword: (id: string, newPass?: string) => void;
  onUpdateLeaveStatus: (id: string, status: LeaveStatus, reason?: string) => void;
  onSaveSalary: (record: SalaryRecord) => void;
  onImportData: (file: File) => void;
  onExportData: () => void;
  onLogout: () => void;
}

// --- Helper Functions ---

const getPreviousMonth = (monthStr: string): string => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 2, 1); 
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getSalaryStatus = (emp: Employee, workMonthStr: string): 'NOT_JOINED' | 'PROBATION' | 'OFFICIAL' => {
  if (!emp.joinDate) return 'PROBATION'; 
  
  const joinDate = new Date(emp.joinDate);
  const joinYearMonth = joinDate.getFullYear() * 12 + joinDate.getMonth();
  
  const workDate = new Date(workMonthStr + '-01');
  const workYearMonth = workDate.getFullYear() * 12 + workDate.getMonth();

  if (workYearMonth < joinYearMonth) {
      return 'NOT_JOINED';
  }

  const probationEnd = new Date(joinDate);
  probationEnd.setMonth(joinDate.getMonth() + emp.probationMonths);
  const probationTime = probationEnd.getFullYear() * 12 + probationEnd.getMonth();
  
  return workYearMonth < probationTime ? 'PROBATION' : 'OFFICIAL';
};

const isWorkDay = (date: Date): boolean => {
    const day = date.getDay();
    if (day === 0) return false; 
    if (day >= 1 && day <= 5) return true; 

    const year = date.getFullYear();
    const month = date.getMonth();
    const dayOfMonth = date.getDate();

    let saturdayIndex = -1;
    let count = 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let d = 1; d <= daysInMonth; d++) {
        const tempDate = new Date(year, month, d);
        if (tempDate.getDay() === 6) {
            if (d === dayOfMonth) {
                saturdayIndex = count;
                break;
            }
            count++;
        }
    }
    return saturdayIndex !== -1 && saturdayIndex % 2 !== 0;
};

const getMonthlyStandardDays = (monthStr: string): number => {
    const [year, month] = monthStr.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    let workDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
        if (isWorkDay(new Date(year, month - 1, d))) {
            workDays++;
        }
    }
    return workDays;
};

const calculateActualWorkDays = (emp: Employee, monthStr: string): number => {
    const [year, month] = monthStr.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const joinDate = new Date(emp.joinDate);

    joinDate.setHours(0,0,0,0);
    monthStart.setHours(0,0,0,0);
    monthEnd.setHours(0,0,0,0);

    if (joinDate > monthEnd) return 0;

    const startDate = joinDate > monthStart ? joinDate : monthStart;
    
    let workDays = 0;
    const current = new Date(startDate);
    
    while (current <= monthEnd) {
        if (isWorkDay(current)) {
            workDays++;
        }
        current.setDate(current.getDate() + 1);
    }
    return workDays;
};

const calculateLeaveDaysInMonth = (requests: LeaveRequest[], empId: string, monthStr: string): number => {
    const [year, month] = monthStr.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0); 

    const approved = requests.filter(r => 
        r.employeeId === empId && 
        r.status === LeaveStatus.APPROVED
    );

    let leaveWorkDays = 0;

    approved.forEach(req => {
        let current = new Date(req.startDate);
        const end = new Date(req.endDate);

        if (current < monthStart) current = new Date(monthStart);
        const effectiveEnd = end > monthEnd ? monthEnd : end;

        while (current <= effectiveEnd) {
            if (isWorkDay(current)) {
                leaveWorkDays++;
            }
            current.setDate(current.getDate() + 1);
        }
    });

    return leaveWorkDays;
};

// ... SalaryRow Component (kept the same) ...
const SalaryRow: React.FC<{
  emp: Employee;
  payoutMonth: string;
  workMonth: string;
  salaryRecords: SalaryRecord[];
  leaveRequests: LeaveRequest[];
  onSaveSalary: (record: SalaryRecord) => void;
  addToast: (msg: string, type: ToastType) => void;
}> = ({ emp, payoutMonth, workMonth, salaryRecords, leaveRequests, onSaveSalary, addToast }) => {
  const recordId = `${emp.id}_${payoutMonth}`;
  const existingRecord = salaryRecords.find(r => r.id === recordId);
  const status = getSalaryStatus(emp, workMonth);
  const isNotJoined = status === 'NOT_JOINED';
  
  const baseSalarySetting = status === 'PROBATION' ? emp.probationSalary : emp.fullSalary;
  const monthlyStandardDays = getMonthlyStandardDays(workMonth);
  const potentialWorkDays = isNotJoined ? 0 : calculateActualWorkDays(emp, workMonth);
  const leaveDays = isNotJoined ? 0 : calculateLeaveDaysInMonth(leaveRequests, emp.id, workMonth);
  const systemNetWorkDays = Math.max(0, potentialWorkDays - leaveDays);

  const [sales, setSales] = useState(isNotJoined ? '0' : (existingRecord?.salesAmount?.toString() || ''));
  const [rate, setRate] = useState(isNotJoined ? '0' : (existingRecord?.bonusRate?.toString() || ''));
  const [manualDays, setManualDays] = useState(isNotJoined ? '0' : (existingRecord?.manualWorkDays?.toString() || '0'));
  const [attBonus, setAttBonus] = useState(isNotJoined ? '0' : (existingRecord?.attendanceBonus?.toString() || '0'));

  useEffect(() => {
     if (isNotJoined) {
         setSales('0');
         setRate('0');
         setManualDays('0');
         setAttBonus('0');
     } else {
         const rec = salaryRecords.find(r => r.id === `${emp.id}_${payoutMonth}`);
         setSales(rec?.salesAmount?.toString() || '');
         setRate(rec?.bonusRate?.toString() || '');
         setManualDays(rec?.manualWorkDays?.toString() || '0');
         setAttBonus(rec?.attendanceBonus?.toString() || '0');
     }
  }, [payoutMonth, salaryRecords, emp.id, isNotJoined]);

  const salesNum = parseFloat(sales) || 0;
  const rateNum = parseFloat(rate) || 0;
  const manualDaysNum = parseFloat(manualDays) || 0;
  const attBonusNum = parseFloat(attBonus) || 0; 
  
  const finalDays = manualDaysNum > 0 ? manualDaysNum : systemNetWorkDays;
  const dailyRate = monthlyStandardDays > 0 ? (baseSalarySetting / monthlyStandardDays) : 0;
  const calculatedBaseSalary = isNotJoined ? 0 : (dailyRate * finalDays);
  
  const standardSalaryForMonth = isNotJoined ? 0 : baseSalarySetting; 
  const leaveDeductionAmount = isNotJoined ? 0 : (dailyRate * leaveDays);

  const bonus = salesNum * (rateNum / 100);
  const total = calculatedBaseSalary + bonus + attBonusNum;

  const handleSave = () => {
    if (isNotJoined) return;
    if (salesNum < 0 || rateNum < 0 || manualDaysNum < 0 || attBonusNum < 0) {
        addToast('数值不能为负数', 'error');
        return;
    }

    const record: SalaryRecord = {
      id: recordId,
      employeeId: emp.id,
      employeeName: emp.name,
      month: payoutMonth,
      basicSalary: Math.round(calculatedBaseSalary), 
      manualWorkDays: manualDaysNum,
      standardSalary: Math.round(standardSalaryForMonth), 
      leaveDeduction: Math.round(manualDaysNum > 0 ? 0 : leaveDeductionAmount), 
      salesAmount: salesNum,
      bonusRate: rateNum,
      bonusAmount: Math.round(bonus),
      attendanceBonus: Math.round(attBonusNum), 
      totalSalary: Math.round(total),
      updatedAt: Date.now()
    };
    onSaveSalary(record);
    addToast('工资条已保存', 'success');
  };

  const isSaved = existingRecord && 
    Math.abs(existingRecord.totalSalary - Math.round(total)) < 1;

  return (
    <tr className={`border-b border-white/5 transition-colors group ${isNotJoined ? 'opacity-40 bg-black/20' : 'hover:bg-white/5'}`}>
      <td className="p-4">
        <div className="font-medium text-white flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-xs font-bold shadow-neon">
                {emp.name[0]}
            </div>
            <div>
                <div>{emp.name}</div>
                {!isNotJoined && (
                    <div className="text-[10px] text-nexus-muted flex flex-col">
                        <span>系统算: {systemNetWorkDays}天</span>
                        <span className="opacity-70">(应勤{potentialWorkDays} - 请假{leaveDays})</span>
                    </div>
                )}
            </div>
        </div>
      </td>
      <td className="p-4">
        {isNotJoined ? (
            <span className="text-xs text-nexus-muted">未入职</span>
        ) : (
            <>
                <Badge status={status} />
                <div className="text-[10px] text-nexus-muted mt-1" title={`本月满勤: ${monthlyStandardDays}天`}>日薪 ¥{dailyRate.toFixed(0)}</div>
            </>
        )}
      </td>
      <td className="p-4">
         <div className={`flex items-center gap-2 bg-black/20 rounded-lg p-1 border border-white/5 w-24 ${isNotJoined ? 'pointer-events-none opacity-50' : ''}`}>
             <input 
                type="number"
                className="bg-transparent border-none text-sm text-nexus-accent font-bold w-full outline-none text-center p-0"
                placeholder="0"
                min="0"
                value={manualDays}
                onChange={e => setManualDays(e.target.value)}
                disabled={isNotJoined}
             />
             <span className="text-[10px] text-nexus-muted pr-1">天</span>
         </div>
      </td>
      <td className="p-4">
         <div className={`flex items-center gap-1 bg-black/20 rounded-lg p-1 border border-white/5 w-20 ${isNotJoined ? 'pointer-events-none opacity-50' : ''}`}>
             <span className="text-nexus-muted text-xs pl-1">¥</span>
             <input 
                type="number"
                className="bg-transparent border-none text-sm text-yellow-400 font-bold w-full outline-none p-0"
                value={attBonus}
                onChange={e => setAttBonus(e.target.value)}
                disabled={isNotJoined}
             />
         </div>
      </td>
      <td className="p-4">
        <div className={`flex items-center gap-1 bg-black/20 rounded-lg p-1 border border-white/5 w-28 ${isNotJoined ? 'pointer-events-none opacity-50' : ''}`}>
           <span className="text-nexus-muted text-xs pl-1">¥</span>
           <input 
              type="number" 
              className="bg-transparent border-none text-sm text-white w-full outline-none p-0"
              value={sales}
              onChange={e => setSales(e.target.value)}
              disabled={isNotJoined}
           />
        </div>
      </td>
      <td className="p-4">
        <div className={`flex items-center gap-1 bg-black/20 rounded-lg p-1 border border-white/5 w-20 ${isNotJoined ? 'pointer-events-none opacity-50' : ''}`}>
           <input 
              type="number" 
              className="bg-transparent border-none text-sm text-white w-full outline-none p-0 text-center"
              value={rate}
              onChange={e => setRate(e.target.value)}
              disabled={isNotJoined}
           />
           <span className="text-nexus-muted text-xs pr-1">%</span>
        </div>
      </td>
      <td className="p-4 font-mono text-green-400">
        +¥{Math.round(bonus).toLocaleString()}
      </td>
      <td className="p-4">
        <div className="font-bold text-lg text-white font-mono">¥{Math.round(total).toLocaleString()}</div>
        <div className="text-[10px] text-nexus-muted">基本工资: {Math.round(calculatedBaseSalary).toLocaleString()}</div>
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
  onImportData,
  onExportData,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'employees' | 'leaves' | 'salary' | 'reports'>('employees');
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([]);
  const addToast = (message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const prevPendingRef = useRef(0);
  const activeLeaveRequests = leaveRequests.filter(req => 
      employees.some(e => e.id === req.employeeId)
  );
  
  // -- Leave Filter & Pagination State --
  const [leaveFilterMonth, setLeaveFilterMonth] = useState(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [leavePage, setLeavePage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
      const currentPending = activeLeaveRequests.filter(r => r.status === LeaveStatus.PENDING).length;
      if (currentPending > prevPendingRef.current) {
          addToast('收到新的请假申请', 'info');
      }
      prevPendingRef.current = currentPending;
  }, [leaveRequests, employees]); 

  // Reset pagination when filter changes
  useEffect(() => {
      setLeavePage(1);
  }, [leaveFilterMonth]);

  // Leave Filtering & Sorting Logic
  const filteredLeaves = activeLeaveRequests.filter(req => {
      return req.startDate.startsWith(leaveFilterMonth);
  });
  // Sort by Start Date (Newest first)
  const sortedLeaves = filteredLeaves.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  
  const totalLeavePages = Math.ceil(sortedLeaves.length / ITEMS_PER_PAGE);
  const paginatedLeaves = sortedLeaves.slice((leavePage - 1) * ITEMS_PER_PAGE, leavePage * ITEMS_PER_PAGE);

  // ... (Other state vars) ...
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{id: string, name: string} | null>(null);
  const [companyPeriod, setCompanyPeriod] = useState<6 | 12>(6);
  const [employeePeriod, setEmployeePeriod] = useState<6 | 12>(6);
  const [reportEmployeeId, setReportEmployeeId] = useState<string | null>(null);
  const [reportSearch, setReportSearch] = useState('');
  const [newEmp, setNewEmp] = useState({
    name: '',
    jobTitle: '',
    joinDate: new Date().toISOString().split('T')[0],
    gender: Gender.MALE,
    probationSalary: 0,
    fullSalary: 0,
    probationMonths: 3
  });
  const [generatedId, setGeneratedId] = useState('');
  const [pinyinCache, setPinyinCache] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const workMonth = getPreviousMonth(selectedMonth);

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

  const triggerIdGeneration = async () => {
    if (editingId) return;
    if (!newEmp.name || !newEmp.joinDate) return;

    const dateParts = newEmp.joinDate.split('-'); 
    if (dateParts.length !== 3) return;
    const dateSuffix = `${dateParts[1]}${dateParts[2]}`;

    let initials = '';
    if (pinyinCache && newEmp.name === pinyinCache.split('|')[0]) {
        initials = pinyinCache.split('|')[1];
    } else {
        initials = await generatePinyinInitials(newEmp.name);
        setPinyinCache(`${newEmp.name}|${initials}`);
    }
    setGeneratedId(`${initials}${dateSuffix}`);
  };

  // FIX: Removed newEmp.name from dependency to prevent re-render during typing
  useEffect(() => {
      if (isModalOpen && !editingId) {
          triggerIdGeneration();
      }
  }, [newEmp.joinDate]);

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
      joinDate: new Date().toISOString().split('T')[0],
      gender: Gender.MALE,
      probationSalary: 0,
      fullSalary: 0,
      probationMonths: 3
    });
  };

  const handleNameChange = (val: string) => {
    if (/^[a-zA-Z\u4e00-\u9fa5\s]*$/.test(val)) {
        setNewEmp({ ...newEmp, name: val });
    }
  };

  const handleFormSubmit = async () => {
    if (!newEmp.name || !newEmp.joinDate || !newEmp.jobTitle) {
      addToast('请填写完整信息', 'error');
      return;
    }

    if (editingId) {
      const original = employees.find(e => e.id === editingId);
      if (original) {
        const updatedEmployee: Employee = { ...original, ...newEmp };
        onUpdateEmployee(updatedEmployee);
        addToast(`员工信息已更新`, 'success');
      }
    } else {
      if (!generatedId) {
          addToast('工号生成失败', 'error');
          return;
      }
      const newEmployee: Employee = {
        id: generatedId, 
        ...newEmp,
        password: '1234',
        isFirstLogin: true
      };
      onAddEmployee(newEmployee);
      addToast(`员工已创建`, 'success');
    }

    setIsModalOpen(false);
    resetForm();
  };

  const openResetModal = (id: string) => {
      setResetTargetId(id);
      setNewResetPassword('');
      setIsResetModalOpen(true);
  };
  
  const handleResetSubmit = () => {
      if (!resetTargetId) return;
      if (!newResetPassword) {
          addToast('请输入新密码', 'error');
          return;
      }
      onResetPassword(resetTargetId, newResetPassword);
      addToast('密码已重置', 'success');
      setIsResetModalOpen(false);
  };
  
  const handleConfirmDelete = () => {
      if (deleteTarget) {
          onDeleteEmployee(deleteTarget.id);
          addToast(`${deleteTarget.name} 已被删除`, 'info');
          setDeleteTarget(null);
      }
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
      if (getSalaryStatus(emp, workMonth) === 'NOT_JOINED') return sum;
      const record = salaryRecords.find(r => r.id === `${emp.id}_${selectedMonth}`);
      if (record) return sum + record.totalSalary;
      return sum; 
    }, 0);
  };

  const getChartData = (period: 6 | 12, targetEmpId: string | 'all') => {
    const data = [];
    const now = new Date();
    for (let i = period - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const payoutMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        // DISPLAY LABEL should be the WORK MONTH (Previous Month), e.g. "2025-11" for Dec payout
        const displayLabel = getPreviousMonth(payoutMonthStr);
        
        let value = 0;
        let details = undefined;

        if (targetEmpId === 'all') {
            value = salaryRecords
                .filter(r => r.month === payoutMonthStr)
                .reduce((acc, r) => acc + r.totalSalary, 0);
        } else {
            const rec = salaryRecords.find(r => r.month === payoutMonthStr && r.employeeId === targetEmpId);
            if (rec) {
              value = rec.totalSalary;
              const systemNetWorkDays = rec.manualWorkDays && rec.manualWorkDays > 0 ? rec.manualWorkDays : undefined;
              
              const stdDays = getMonthlyStandardDays(displayLabel);

              details = {
                base: rec.standardSalary || rec.basicSalary,
                deduction: rec.leaveDeduction || 0,
                bonus: rec.bonusAmount,
                attendanceBonus: rec.attendanceBonus,
                real: rec.totalSalary,
                days: systemNetWorkDays || Math.round((rec.basicSalary / (rec.standardSalary || 1)) * stdDays), 
                standardDays: stdDays 
              };
              
              if (rec.standardSalary && rec.standardSalary > 0 && rec.basicSalary !== undefined) {
                  const calculatedDays = Math.round((rec.basicSalary * stdDays) / rec.standardSalary);
                  details.days = rec.manualWorkDays && rec.manualWorkDays > 0 ? rec.manualWorkDays : calculatedDays;
              }
            }
        }
        data.push({
            label: displayLabel, 
            value: Math.round(value),
            subLabel: targetEmpId === 'all' ? '公司总支出' : '个人收入',
            details: details
        });
    }
    return data;
  };

  const reportEmployees = employees.filter(e => 
      e.name.toLowerCase().includes(reportSearch.toLowerCase()) || 
      e.id.toLowerCase().includes(reportSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-nexus-dark text-nexus-text p-4 md:p-8">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="max-w-6xl mx-auto">
        {/* Header */}
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

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-10">
            <div className="bg-white/5 rounded-2xl p-1.5 flex gap-2 border border-white/5 backdrop-blur-md">
                {[
                    { id: 'employees', icon: User, label: '员工档案' },
                    { id: 'leaves', icon: Calendar, label: '请假审批' },
                    { id: 'salary', icon: Calculator, label: '薪资管理' },
                    { id: 'reports', icon: BarChart3, label: '报表概览' }
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
                        {tab.id === 'leaves' && activeLeaveRequests.some(l => l.status === LeaveStatus.PENDING) && (
                           <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1"></span>
                        )}
                    </button>
                ))}
            </div>
        </div>

        {/* Content Area */}
        <div className="min-h-[600px]">
            {activeTab === 'employees' && (
              <div className="space-y-6">
                  {/* ... Employee Grid ... */}
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
                                  <div className="flex gap-2 mt-auto pt-4 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                                      <Button variant="secondary" size="sm" className="flex-1 text-xs" onClick={() => handleOpenModal(emp)}>
                                          <Pencil size={12}/> 编辑
                                      </Button>
                                      <Button variant="secondary" size="sm" className="flex-1 text-xs" onClick={() => openResetModal(emp.id)}>
                                          <LockKeyhole size={12}/> 重置
                                      </Button>
                                      <Button variant="danger" size="sm" className="text-xs px-3" onClick={() => setDeleteTarget({ id: emp.id, name: emp.name })}>
                                          <Trash2 size={12}/>
                                      </Button>
                                  </div>
                              </NeonCard>
                          );
                      })}
                  </div>
              </div>
            )}

            {/* LEAVES TAB */}
            {activeTab === 'leaves' && (
              <div className="max-w-4xl mx-auto space-y-6">
                 {/* Filter Header - Added relative z-20 */}
                 <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-md relative z-20">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Calendar size={20} className="text-nexus-accent"/> 请假审批列表
                    </h2>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-nexus-muted uppercase tracking-wider">筛选月份:</span>
                        <div className="w-40">
                            <CustomMonthPicker value={leaveFilterMonth} onChange={setLeaveFilterMonth} />
                        </div>
                    </div>
                 </div>

                 {paginatedLeaves.length === 0 ? (
                   <Card className="text-center py-20 text-nexus-muted border-dashed border-2 border-white/5 bg-transparent animate-in fade-in">
                      <Calendar size={48} className="mx-auto mb-4 opacity-20"/>
                      <p>{leaveFilterMonth} 无相关请假记录。</p>
                   </Card>
                 ) : (
                   <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                   {paginatedLeaves.map(req => (
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
                 
                 {/* Pagination Controls */}
                 <Pagination 
                    currentPage={leavePage} 
                    totalPages={totalLeavePages} 
                    onPageChange={setLeavePage} 
                 />
              </div>
            )}

            {/* SALARY TAB */}
            {activeTab === 'salary' && (
              <div>
                  <Card className="min-h-[500px] border-none bg-transparent shadow-none p-0">
                    {/* Added relative z-20 to header */}
                    <div className="bg-nexus-card border border-white/5 rounded-2xl p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-6 relative z-20">
                       <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                              <Calculator size={24} className="text-white" />
                          </div>
                          <div>
                              <h2 className="text-xl font-bold text-white">工资结算表</h2>
                              <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                                  <Clock size={10} /> 计薪周期: {workMonth}
                              </div>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-4">
                          <CustomMonthPicker
                            value={selectedMonth} 
                            onChange={setSelectedMonth}
                          />
                       </div>

                       <div className="text-right">
                          <div className="text-xs text-nexus-muted uppercase tracking-wider mb-1">本月发放总额</div>
                          <div className="text-2xl font-bold text-emerald-400 font-mono tracking-tight">¥{Math.round(getTotalPayout()).toLocaleString()}</div>
                       </div>
                    </div>
                    
                    <div className="overflow-x-auto rounded-2xl border border-white/5 bg-nexus-card/50 backdrop-blur-sm">
                      <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                          <tr className="text-nexus-muted text-xs uppercase tracking-wider border-b border-white/10 bg-white/5">
                            <th className="p-4 pl-6">员工</th>
                            <th className="p-4">底薪 (计薪月)</th>
                            <th className="p-4 w-32 bg-emerald-500/5 border-x border-white/5">实际出勤 (人工)</th>
                            <th className="p-4 w-24">全勤奖</th>
                            <th className="p-4 w-32">销售业绩</th>
                            <th className="p-4 w-24">提成%</th>
                            <th className="p-4">奖金</th>
                            <th className="p-4">实发工资</th>
                            <th className="p-4 text-right pr-6">操作</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                           {employees.map(emp => (
                             <SalaryRow 
                                key={emp.id} 
                                emp={emp}
                                payoutMonth={selectedMonth}
                                workMonth={workMonth}
                                salaryRecords={salaryRecords}
                                leaveRequests={leaveRequests}
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

            {/* REPORTS TAB (Kept same) */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                 {/* ... (Kept same) ... */}
                 <Card className="bg-[#0B0C15]/50">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                             <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400">
                                 <TrendingUp size={20} />
                             </div>
                             <div>
                                 <div className="text-xs text-nexus-muted uppercase tracking-wider">公司薪资总支出</div>
                                 <div className="text-2xl font-bold text-white font-mono mt-1">
                                     ¥{Math.round(getChartData(companyPeriod, 'all').reduce((acc, curr) => acc + curr.value, 0)).toLocaleString()}
                                 </div>
                             </div>
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl">
                            <button onClick={() => setCompanyPeriod(6)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${companyPeriod === 6 ? 'bg-nexus-accent text-white' : 'text-nexus-muted hover:text-white'}`}>最近半年</button>
                            <button onClick={() => setCompanyPeriod(12)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${companyPeriod === 12 ? 'bg-nexus-accent text-white' : 'text-nexus-muted hover:text-white'}`}>最近一年</button>
                        </div>
                    </div>
                    <BarChart data={getChartData(companyPeriod, 'all')} height={250} />
                 </Card>

                 <Card className="bg-[#0B0C15]/50">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h3 className="text-md font-bold text-white flex items-center gap-2">
                            <User size={16} /> 员工个人趋势
                        </h3>
                        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl self-end">
                            <button onClick={() => setEmployeePeriod(6)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${employeePeriod === 6 ? 'bg-purple-600 text-white' : 'text-nexus-muted hover:text-white'}`}>最近半年</button>
                            <button onClick={() => setEmployeePeriod(12)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${employeePeriod === 12 ? 'bg-purple-600 text-white' : 'text-nexus-muted hover:text-white'}`}>最近一年</button>
                        </div>
                    </div>

                    <div className="mb-6 space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-nexus-muted" size={14} />
                            <input 
                                type="text"
                                placeholder="搜索员工..."
                                value={reportSearch}
                                onChange={(e) => setReportSearch(e.target.value)}
                                className="w-full bg-black/20 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-purple-500/50"
                            />
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                            <div 
                                onClick={() => setReportEmployeeId(null)}
                                className={`flex-shrink-0 cursor-pointer flex flex-col items-center gap-2 group`}
                            >
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center border transition-all ${!reportEmployeeId ? 'bg-purple-600/20 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-white/5 border-white/10 text-nexus-muted hover:bg-white/10'}`}>
                                    <BarChart3 size={20} />
                                </div>
                                <span className={`text-[10px] ${!reportEmployeeId ? 'text-purple-400 font-bold' : 'text-nexus-muted'}`}>暂不选择</span>
                            </div>

                            {reportEmployees.map(emp => (
                                <div key={emp.id} className="flex-shrink-0 flex flex-col items-center gap-2">
                                    <Avatar name={emp.name} selected={reportEmployeeId === emp.id} onClick={() => setReportEmployeeId(emp.id)} />
                                    <span className={`text-[10px] truncate max-w-[60px] ${reportEmployeeId === emp.id ? 'text-purple-400 font-bold' : 'text-nexus-muted'}`}>{emp.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {reportEmployeeId ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="mb-2 text-xs text-purple-400 font-bold flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                                当前查看: {employees.find(e => e.id === reportEmployeeId)?.name}
                             </div>
                             <BarChart data={getChartData(employeePeriod, reportEmployeeId)} height={200} colorStart="from-purple-600" colorEnd="to-indigo-600" />
                        </div>
                    ) : (
                        <div className="h-[200px] flex flex-col items-center justify-center text-nexus-muted border-2 border-dashed border-white/5 rounded-2xl bg-white/5">
                            <User size={32} className="opacity-20 mb-2" />
                            <p className="text-xs">请点击上方头像选择员工查看详情</p>
                        </div>
                    )}
                 </Card>
              </div>
            )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? '编辑员工信息' : '新员工入职'} footer={
           <div className="flex gap-4">
             <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1">取消</Button>
             <Button variant="primary" onClick={handleFormSubmit} className="flex-1">{editingId ? '保存修改' : '确认入职'}</Button>
           </div>
        }>
         <div className="space-y-6">
            {!editingId && (
               <div className="text-center py-4 bg-white/5 rounded-2xl border border-white/5 mb-6 relative">
                  <div className="text-xs text-nexus-muted uppercase tracking-widest mb-2">系统自动生成工号 (可点击修改)</div>
                  <div className="flex justify-center">
                    <input type="text" value={generatedId} onChange={(e) => setGeneratedId(e.target.value)} className="bg-transparent text-3xl font-mono font-bold text-white tracking-widest text-center focus:outline-none focus:ring-0 w-full max-w-md border-b border-transparent hover:border-white/10 focus:border-nexus-accent transition-all" placeholder="----" />
                  </div>
                  <div className="text-[10px] text-nexus-muted mt-2 opacity-60">规则: 拼音首字母 + 入职月日 (如 db1001)</div>
               </div>
            )}
            <div className="grid grid-cols-2 gap-6">
                <Input label="姓名 (中文/英文)" placeholder="如: 李茹 或 Mike" value={newEmp.name} onChange={e => handleNameChange(e.target.value)} onBlur={triggerIdGeneration} autoFocus />
                <CustomDatePicker label="入职日期" value={newEmp.joinDate} onChange={(date) => setNewEmp({...newEmp, joinDate: date})} />
            </div>
            <div className="grid grid-cols-2 gap-6">
                <Input label="职位名称" placeholder="如: 销售经理" value={newEmp.jobTitle} onChange={e => setNewEmp({...newEmp, jobTitle: e.target.value})} />
                <CustomSelect label="性别" options={[{ value: Gender.MALE, label: '男' }, { value: Gender.FEMALE, label: '女' }, { value: Gender.OTHER, label: '其他' }]} value={newEmp.gender} onChange={(val) => setNewEmp({...newEmp, gender: val as Gender})} />
            </div>
            <div className="border-t border-white/5 my-2"></div>
            <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                <h4 className="text-xs font-bold text-nexus-muted uppercase tracking-wider mb-4 flex items-center gap-2"><DollarSign size={12} /> 薪资结构设定</h4>
                <div className="grid grid-cols-2 gap-6 mb-4">
                   <Input type="number" label="试用期工资" value={newEmp.probationSalary} onChange={e => setNewEmp({...newEmp, probationSalary: Number(e.target.value)})} className="!bg-nexus-card" />
                  <Input type="number" label="转正后工资" value={newEmp.fullSalary} onChange={e => setNewEmp({...newEmp, fullSalary: Number(e.target.value)})} className="!bg-nexus-card" />
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <Input type="number" label="试用期时长 (月)" value={newEmp.probationMonths} onChange={e => setNewEmp({...newEmp, probationMonths: Number(e.target.value)})} className="!bg-nexus-card" />
                    </div>
                    <div className="flex-1 text-right pt-6">
                        <span className="text-xs text-nexus-muted">预计转正: </span>
                        <span className="text-sm font-mono text-nexus-accent">{calculateProbationStatus()}</span>
                    </div>
                </div>
            </div>
         </div>
      </Modal>

      {/* ... Other Modals ... */}
      <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="重置员工密码" footer={
             <div className="flex gap-4">
                 <Button variant="ghost" onClick={() => setIsResetModalOpen(false)} className="flex-1">取消</Button>
                 <Button variant="primary" onClick={handleResetSubmit} className="flex-1">确认重置</Button>
             </div>
         }>
          <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                  <KeyRound size={20} className="text-blue-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-blue-200">
                      管理员可以直接为员工设置一个新的临时密码。<br/>
                      <span className="opacity-70 text-xs mt-1 block">注意：员工在下次登录时，系统将强制要求其修改此密码。</span>
                  </div>
              </div>
              <Input type="text" label="设置新密码" placeholder="请输入新密码..." value={newResetPassword} onChange={e => setNewResetPassword(e.target.value)} autoFocus />
          </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="删除员工确认" footer={
           <div className="flex gap-4">
             <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="flex-1">取消</Button>
             <Button variant="danger" onClick={handleConfirmDelete} className="flex-1 bg-gradient-to-r from-red-900 to-red-950 border border-red-900 hover:from-red-800 hover:to-red-900 text-red-100 shadow-lg shadow-red-950/50">确认彻底删除</Button>
           </div>
        }>
         <div className="text-center space-y-4">
             <div className="w-16 h-16 bg-gradient-to-br from-red-900/30 to-black rounded-full flex items-center justify-center mx-auto border border-red-900/50 shadow-[0_0_30px_rgba(127,29,29,0.4)]">
                <AlertTriangle size={32} className="text-red-500" />
             </div>
             <div>
                <h4 className="text-xl font-bold text-white mb-2">危险操作警告</h4>
                <p className="text-nexus-muted text-sm">您确定要彻底删除 <strong className="text-white text-lg">{deleteTarget?.name}</strong> (工号: {deleteTarget?.id}) 吗？</p>
             </div>
             <div className="bg-red-950/20 border border-red-900/20 p-4 rounded-xl text-left text-sm text-red-200/50">
                <ul className="list-disc pl-4 space-y-1">
                   <li>此操作<strong className="text-red-400">无法撤销</strong>。</li>
                   <li>该员工的入职档案、请假记录、薪资历史将全部被永久移除。</li>
                </ul>
             </div>
         </div>
      </Modal>
    </div>
  );
};
