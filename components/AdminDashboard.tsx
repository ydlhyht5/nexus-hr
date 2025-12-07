
import React, { useState, useEffect, useRef } from 'react';
import { Employee, Gender, LeaveRequest, LeaveStatus, SalaryRecord } from '../types';
import { Card, Button, Input, Select, Badge } from './UI';
import { generatePinyinInitials } from '../services/geminiService';
import { UserPlus, Calendar, Check, X, Search, Pencil, Calculator, Save } from 'lucide-react';

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

// Helper: Get Salary Status
const getSalaryStatus = (emp: Employee, monthStr: string) => {
  if (!emp.joinDate) return 'PROBATION'; 
  const join = new Date(emp.joinDate);
  const selected = new Date(monthStr + '-01');
  const probationEnd = new Date(join);
  probationEnd.setMonth(join.getMonth() + emp.probationMonths);
  const selectedTime = selected.getFullYear() * 12 + selected.getMonth();
  const probationTime = probationEnd.getFullYear() * 12 + probationEnd.getMonth();
  
  return selectedTime < probationTime ? 'PROBATION' : 'OFFICIAL';
};

// Component: Salary Row
interface SalaryRowProps {
  emp: Employee;
  selectedMonth: string;
  salaryRecords: SalaryRecord[];
  onSaveSalary: (record: SalaryRecord) => void;
}

const SalaryRow: React.FC<SalaryRowProps> = ({ emp, selectedMonth, salaryRecords, onSaveSalary }) => {
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
  };

  const isSaved = existingRecord && 
    existingRecord.salesAmount === salesNum && 
    existingRecord.bonusRate === rateNum;

  return (
    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors group">
      <td className="p-4">
        <div className="font-medium text-white">{emp.name}</div>
        <div className="text-xs text-nexus-muted">{emp.jobTitle}</div>
      </td>
      <td className="p-4">
        <Badge status={status} />
        <div className="text-sm font-mono mt-1 text-nexus-text">¥{basicSalary.toLocaleString()}</div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-1">
           <span className="text-nexus-muted text-xs">¥</span>
           <input 
              type="number" 
              className="bg-black/20 border border-white/10 rounded px-2 py-1 w-24 text-sm text-white focus:border-nexus-accent outline-none transition-all focus:w-28"
              placeholder="0"
              value={sales}
              onChange={e => setSales(e.target.value)}
           />
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-1">
           <input 
              type="number" 
              className="bg-black/20 border border-white/10 rounded px-2 py-1 w-16 text-sm text-white focus:border-nexus-accent outline-none"
              placeholder="0"
              value={rate}
              onChange={e => setRate(e.target.value)}
           />
           <span className="text-nexus-muted text-xs">%</span>
        </div>
      </td>
      <td className="p-4 font-mono text-green-400">
        +¥{bonus.toFixed(2)}
      </td>
      <td className="p-4">
        <div className="font-bold text-lg text-white font-mono">¥{total.toFixed(2)}</div>
      </td>
      <td className="p-4">
         <Button 
            variant={isSaved ? "secondary" : "primary"} 
            onClick={handleSave} 
            className={`h-8 w-8 p-0 flex items-center justify-center rounded-full border-none ${isSaved ? 'opacity-50' : 'shadow-neon'}`}
            title="保存"
         >
           <Save size={16} />
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
  
  const [newEmp, setNewEmp] = useState({
    name: '',
    jobTitle: '',
    joinDate: '',
    gender: Gender.MALE,
    probationSalary: 0,
    fullSalary: 0,
    probationMonths: 3
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const getPayDate = (monthStr: string) => {
    if (!monthStr) return '-';
    const [y, m] = monthStr.split('-').map(Number);
    const date = new Date(y, m, 10); 
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getTotalPayout = () => {
    return employees.reduce((sum, emp) => {
      const record = salaryRecords.find(r => r.id === `${emp.id}_${selectedMonth}`);
      if (record) return sum + record.totalSalary;
      const status = getSalaryStatus(emp, selectedMonth);
      return sum + (status === 'PROBATION' ? emp.probationSalary : emp.fullSalary);
    }, 0);
  };

  const getStatusPreview = () => {
    if (!newEmp.joinDate) return null;
    const join = new Date(newEmp.joinDate);
    const probationEnd = new Date(join);
    probationEnd.setMonth(join.getMonth() + newEmp.probationMonths);
    const now = new Date();
    const isProbation = now < probationEnd;
    
    return {
      isProbation,
      label: isProbation ? 'PROBATION' : 'OFFICIAL',
      date: probationEnd.toLocaleDateString('zh-CN')
    };
  };

  const statusPreview = getStatusPreview();

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.name || !newEmp.joinDate) return;

    // VALIDATION: Probation salary must be lower than full salary
    if (newEmp.probationSalary >= newEmp.fullSalary) {
      alert("错误：试用期工资必须低于转正工资！");
      return;
    }

    if (editingId) {
      const original = employees.find(e => e.id === editingId);
      if (original) {
        const updatedEmployee: Employee = {
          ...original,
          ...newEmp
        };
        onUpdateEmployee(updatedEmployee);
        alert(`员工 ${updatedEmployee.name} 信息已更新！`);
      }
    } else {
      setIsGenerating(true);
      const initials = await generatePinyinInitials(newEmp.name);
      const dateObj = new Date(newEmp.joinDate);
      const mm = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const dd = dateObj.getDate().toString().padStart(2, '0');
      const generatedId = `${initials}${mm}${dd}`;
  
      const newEmployee: Employee = {
        id: generatedId,
        ...newEmp,
        password: '1234',
        isFirstLogin: true
      };
  
      onAddEmployee(newEmployee);
      setIsGenerating(false);
      alert(`员工已创建! 工号: ${generatedId}`);
    }

    resetForm();
  };

  const handleEditClick = (emp: Employee) => {
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
    setActiveTab('employees');
  };

  const resetForm = () => {
    setEditingId(null);
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

  const handleReject = (id: string) => {
    onUpdateLeaveStatus(id, LeaveStatus.REJECTED, rejectReason || '无理由');
    setRejectId(null);
    setRejectReason('');
  };

  return (
    <div className="min-h-screen bg-nexus-dark text-nexus-text p-4 md:p-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-nexus-accent to-purple-400">
            棠灿贸易后台 (Cloud)
          </h1>
          <p className="text-nexus-muted text-xs md:text-sm mt-1">系统概览与管理</p>
        </div>
        <div className="flex items-center gap-4 self-end md:self-auto">
          <div className="text-right hidden md:block">
            <div className="text-sm font-semibold text-white">管理员</div>
            <div className="text-xs text-nexus-muted">ID: 8278</div>
          </div>
          <Button variant="secondary" onClick={onLogout} className="text-sm px-4">退出</Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 md:gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <Button 
          variant={activeTab === 'employees' ? 'primary' : 'secondary'} 
          onClick={() => setActiveTab('employees')}
          className="whitespace-nowrap"
        >
          <UserPlus size={18} /> <span className="hidden md:inline">员工管理</span>
        </Button>
        <div className="relative">
          <Button 
            variant={activeTab === 'leaves' ? 'primary' : 'secondary'} 
            onClick={() => setActiveTab('leaves')}
            className="whitespace-nowrap pr-8 md:pr-6"
          >
            <Calendar size={18} /> <span className="hidden md:inline">请假审批</span>
          </Button>
          {leaveRequests.some(l => l.status === LeaveStatus.PENDING) && (
            <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse border border-black"></span>
          )}
        </div>
        <Button 
          variant={activeTab === 'salary' ? 'primary' : 'secondary'} 
          onClick={() => setActiveTab('salary')}
          className="whitespace-nowrap"
        >
          <Calculator size={18} /> <span className="hidden md:inline">工资结算</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content Area */}
        <div className={`lg:col-span-2 space-y-8 ${activeTab === 'employees' ? 'order-last lg:order-1' : ''}`}>
          
          {activeTab === 'employees' && (
            <Card className="min-h-[500px]">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Search size={20} className="text-nexus-accent" /> 员工名录
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="text-nexus-muted text-xs uppercase tracking-wider border-b border-white/10">
                      <th className="p-4">工号</th>
                      <th className="p-4">姓名</th>
                      <th className="p-4">职位</th>
                      <th className="p-4">入职状态</th>
                      <th className="p-4">入职日期</th>
                      <th className="p-4">操作</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {employees.map(emp => {
                       const probationEnd = new Date(emp.joinDate);
                       probationEnd.setMonth(probationEnd.getMonth() + emp.probationMonths);
                       const isProbation = new Date() < probationEnd;
                       
                       return (
                      <tr key={emp.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono text-nexus-accent">{emp.id}</td>
                        <td className="p-4 font-medium text-white">{emp.name}</td>
                        <td className="p-4 text-white">{emp.jobTitle || '-'}</td>
                        <td className="p-4">
                          <Badge status={isProbation ? 'PROBATION' : 'OFFICIAL'} />
                        </td>
                        <td className="p-4 text-nexus-muted">{emp.joinDate}</td>
                        <td className="p-4">
                          <div className="flex gap-3">
                            <button 
                              onClick={() => handleEditClick(emp)}
                              className="text-xs text-blue-400 hover:text-white flex items-center gap-1"
                            >
                              <Pencil size={12}/> 编辑
                            </button>
                            <button 
                              onClick={() => {
                                if(confirm(`确定重置 ${emp.name} 的密码吗?`)) onResetPassword(emp.id);
                              }}
                              className="text-xs text-nexus-accent hover:text-white underline"
                            >
                              重置密码
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})}
                    {employees.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-nexus-muted">暂无员工信息，请在右侧/上方添加。</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === 'leaves' && (
            <div className="space-y-4">
               {leaveRequests.length === 0 ? (
                 <Card className="text-center py-20 text-nexus-muted">暂无请假申请。</Card>
               ) : (
                 leaveRequests.map(req => (
                   <Card key={req.id} className="relative overflow-hidden group">
                     {req.status === LeaveStatus.PENDING && (
                       <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500 animate-pulse"></div>
                     )}
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                       <div>
                         <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white text-lg">{req.employeeName}</h3>
                            <span className="text-xs font-mono text-nexus-muted">({req.employeeId})</span>
                            <Badge status={req.status} />
                         </div>
                         <div className="text-sm text-nexus-muted flex flex-wrap gap-2 md:gap-4">
                            <span>开始: <span className="text-white">{req.startDate}</span></span>
                            <span>结束: <span className="text-white">{req.endDate}</span></span>
                            {req.days > 0 && <span>共计: <span className="text-nexus-accent font-bold">{req.days}</span> 天</span>}
                         </div>
                         <p className="mt-2 text-sm text-gray-300 italic">"{req.reason}"</p>
                         {req.rejectionReason && (
                           <p className="mt-1 text-xs text-red-400">拒绝原因: {req.rejectionReason}</p>
                         )}
                       </div>

                       {req.status === LeaveStatus.PENDING && (
                         <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                           {rejectId === req.id ? (
                             <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-right-5 w-full md:w-auto">
                               <input 
                                 type="text" 
                                 placeholder="拒绝原因 (选填)"
                                 value={rejectReason}
                                 onChange={(e) => setRejectReason(e.target.value)}
                                 className="bg-black/20 border border-white/10 rounded px-2 py-1 text-xs w-full text-white"
                               />
                               <div className="flex gap-2">
                                 <Button variant="danger" size="sm" className="py-1 text-xs flex-1" onClick={() => handleReject(req.id)}>确认拒绝</Button>
                                 <Button variant="ghost" size="sm" className="py-1 text-xs flex-1" onClick={() => setRejectId(null)}>取消</Button>
                               </div>
                             </div>
                           ) : (
                             <>
                               <Button variant="primary" className="bg-gradient-to-r from-emerald-600 to-teal-600 flex-1 md:flex-none" onClick={() => onUpdateLeaveStatus(req.id, LeaveStatus.APPROVED)}>
                                 <Check size={16} /> 批准
                               </Button>
                               <Button variant="danger" className="flex-1 md:flex-none" onClick={() => setRejectId(req.id)}>
                                 <X size={16} /> 拒绝
                               </Button>
                             </>
                           )}
                         </div>
                       )}
                     </div>
                   </Card>
                 ))
               )}
            </div>
          )}

          {activeTab === 'salary' && (
            <Card className="min-h-[500px]">
              <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                 <div className="flex items-center gap-4 w-full md:w-auto">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Calculator size={20} className="text-nexus-accent" /> 工资结算
                    </h2>
                    <input 
                      type="month" 
                      value={selectedMonth} 
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-black/30 border border-white/10 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-nexus-accent"
                    />
                 </div>
                 
                 <div className="flex gap-4 w-full md:w-auto">
                    <div className="bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20 text-right flex-1 md:flex-none">
                       <div className="text-xs text-nexus-muted uppercase">本月预计发放</div>
                       <div className="text-lg font-bold text-emerald-400 font-mono">¥{getTotalPayout().toLocaleString()}</div>
                    </div>
                    <div className="bg-blue-500/10 px-4 py-2 rounded-lg border border-blue-500/20 text-right flex-1 md:flex-none">
                       <div className="text-xs text-nexus-muted uppercase">发放日期</div>
                       <div className="text-sm font-bold text-blue-300">{getPayDate(selectedMonth)}</div>
                    </div>
                 </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="text-nexus-muted text-xs uppercase tracking-wider border-b border-white/10">
                      <th className="p-4">员工信息</th>
                      <th className="p-4">底薪 (Basic)</th>
                      <th className="p-4 w-32">本月销售额</th>
                      <th className="p-4 w-24">提成点(%)</th>
                      <th className="p-4">提成 (Bonus)</th>
                      <th className="p-4">预计发放 (Total)</th>
                      <th className="p-4">保存</th>
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
                       />
                     ))}
                     {employees.length === 0 && (
                       <tr><td colSpan={7} className="p-8 text-center text-nexus-muted">暂无员工。</td></tr>
                     )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

        </div>

        {/* Sidebar / Form Area */}
        <div className={`lg:col-span-1 ${activeTab === 'employees' ? 'order-first lg:order-2' : ''}`}>
          {activeTab === 'employees' && (
            <Card className={`sticky top-8 ${editingId ? 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : ''}`}>
              <h2 className="text-xl font-bold mb-6 text-white flex items-center justify-between">
                <span>{editingId ? '编辑员工信息' : '新员工入职'}</span>
                {editingId && <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">正在编辑: {editingId}</span>}
              </h2>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <Input 
                  label="姓名 (中文)" 
                  placeholder="例如：李茹" 
                  value={newEmp.name}
                  onChange={e => setNewEmp({...newEmp, name: e.target.value})}
                  required 
                />

                <Input 
                  label="职位 (Role)" 
                  placeholder="例如：销售经理" 
                  value={newEmp.jobTitle}
                  onChange={e => setNewEmp({...newEmp, jobTitle: e.target.value})}
                  required 
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    type="date" 
                    label="入职日期"
                    value={newEmp.joinDate}
                    onChange={e => setNewEmp({...newEmp, joinDate: e.target.value})}
                    required
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
                
                 <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                   <Input 
                      type="number"
                      label="试用期时长 (月)"
                      value={newEmp.probationMonths}
                      onChange={e => setNewEmp({...newEmp, probationMonths: Number(e.target.value)})}
                      className="mb-2"
                    />
                    {statusPreview && (
                      <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-white/5">
                         <span className="text-nexus-muted">预计转正: <span className="text-white">{statusPreview.date}</span></span>
                         <Badge status={statusPreview.label} />
                      </div>
                    )}
                 </div>

                <div className="pt-4 flex gap-3">
                  {editingId && (
                    <Button type="button" variant="ghost" className="flex-1" onClick={resetForm}>
                      取消
                    </Button>
                  )}
                  <Button type="submit" className="flex-1" isLoading={isGenerating}>
                    {editingId ? <><Pencil size={18} /> 保存修改</> : <><UserPlus size={18} /> 确认入职</>}
                  </Button>
                </div>
                {!editingId && (
                  <p className="text-xs text-nexus-muted mt-4 text-center">
                    系统将自动生成工号 (拼音首字母+日期)<br/>默认密码为 <span className="font-mono text-white">1234</span>
                  </p>
                )}
              </form>
            </Card>
          )}

          {activeTab === 'leaves' && (
            <Card className="sticky top-8 bg-gradient-to-br from-nexus-card to-indigo-900/10">
              <h3 className="text-lg font-bold mb-2">请假制度说明</h3>
              <ul className="text-sm text-nexus-muted space-y-2 list-disc pl-4">
                <li>申请提交超过 6 小时未处理将自动批准。</li>
                <li>员工可以随时修改“申请中”的请假条。</li>
                <li>拒绝请假申请时建议填写理由。</li>
              </ul>
            </Card>
          )}

          {activeTab === 'salary' && (
            <Card className="sticky top-8 bg-gradient-to-br from-nexus-card to-emerald-900/10">
              <h3 className="text-lg font-bold mb-2 text-white">工资计算说明</h3>
              <div className="space-y-4 text-sm text-nexus-muted">
                <p>
                  系统自动根据员工的入职日期和所选月份判断 
                  <span className="text-orange-400 mx-1">试用期</span> 或 
                  <span className="text-blue-400 mx-1">正式期</span> 底薪。
                </p>
                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                  <div className="text-xs uppercase mb-1">公式</div>
                  <code className="text-white font-mono block">
                    总工资 = 底薪 + (销售额 × 提成%)
                  </code>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
