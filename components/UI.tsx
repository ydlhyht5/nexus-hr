import React, { useEffect, useState, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Info, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';

// --- Card (Standard) ---
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-nexus-card border border-white/5 rounded-2xl p-6 shadow-float backdrop-blur-sm ${className}`}>
    {children}
  </div>
);

// --- Neon Card (Web3 Style with Gradient Border) ---
export const NeonCard: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div 
    onClick={onClick}
    className={`group relative rounded-2xl p-[1px] bg-gradient-to-br from-white/5 via-white/10 to-transparent hover:from-nexus-accent hover:via-purple-500 hover:to-pink-500 transition-all duration-150 ${onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    {/* Inner Background */}
    <div className="bg-[#0B0C15] h-full w-full rounded-2xl p-6 relative z-10 overflow-hidden">
        {/* Subtle Grid Background */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="relative z-10 h-full flex flex-col">
            {children}
        </div>
    </div>
    
    {/* Glow Effect */}
    <div className="absolute inset-0 bg-nexus-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-2xl -z-0"></div>
  </div>
);

// --- Avatar (Web3 Style) ---
interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 'md', selected, onClick, className = '' }) => {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-lg"
  };

  return (
    <div 
      onClick={onClick}
      className={`relative rounded-xl flex items-center justify-center font-bold text-white transition-all duration-300 ${sizeClasses[size]} ${onClick ? 'cursor-pointer' : ''} ${selected ? 'scale-110 shadow-[0_0_15px_rgba(99,102,241,0.6)] z-10' : 'opacity-70 hover:opacity-100 hover:scale-105'} ${className}`}
      style={{
        background: selected 
          ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' 
          : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        border: selected ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.05)'
      }}
    >
      {name.charAt(0)}
      {selected && (
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[#0B0C15]"></div>
      )}
    </div>
  );
};

// --- Custom Select (Frosted Glass) ---
interface CustomSelectProps {
  label?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ label, value, options, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label || '请选择';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`} ref={containerRef}>
      {label && <label className="text-xs font-semibold text-nexus-muted uppercase tracking-wider pl-1">{label}</label>}
      <div className="relative">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className={`
            bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm text-white cursor-pointer
            flex justify-between items-center transition-all duration-300
            hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]
            ${isOpen ? 'ring-1 ring-nexus-accent/50 border-nexus-accent/50 bg-white/10' : ''}
          `}
        >
          <span>{selectedLabel}</span>
          <ChevronDown size={16} className={`text-nexus-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* Dropdown Menu */}
        <div className={`
          absolute top-full left-0 right-0 mt-2 bg-[#0F111A]/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] z-50
          transition-all duration-200 origin-top
          ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}
        `}>
          <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-1">
            {options.map((opt) => (
              <div 
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`
                  px-3 py-2.5 rounded-lg text-sm cursor-pointer flex items-center justify-between
                  transition-colors duration-150
                  ${value === opt.value ? 'bg-nexus-accent/20 text-nexus-accent' : 'text-nexus-muted hover:text-white hover:bg-white/5'}
                `}
              >
                {opt.label}
                {value === opt.value && <Check size={14} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Custom Date Picker (Frosted Glass) ---
interface CustomDatePickerProps {
  label?: string;
  value: string;
  onChange: (date: string) => void;
  className?: string;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ label, value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Internal state for calendar navigation
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());

  useEffect(() => {
    if (value) setViewDate(new Date(value));
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const handleDayClick = (d: Date) => {
    onChange(formatDate(d));
    setIsOpen(false);
  };

  // Calendar Logic
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  
  const daysArray = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    daysArray.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push(new Date(year, month, i));
  }

  const changeMonth = (offset: number) => {
    setViewDate(new Date(year, month + offset, 1));
  };

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`} ref={containerRef}>
      {label && <label className="text-xs font-semibold text-nexus-muted uppercase tracking-wider pl-1">{label}</label>}
      <div className="relative">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className={`
            bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm text-white cursor-pointer
            flex justify-between items-center transition-all duration-300 group
            hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]
            ${isOpen ? 'ring-1 ring-nexus-accent/50 border-nexus-accent/50 bg-white/10' : ''}
          `}
        >
          <span className={value ? 'text-white font-mono' : 'text-gray-500'}>{value || 'mm/dd/yyyy'}</span>
          <CalendarIcon size={16} className={`text-nexus-muted group-hover:text-white transition-colors duration-300 ${isOpen ? 'text-nexus-accent' : ''}`} />
        </div>

        {/* Calendar Popup */}
        <div className={`
          absolute top-full left-0 mt-2 w-[280px] bg-[#0F111A]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] z-50 p-4
          transition-all duration-200 origin-top-left
          ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}
        `}>
          {/* Header */}
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
            <button onClick={(e) => {e.stopPropagation(); changeMonth(-1)}} className="p-1 rounded-lg hover:bg-white/10 text-nexus-muted hover:text-white transition-colors"><ChevronLeft size={16}/></button>
            <div className="text-sm font-bold text-white font-mono">
              {viewDate.toLocaleString('default', { month: 'short' })} {year}
            </div>
            <button onClick={(e) => {e.stopPropagation(); changeMonth(1)}} className="p-1 rounded-lg hover:bg-white/10 text-nexus-muted hover:text-white transition-colors"><ChevronRight size={16}/></button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <div key={d} className="text-[10px] text-nexus-muted uppercase font-bold">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {daysArray.map((date, idx) => {
              if (!date) return <div key={idx}></div>;
              const isSelected = value === formatDate(date);
              const isToday = formatDate(new Date()) === formatDate(date);
              
              return (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); handleDayClick(date); }}
                  className={`
                    h-8 w-8 rounded-lg text-xs font-medium transition-all duration-200
                    ${isSelected 
                      ? 'bg-nexus-accent text-white shadow-neon' 
                      : isToday 
                        ? 'bg-white/10 text-nexus-accent border border-nexus-accent/30'
                        : 'text-white hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Bar Chart (Web3 Style V2) ---
interface BarChartProps {
  data: { 
    label: string; 
    value: number; 
    subLabel?: string;
    details?: {
      base: number;
      deduction: number;
      bonus: number;
      attendanceBonus?: number; // ADDED
      real: number;
      days?: number; 
      standardDays?: number; // ADDED for absence calc
    }
  }[];
  height?: number;
  colorStart?: string;
  colorEnd?: string;
}

export const BarChart: React.FC<BarChartProps> = ({ 
  data, 
  height = 200, 
  colorStart = 'from-emerald-500', 
  colorEnd = 'to-teal-600' 
}) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="w-full flex items-end justify-between gap-2 px-2 pt-6" style={{ height: `${height}px` }}>
      {data.map((item, idx) => {
        const percent = (item.value / maxValue) * 100;
        const isHovered = hoverIdx === idx;
        const displayValue = Math.round(item.value); 
        
        return (
          <div 
            key={idx} 
            className="relative flex-1 flex flex-col justify-end items-center group h-full"
            onMouseEnter={() => setHoverIdx(idx)}
            onMouseLeave={() => setHoverIdx(null)}
          >
            {/* Tooltip */}
            <div 
              className={`absolute bottom-full mb-3 bg-[#0F111A] border border-white/10 px-4 py-3 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] z-20 pointer-events-none transition-all duration-200 whitespace-nowrap min-w-[160px] ${isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'}`}
            >
               <div className="text-xs text-nexus-muted mb-2 border-b border-white/5 pb-1">{item.label} 薪资详情</div>
               
               {item.details ? (
                 <div className="space-y-1 text-xs">
                    {/* Attendance Info */}
                    {item.details.days !== undefined && item.details.standardDays !== undefined && (
                        <div className="flex justify-between gap-4 mb-2 bg-white/5 p-1.5 rounded">
                            <span className="text-gray-400">出勤</span>
                            <span className="text-white font-mono font-bold">
                                {item.details.days}天 
                                {item.details.days < item.details.standardDays 
                                    ? <span className="text-red-400 ml-1">(缺{item.details.standardDays - item.details.days}天)</span>
                                    : <span className="text-green-400 ml-1">(全勤)</span>
                                }
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-400">基本工资</span>
                      <span className="text-white font-mono">¥{Math.round(item.details.base).toLocaleString()}</span>
                    </div>
                    {item.details.deduction > 0 && (
                      <div className="flex justify-between gap-4">
                        <span className="text-red-400">请假扣除</span>
                        <span className="text-red-400 font-mono">-¥{Math.round(item.details.deduction).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-400">绩效奖金</span>
                      <span className="text-green-400 font-mono">+¥{Math.round(item.details.bonus).toLocaleString()}</span>
                    </div>
                    {/* Attendance Bonus in Tooltip */}
                    {item.details.attendanceBonus && item.details.attendanceBonus > 0 && (
                      <div className="flex justify-between gap-4">
                        <span className="text-yellow-400">全勤奖</span>
                        <span className="text-yellow-400 font-mono">+¥{Math.round(item.details.attendanceBonus).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t border-white/10 my-1 pt-1 flex justify-between gap-4">
                      <span className="text-white font-bold">实际发放</span>
                      <span className="text-nexus-accent font-bold font-mono">¥{Math.round(item.details.real).toLocaleString()}</span>
                    </div>
                 </div>
               ) : (
                 <div className="text-lg font-bold text-white font-mono leading-none">¥{displayValue.toLocaleString()}</div>
               )}
               
               {/* Tooltip Arrow */}
               <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#0F111A]"></div>
            </div>

            {/* Value Label */}
            <div 
              className={`absolute bottom-[calc(100%+4px)] text-[10px] font-mono transition-all duration-300 ${isHovered ? 'opacity-100 -translate-y-1 text-white font-bold' : 'opacity-70 text-nexus-muted'}`}
              style={{ bottom: mounted ? `${percent}%` : '0%' }}
            >
              {item.value > 0 ? `¥${displayValue.toLocaleString()}` : ''}
            </div>

            {/* Bar */}
            <div className="w-full h-full flex items-end justify-center">
                <div 
                  className={`w-full max-w-[40px] rounded-t-sm transition-all duration-700 ease-out bg-gradient-to-t ${colorStart} ${colorEnd} relative overflow-hidden ${isHovered ? 'brightness-125 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'opacity-80'}`}
                  style={{ height: mounted ? `${Math.max(percent, 2)}%` : '0%' }}
                >
                   <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
            </div>
            
            {/* Label */}
            <div className={`text-[10px] text-center mt-3 font-mono transition-colors duration-200 ${isHovered ? 'text-white font-bold' : 'text-nexus-muted'}`}>
              {item.label.split('-')[1] || item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  isLoading, 
  className = '', 
  icon,
  ...props 
}) => {
  const baseStyle = "rounded-xl font-medium transition-all duration-150 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden";
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-3 text-base"
  };

  const variants = {
    primary: "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-neon hover:shadow-neon-hover border border-white/10",
    success: "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-neon hover:shadow-neon-hover border border-white/10",
    secondary: "bg-white/5 border border-white/10 text-nexus-text hover:bg-white/10 hover:border-white/20 backdrop-blur-md",
    danger: "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40",
    ghost: "text-nexus-muted hover:text-nexus-text hover:bg-white/5"
  };

  return (
    <button 
      className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Processing...</span>
        </div>
      ) : (
        <>
          {icon && <span className="opacity-90">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-semibold text-nexus-muted uppercase tracking-wider pl-1">{label}</label>}
    <input
      className={`bg-nexus-dark/50 border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-sm text-nexus-text placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-nexus-accent/50 focus:border-nexus-accent transition-all ${className}`}
      {...props}
    />
    {error && <span className="text-xs text-red-400 pl-1">{error}</span>}
  </div>
);

// --- Badge ---
export const Badge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    APPROVED: 'bg-green-500/10 text-green-400 border-green-500/20',
    REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20',
    PROBATION: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    OFFICIAL: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };
  
  const labels: Record<string, string> = {
    PENDING: '申请中',
    APPROVED: '已批准',
    REJECTED: '已拒绝',
    PROBATION: '试用期',
    OFFICIAL: '正式员工',
  };
  
  const defaultStyle = 'bg-gray-500/10 text-gray-400 border-gray-500/20';

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || defaultStyle}`}>
      {labels[status] || status}
    </span>
  );
};

// --- Modal ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300" 
        onClick={onClose}
      />
      <div className="relative bg-[#0F111A] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl transform transition-all animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent">
          <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="w-1 h-6 bg-nexus-accent rounded-full"></span>
            {title}
          </h3>
          <button onClick={onClose} className="text-nexus-muted hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="p-8 overflow-y-auto custom-scrollbar">
          {children}
        </div>
        {footer && (
          <div className="p-6 border-t border-white/5 bg-white/5 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Toast ---
export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle size={18} className="text-green-400" />,
    error: <AlertCircle size={18} className="text-red-400" />,
    info: <Info size={18} className="text-blue-400" />
  };

  const bgStyles = {
    success: "bg-[#0F111A] border-green-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]",
    error: "bg-[#0F111A] border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]",
    info: "bg-[#0F111A] border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md animate-in slide-in-from-top-2 fade-in ${bgStyles[type]}`}>
      {icons[type]}
      <span className="text-sm font-medium text-white">{message}</span>
      <button onClick={onClose} className="ml-2 text-white/50 hover:text-white">
        <X size={14} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: { id: string; message: string; type: ToastType }[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3">
      {toasts.map(t => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
};
