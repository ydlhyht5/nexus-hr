
import React, { useState, useEffect } from 'react';
import { Employee, LeaveRequest, LeaveStatus, SalaryRecord } from '../types';
import { Card, Button, Input, Badge, CustomDatePicker, CustomMonthPicker, BarChart, UI as GlobalUI } from './UI';
import { User, Calendar, Clock, DollarSign, LogOut, Briefcase, Download, TrendingUp } from 'lucide-react';
import html2canvas from 'html2canvas';

interface EmployeeDashboardProps {
  employee: Employee;
  requests: LeaveRequest[];
  salaryRecords: SalaryRecord[];
  onSubmitLeave: (start: string, end: string, days: number, reason: string, existingId?: string) => void;
  onLogout: () => void;
}

// --- Helper Functions ---
const getPreviousMonth = (monthStr: string): string => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 2, 1); 
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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
    if (!monthStr) return 0;
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

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  employee,
  requests,
  salaryRecords,
  onSubmitLeave,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'leave' | 'salary'>('profile');
  
  // Salary Filter State
  const [salaryFilterMonth, setSalaryFilterMonth] = useState('');
  
  // Trend Chart State
  const [chartPeriod, setChartPeriod] = useState<6 | 12>(6);

  // Initialize filter with latest WORK month (derived from latest Payout month)
  useEffect(() => {
      if (salaryRecords.length > 0 && !salaryFilterMonth) {
          const myRecords = salaryRecords.filter(r => r.employeeId === employee.id);
          if (myRecords.length > 0) {
              // Sort desc by Payout Month
              myRecords.sort((a, b) => b.month.localeCompare(a.month));
              // Set default to WORK MONTH (Previous Month of Payout)
              setSalaryFilterMonth(getPreviousMonth(myRecords[0].month));
          }
      }
  }, [salaryRecords, employee.id]);

  // Leave Form State
  const [leaveForm, setLeaveForm] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    editingId: undefined as string | undefined
  });

  // Helper: Calculate days
  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const d1 = new Date(start);
    const d2 = new Date(end);
    if (d2 < d1) return 0;
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
  };

  const daysCount = calculateDays(leaveForm.startDate, leaveForm.endDate);

  const isProbation = new Date() < new Date(new Date(employee.joinDate).setMonth(new Date(employee.joinDate).getMonth() + employee.probationMonths));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (daysCount <= 0) {
        alert("结束日期必须晚于或等于开始日期");
        return;
    }
    onSubmitLeave(leaveForm.startDate, leaveForm.endDate, daysCount, leaveForm.reason, leaveForm.editingId);
    setLeaveForm({ startDate: '', endDate: '', reason: '', editingId: undefined });
    setActiveTab('profile'); 
  };

  const handleEdit = (req: LeaveRequest) => {
    setLeaveForm({
      startDate: req.startDate,
      endDate: req.endDate,
      reason: req.reason,
      editingId: req.id
    });
    setActiveTab('leave');
  };

  // Filter and Sort Salaries
  // Filtering Logic: Match Work Month (getPreviousMonth(r.month)) to Selected Month
  const filteredSalaries = salaryRecords
    .filter(r => r.employeeId === employee.id)
    .filter(r => salaryFilterMonth ? getPreviousMonth(r.month) === salaryFilterMonth : true)
    .sort((a, b) => b.month.localeCompare(a.month)); // Newest first

  // Data for Trend Chart (Bar Chart Logic)
  const getChartData = (period: 6 | 12) => {
    const data = [];
    const now = new Date();
    for (let i = period - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const payoutMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const displayLabel = getPreviousMonth(payoutMonthStr);
        
        let value = 0;
        let details = undefined;

        const rec = salaryRecords.find(r => r.month === payoutMonthStr && r.employeeId === employee.id);
        if (rec) {
            value = rec.totalSalary;
            
            const stdDays = getMonthlyStandardDays(displayLabel);
            
            // Standard Salary (Base)
            const standardSalary = rec.standardSalary || rec.basicSalary || 1;
            
            // Deduction Logic:
            let effectiveDeduction = rec.leaveDeduction || 0;
            
            // Use manual days if present, otherwise calculate proportional days
            // This handles late joiners where basicSalary < standardSalary
            let calculatedDays = rec.manualWorkDays;
            if (!calculatedDays && rec.basicSalary !== undefined) {
                // e.g. 3636 / 5000 = 0.72. 0.72 * 22 = 16 days.
                calculatedDays = Math.round((rec.basicSalary / standardSalary) * stdDays);
            }

            details = {
                base: standardSalary,
                deduction: effectiveDeduction,
                bonus: rec.bonusAmount,
                attendanceBonus: rec.attendanceBonus,
                real: rec.totalSalary,
                realBasic: rec.basicSalary, // Pass real basic to detect implicit deductions
                days: calculatedDays || stdDays, 
                standardDays: stdDays
            };
        }
        
        data.push({
            label: displayLabel, 
            value: Math.round(value),
            subLabel: '个人收入',
            details: details
        });
    }
    return data;
  };

  // Handle Download Payslip
  const handleDownload = async (record: SalaryRecord) => {
    const el = document.getElementById(`payslip-${record.id}`);
    if (!el) return;

    try {
        const canvas = await html2canvas(el, {
            backgroundColor: '#0B0C15', 
            scale: 2, 
        });
        
        const link = document.createElement('a');
        link.download = `工资单_${employee.name}_${record.month}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.error("Download failed", err);
        alert("下载失败，请稍后重试");
    }
  };

  return (
    <div className="min-h-screen bg-nexus-dark text-nexus-text p-4 md:p-8 flex justify-center">
      <GlobalUI />
      <div className="max-w-5xl w-full">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 md:h-12 md:h-12 w-12 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center font-bold text-white shadow-neon text-lg">
               {employee.name.charAt(0)}
             </div>
             <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">你好, {employee.name}</h1>
                <p className="text-xs text-nexus-muted font-mono flex items-center gap-2">
                  ID: {employee.id} 
                  {employee.jobTitle && <span className="bg-white/10 px-1.5 rounded text-white/70 flex items-center gap-1"><Briefcase size={10} /> {employee.jobTitle}</span>}
                </p>
             </div>
          </div>
          <Button variant="secondary" onClick={onLogout} className="flex items-center gap-2 text-sm">
            <LogOut size={16} /> <span className="hidden sm:inline">退出</span>
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Sidebar / Navigation */}
          <div className="space-y-4">
             <Card className="p-2 space-y-1">
               <button 
                 onClick={() => { setActiveTab('profile'); setLeaveForm({startDate:'', endDate:'', reason:'', editingId: undefined}); }}
                 className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${activeTab === 'profile' ? 'bg-white/10 text-white shadow-inner' : 'text-nexus-muted hover:bg-white/5'}`}
               >
                 <User size={18} /> 个人信息 & 状态
               </button>
               <button 
                 onClick={() => setActiveTab('leave')}
                 className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${activeTab === 'leave' ? 'bg-white/10 text-white shadow-inner' : 'text-nexus-muted hover:bg-white/5'}`}
               >
                 <Calendar size={18} /> 请假申请
               </button>
               <button 
                 onClick={() => setActiveTab('salary')}
                 className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${activeTab === 'salary' ? 'bg-white/10 text-white shadow-inner' : 'text-nexus-muted hover:bg-white/5'}`}
               >
                 <DollarSign size={18} /> 工资单历史
               </button>
             </Card>

             {/* Status Card */}
             <Card className="bg-gradient-to-b from-nexus-card to-black">
                <h3 className="text-xs uppercase text-nexus-muted tracking-wider mb-4">当前入职状态</h3>
                <div className="flex justify-between items-center mb-2">
                   <span className="text-sm text-white/80">状态</span>
                   <Badge status={isProbation ? 'PROBATION' : 'OFFICIAL'} />
                </div>
                {isProbation ? (
                   <p className="text-xs text-nexus-muted mt-2 leading-relaxed">
                     您目前处于<span className="text-orange-400">试用期</span>。<br/>
                     预计转正: {new Date(new Date(employee.joinDate).setMonth(new Date(employee.joinDate).getMonth() + employee.probationMonths)).toLocaleDateString()}
                   </p>
                ) : (
                   <p className="text-xs text-nexus-muted mt-2 text-green-400">
                     您已转正，恭喜！
                   </p>
                )}
             </Card>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2">
             {activeTab === 'profile' && (
               <div className="space-y-6">
                 {/* Salary Info */}
                 <div className="grid grid-cols-2 gap-4">
                   <Card className="relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign size={48} />
                      </div>
                      <p className="text-nexus-muted text-xs uppercase">试用期工资</p>
                      <p className="text-2xl font-mono text-white mt-1">¥{employee.probationSalary.toLocaleString()}</p>
                   </Card>
                   <Card className="relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign size={48} />
                      </div>
                      <p className="text-nexus-muted text-xs uppercase">转正工资</p>
                      <p className="text-2xl font-mono text-nexus-accent mt-1">¥{employee.fullSalary.toLocaleString()}</p>
                   </Card>
                 </div>

                 {/* Personal Details */}
                 <Card>
                   <h3 className="text-lg font-bold mb-4 border-b border-white/5 pb-2">详细信息</h3>
                   <div className="grid grid-cols-2 gap-y-4 text-sm">
                      <div className="text-nexus-muted">姓名</div>
                      <div className="text-white font-medium">{employee.name}</div>
                      
                      <div className="text-nexus-muted">职位</div>
                      <div className="text-white font-medium">{employee.jobTitle || '未设置'}</div>

                      <div className="text-nexus-muted">入职日期</div>
                      <div className="text-white font-mono">{employee.joinDate}</div>

                      <div className="text-nexus-muted">性别</div>
                      <div className="text-white">{employee.gender === 'Male' ? '男' : employee.gender === 'Female' ? '女' : '其他'}</div>
                   </div>
                 </Card>

                 {/* My Leave History */}
                 <div className="mt-8">
                   <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                     <Clock size={18} /> 请假记录
                   </h3>
                   <div className="space-y-3">
                     {requests.length === 0 ? (
                       <div className="text-nexus-muted text-sm italic">暂无请假记录。</div>
                     ) : (
                       requests.map(req => (
                         <div key={req.id} className="bg-nexus-card border border-white/5 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center hover:border-white/10 transition-colors gap-3">
                           <div>
                             <div className="flex items-center gap-2 mb-1">
                                <span className="text-white font-medium">{req.startDate} <span className="text-nexus-muted text-xs mx-1">至</span> {req.endDate}</span>
                                <Badge status={req.status} />
                             </div>
                             <div className="text-sm text-nexus-muted flex gap-2">
                                <span>天数: <span className="text-nexus-accent">{req.days}</span></span>
                                <span>|</span>
                                <span>"{req.reason}"</span>
                             </div>
                             {req.rejectionReason && <div className="text-xs text-red-400 mt-1">备注: {req.rejectionReason}</div>}
                           </div>
                           {req.status === LeaveStatus.PENDING && (
                             <Button variant="secondary" size="sm" className="text-xs h-8 w-full md:w-auto" onClick={() => handleEdit(req)}>
                               修改
                             </Button>
                           )}
                         </div>
                       ))
                     )}
                   </div>
                 </div>
               </div>
             )}

             {activeTab === 'leave' && (
               <Card>
                 <h2 className="text-xl font-bold mb-6 text-white">
                   {leaveForm.editingId ? '修改请假申请' : '填写请假申请'}
                 </h2>
                 <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <CustomDatePicker 
                        label="开始日期" 
                        value={leaveForm.startDate}
                        onChange={val => setLeaveForm({...leaveForm, startDate: val})}
                      />
                      <CustomDatePicker 
                        label="结束日期" 
                        value={leaveForm.endDate}
                        onChange={val => setLeaveForm({...leaveForm, endDate: val})}
                      />
                    </div>

                    {daysCount > 0 && (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-300 text-sm flex items-center gap-2">
                            <Clock size={16} />
                            <span>共计申请请假天数: <strong>{daysCount}</strong> 天</span>
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                       <label className="text-xs font-semibold text-nexus-muted uppercase tracking-wider pl-1">请假事由</label>
                       <textarea 
                         className="bg-nexus-dark/50 border border-white/10 rounded-xl px-4 py-3 text-base text-nexus-text placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-nexus-accent/50 min-h-[120px]"
                         placeholder="请填写请假的具体原因..."
                         value={leaveForm.reason}
                         onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})}
                         required
                       />
                    </div>
                    <div className="flex gap-4 pt-4">
                      <Button type="button" variant="ghost" onClick={() => { setActiveTab('profile'); setLeaveForm({startDate:'', endDate:'', reason:'', editingId: undefined}); }} className="flex-1">
                        取消
                      </Button>
                      <Button type="submit" variant="primary" className="flex-1">
                        {leaveForm.editingId ? '更新申请' : '提交申请'}
                      </Button>
                    </div>
                 </form>
               </Card>
             )}

             {activeTab === 'salary' && (
               <div className="space-y-8">
                 <Card>
                    {/* Header with relative z-20 to fix dropdown overlap */}
                    <div className="flex justify-between items-center mb-6 relative z-20">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <DollarSign size={20} className="text-emerald-400" /> 工资发放记录
                        </h2>
                        {/* Date Picker showing WORK MONTH for clarity */}
                        <div className="w-40">
                            <CustomMonthPicker value={salaryFilterMonth} onChange={setSalaryFilterMonth} />
                        </div>
                    </div>
                    <div className="space-y-4 relative z-10">
                        {filteredSalaries.length === 0 ? (
                            <p className="text-nexus-muted text-center py-8">
                                {salaryFilterMonth ? `${salaryFilterMonth} 暂无工资记录。` : '暂无工资记录。'}
                            </p>
                        ) : (
                            filteredSalaries.map(sal => {
                                // Explicitly use saved standard Salary (gross) or fallback to basic
                                const stdSalary = sal.standardSalary || sal.basicSalary;
                                
                                // Explicit deduction
                                let deduction = sal.leaveDeduction || 0;

                                // Work month string (previous month)
                                const workMonthStr = getPreviousMonth(sal.month);

                                // Check for implicit deduction (late joiner/unpaid days without leave record)
                                // If Standard > Basic but Deduction is 0, it means days were not fully worked (late joiner)
                                const isLateJoinerGap = stdSalary > sal.basicSalary && deduction === 0;
                                const lateJoinerDeduction = stdSalary - sal.basicSalary;

                                return (
                                <div key={sal.id} className="relative group">
                                    {/* Hidden Element for Printing/Downloading */}
                                    <div id={`payslip-${sal.id}`} className="fixed top-[-9999px] left-[-9999px] w-[800px] p-10 bg-[#0B0C15] text-white font-sans border border-white/20">
                                        <div className="text-center border-b border-white/20 pb-6 mb-6">
                                            <h1 className="text-3xl font-bold tracking-widest text-white mb-2">棠灿贸易</h1>
                                            <div className="text-nexus-accent text-sm uppercase tracking-[0.3em]">工资单凭证 PAYSLIP</div>
                                        </div>
                                        <div className="flex justify-between mb-8 text-sm">
                                            <div>
                                                <div className="text-nexus-muted mb-1">姓名 / Employee</div>
                                                <div className="text-xl font-bold">{sal.employeeName}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-nexus-muted mb-1">计薪月份 (Work Month)</div>
                                                <div className="text-xl font-mono font-bold">{workMonthStr}</div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mb-8">
                                            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                                                <div className="text-nexus-muted text-xs uppercase mb-2">收入项目 (Earnings)</div>
                                                <div className="flex justify-between mb-2"><span>标准薪资</span><span className="font-mono">¥{Math.round(stdSalary).toLocaleString()}</span></div>
                                                <div className="flex justify-between mb-2"><span>销售业绩提成</span><span className="font-mono">¥{Math.round(sal.bonusAmount).toLocaleString()}</span></div>
                                                <div className="flex justify-between"><span>全勤奖金</span><span className="font-mono">¥{Math.round(sal.attendanceBonus || 0).toLocaleString()}</span></div>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                                                <div className="text-nexus-muted text-xs uppercase mb-2">扣除项目 (Deductions)</div>
                                                {deduction > 0 && (
                                                    <div className="flex justify-between text-red-400"><span>请假扣款</span><span className="font-mono">-¥{Math.round(deduction).toLocaleString()}</span></div>
                                                )}
                                                {isLateJoinerGap && (
                                                    <div className="flex justify-between text-orange-400"><span>缺勤/未入职扣除</span><span className="font-mono">-¥{Math.round(lateJoinerDeduction).toLocaleString()}</span></div>
                                                )}
                                                {deduction === 0 && !isLateJoinerGap && <div className="text-nexus-muted text-xs italic">无扣除项</div>}
                                            </div>
                                        </div>
                                        <div className="border-t-2 border-white/20 pt-6 flex justify-between items-center">
                                            <div className="text-xs text-nexus-muted">
                                                此单据由系统自动生成。<br/>Generated by NexusHR System.
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-nexus-muted uppercase mb-1">实发工资 (Net Pay)</div>
                                                <div className="text-4xl font-bold text-emerald-400 font-mono">¥{Math.round(sal.totalSalary).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Visible Card */}
                                    <div className="bg-white/5 border border-white/5 rounded-xl p-5 hover:border-nexus-accent/30 transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                {/* PRIMARY TITLE should be the Work Month */}
                                                <span className="text-lg font-bold text-white font-mono block">{workMonthStr}</span>
                                                <span className="text-xs text-nexus-muted flex items-center gap-1">
                                                    发放日期(批次): <span className="text-white/50">{sal.month}</span>
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-bold text-emerald-400 font-mono">¥{Math.round(sal.totalSalary).toLocaleString()}</div>
                                                <div className="text-xs text-nexus-muted uppercase">实发工资</div>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-2 text-sm border-t border-white/5 pt-4">
                                            <div>
                                                <div className="text-xs text-nexus-muted uppercase mb-1">标准薪资</div>
                                                <div className="text-white font-mono">¥{Math.round(stdSalary).toLocaleString()}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-nexus-muted uppercase mb-1">业绩提成</div>
                                                <div className="text-white font-mono">¥{Math.round(sal.bonusAmount).toLocaleString()}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-nexus-muted uppercase mb-1">全勤奖</div>
                                                <div className="text-yellow-400 font-mono">¥{Math.round(sal.attendanceBonus || 0).toLocaleString()}</div>
                                            </div>
                                            
                                            {/* DEDUCTIONS COLUMN */}
                                            <div>
                                                <div className="text-xs text-nexus-muted uppercase mb-1">扣除项</div>
                                                {deduction > 0 ? (
                                                    <div className="text-red-400 font-mono" title="请假扣除">-¥{Math.round(deduction).toLocaleString()}</div>
                                                ) : isLateJoinerGap ? (
                                                    <div className="text-orange-400 font-mono" title="缺勤/未入职扣除">-¥{Math.round(lateJoinerDeduction).toLocaleString()}</div>
                                                ) : (
                                                    <div className="text-nexus-muted">-</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-4 flex justify-end">
                                            <Button variant="secondary" size="sm" icon={<Download size={14}/>} onClick={() => handleDownload(sal)} className="text-xs">
                                                下载工资单
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                );
                            })
                        )}
                    </div>
                 </Card>

                 {/* Trend Chart (Switched to BarChart) */}
                 <Card>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <TrendingUp size={18} className="text-nexus-accent" /> 近期收入趋势
                        </h3>
                        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl">
                            <button onClick={() => setChartPeriod(6)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${chartPeriod === 6 ? 'bg-nexus-accent text-white' : 'text-nexus-muted hover:text-white'}`}>最近半年</button>
                            <button onClick={() => setChartPeriod(12)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${chartPeriod === 12 ? 'bg-nexus-accent text-white' : 'text-nexus-muted hover:text-white'}`}>最近一年</button>
                        </div>
                    </div>
                    {/* Using BarChart for consistency */}
                    <BarChart data={getChartData(chartPeriod)} height={250} />
                 </Card>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
