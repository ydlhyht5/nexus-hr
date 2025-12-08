import React, { useState } from 'react';
import { Employee, LeaveRequest, LeaveStatus, SalaryRecord } from '../types';
import { Card, Button, Input, Badge, CustomDatePicker } from './UI';
import { User, Calendar, Clock, DollarSign, LogOut, Briefcase } from 'lucide-react';

interface EmployeeDashboardProps {
  employee: Employee;
  requests: LeaveRequest[];
  salaryRecords: SalaryRecord[];
  onSubmitLeave: (start: string, end: string, days: number, reason: string, existingId?: string) => void;
  onLogout: () => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  employee,
  requests,
  salaryRecords,
  onSubmitLeave,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'leave' | 'salary'>('profile');
  
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

  // Filter my salaries
  const mySalaries = salaryRecords
    .filter(r => r.employeeId === employee.id)
    .sort((a, b) => b.month.localeCompare(a.month)); // Newest first

  return (
    <div className="min-h-screen bg-nexus-dark text-nexus-text p-4 md:p-8 flex justify-center">
      <div className="max-w-5xl w-full">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center font-bold text-white shadow-neon text-lg">
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
               <Card>
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <DollarSign size={20} className="text-emerald-400" /> 工资发放记录
                  </h2>
                  <div className="space-y-4">
                    {mySalaries.length === 0 ? (
                        <p className="text-nexus-muted text-center py-8">暂无工资记录。</p>
                    ) : (
                        mySalaries.map(sal => (
                           <div key={sal.id} className="bg-white/5 border border-white/5 rounded-xl p-4">
                              <div className="flex justify-between items-center mb-3">
                                  <span className="text-lg font-bold text-white font-mono">{sal.month}</span>
                                  <span className="text-xl font-bold text-emerald-400 font-mono">¥{Math.round(sal.totalSalary).toLocaleString()}</span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-nexus-muted">
                                  <div>
                                      <div className="uppercase mb-1">基本工资</div>
                                      <div className="text-white font-mono">¥{Math.round(sal.basicSalary).toLocaleString()}</div>
                                  </div>
                                  <div>
                                      <div className="uppercase mb-1">销售业绩</div>
                                      <div className="text-white font-mono">¥{Math.round(sal.salesAmount).toLocaleString()}</div>
                                  </div>
                                  <div>
                                      <div className="uppercase mb-1">提成比例</div>
                                      <div className="text-white font-mono">{sal.bonusRate}%</div>
                                  </div>
                                  {sal.attendanceBonus !== undefined && sal.attendanceBonus > 0 && (
                                      <div>
                                          <div className="uppercase mb-1 text-yellow-400">全勤奖</div>
                                          <div className="text-yellow-400 font-mono">+¥{Math.round(sal.attendanceBonus).toLocaleString()}</div>
                                      </div>
                                  )}
                                  <div>
                                      <div className="uppercase mb-1">提成奖金</div>
                                      <div className="text-green-300 font-mono">+¥{Math.round(sal.bonusAmount).toLocaleString()}</div>
                                  </div>
                              </div>
                              <div className="mt-3 pt-2 border-t border-white/5 text-[10px] text-right text-gray-600">
                                  更新时间: {new Date(sal.updatedAt).toLocaleString()}
                              </div>
                           </div>
                        ))
                    )}
                  </div>
               </Card>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
