
import React, { useEffect, useState, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Info, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';

// --- Global Styles for Scrollbar & Inputs ---
const GlobalStyles = () => (
  <style>{`
    /* Custom Scrollbar */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

    /* Remove Native Number Spinners */
    input[type=number]::-webkit-inner-spin-button, 
    input[type=number]::-webkit-outer-spin-button { 
      -webkit-appearance: none; 
      margin: 0; 
    }
    input[type=number] {
      -moz-appearance: textfield;
    }
  `}</style>
);

// --- Card (Enhanced Web3 Gradient Border) ---
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`relative p-[1px] rounded-2xl bg-gradient-to-b from-white/15 via-white/5 to-white/5 transition-all duration-300 hover:shadow-neon-hover ${className}`}>
    <div className="bg-nexus-card rounded-2xl h-full w-full p-6 backdrop-blur-xl relative z-10">
        {children}
    </div>
  </div>
);

// --- Neon Card ---
export const NeonCard: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div 
    onClick={onClick}
    className={`group relative rounded-2xl p-[1px] bg-gradient-to-br from-white/20 via-white/5 to-transparent hover:from-nexus-accent hover:via-purple-500 hover:to-pink-500 transition-all duration-300 ${onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    <div className="bg-[#0B0C15] h-full w-full rounded-2xl p-6 relative z-10 overflow-hidden transition-colors group-hover:bg-[#0f111a]">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="relative z-10 h-full flex flex-col">
            {children}
        </div>
    </div>
    <div className="absolute inset-0 bg-nexus-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl -z-0"></div>
  </div>
);

// --- Avatar ---
export const Avatar: React.FC<{ name: string; size?: 'sm' | 'md' | 'lg'; selected?: boolean; onClick?: () => void; className?: string }> = ({ name, size = 'md', selected, onClick, className = '' }) => {
  const sizeClasses = { sm: "h-8 w-8 text-xs", md: "h-12 w-12 text-sm", lg: "h-16 w-16 text-lg" };
  return (
    <div 
      onClick={onClick}
      className={`relative rounded-xl flex items-center justify-center font-bold text-white transition-all duration-300 ${sizeClasses[size]} ${onClick ? 'cursor-pointer' : ''} ${selected ? 'scale-110 shadow-[0_0_15px_rgba(99,102,241,0.6)] z-10' : 'opacity-70 hover:opacity-100 hover:scale-105'} ${className}`}
      style={{
        background: selected ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        border: selected ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.05)'
      }}
    >
      {name.charAt(0)}
      {selected && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[#0B0C15]"></div>}
    </div>
  );
};

// --- Custom Select ---
export const CustomSelect: React.FC<{ label?: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; className?: string }> = ({ label, value, options, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find(o => o.value === value)?.label || '请选择';
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`} ref={containerRef}>
      {label && <label className="text-xs font-semibold text-nexus-muted uppercase tracking-wider pl-1">{label}</label>}
      <div className="relative">
        <div onClick={() => setIsOpen(!isOpen)} className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm text-white cursor-pointer flex justify-between items-center transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] ${isOpen ? 'ring-1 ring-nexus-accent/50 border-nexus-accent/50 bg-white/10' : ''}`}>
          <span>{selectedLabel}</span>
          <ChevronDown size={16} className={`text-nexus-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
        <div className={`absolute top-full left-0 right-0 mt-2 bg-[#0F111A]/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] z-50 transition-all duration-200 origin-top ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
          <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-1">
            {options.map((opt) => (
              <div key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }} className={`px-3 py-2.5 rounded-lg text-sm cursor-pointer flex items-center justify-between transition-colors duration-150 ${value === opt.value ? 'bg-nexus-accent/20 text-nexus-accent' : 'text-nexus-muted hover:text-white hover:bg-white/5'}`}>
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

// --- Custom Month Picker ---
export const CustomMonthPicker: React.FC<{ label?: string; value: string; onChange: (value: string) => void; className?: string }> = ({ label, value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialDate = value ? new Date(value + '-01') : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  useEffect(() => { if (value) setViewYear(new Date(value + '-01').getFullYear()); }, [value]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`} ref={containerRef}>
      {label && <label className="text-xs font-semibold text-nexus-muted uppercase tracking-wider pl-1">{label}</label>}
      <div className="relative">
        <div onClick={() => setIsOpen(!isOpen)} className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm text-white cursor-pointer flex justify-between items-center transition-all duration-300 group hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] ${isOpen ? 'ring-1 ring-nexus-accent/50 border-nexus-accent/50 bg-white/10' : ''}`}>
          <span className={value ? 'text-white font-mono' : 'text-gray-500'}>{value}</span>
          <CalendarIcon size={16} className={`text-nexus-muted group-hover:text-white transition-colors duration-300 ${isOpen ? 'text-nexus-accent' : ''}`} />
        </div>
        <div className={`absolute top-full left-0 mt-2 w-[280px] bg-[#0F111A]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] z-50 p-4 transition-all duration-200 origin-top-left ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
            <button onClick={(e) => {e.stopPropagation(); setViewYear(prev => prev - 1)}} className="p-1 rounded-lg hover:bg-white/10 text-nexus-muted hover:text-white transition-colors"><ChevronLeft size={16}/></button>
            <div className="text-sm font-bold text-white font-mono">{viewYear}</div>
            <button onClick={(e) => {e.stopPropagation(); setViewYear(prev => prev + 1)}} className="p-1 rounded-lg hover:bg-white/10 text-nexus-muted hover:text-white transition-colors"><ChevronRight size={16}/></button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }).map((_, idx) => {
              const currentMonthVal = `${viewYear}-${String(idx + 1).padStart(2, '0')}`;
              const isSelected = value === currentMonthVal;
              return (
                <button key={idx} onClick={(e) => { e.stopPropagation(); onChange(currentMonthVal); setIsOpen(false); }} className={`py-2 rounded-lg text-xs font-medium transition-all duration-200 ${isSelected ? 'bg-nexus-accent text-white shadow-neon' : 'text-white hover:bg-white/10 hover:text-white'}`}>
                  {new Date(viewYear, idx).toLocaleString('default', { month: 'short' })}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Custom Date Picker ---
export const CustomDatePicker: React.FC<{ label?: string; value: string; onChange: (date: string) => void; className?: string }> = ({ label, value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  useEffect(() => { if (value) setViewDate(new Date(value)); }, [value]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const daysArray = Array(firstDay).fill(null).concat(Array.from({length: daysInMonth}, (_, i) => new Date(year, month, i+1)));
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`} ref={containerRef}>
      {label && <label className="text-xs font-semibold text-nexus-muted uppercase tracking-wider pl-1">{label}</label>}
      <div className="relative">
        <div onClick={() => setIsOpen(!isOpen)} className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-sm text-white cursor-pointer flex justify-between items-center transition-all duration-300 group hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] ${isOpen ? 'ring-1 ring-nexus-accent/50 border-nexus-accent/50 bg-white/10' : ''}`}>
          <span className={value ? 'text-white font-mono' : 'text-gray-500'}>{value || 'YYYY-MM-DD'}</span>
          <CalendarIcon size={16} className={`text-nexus-muted group-hover:text-white transition-colors duration-300 ${isOpen ? 'text-nexus-accent' : ''}`} />
        </div>
        <div className={`absolute top-full left-0 mt-2 w-[280px] bg-[#0F111A]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] z-50 p-4 transition-all duration-200 origin-top-left ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
            <button onClick={(e) => {e.stopPropagation(); setViewDate(new Date(year, month-1, 1))}} className="p-1 rounded-lg hover:bg-white/10 text-nexus-muted hover:text-white transition-colors"><ChevronLeft size={16}/></button>
            <div className="text-sm font-bold text-white font-mono">{viewDate.toLocaleString('default', { month: 'short' })} {year}</div>
            <button onClick={(e) => {e.stopPropagation(); setViewDate(new Date(year, month+1, 1))}} className="p-1 rounded-lg hover:bg-white/10 text-nexus-muted hover:text-white transition-colors"><ChevronRight size={16}/></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">{['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="text-[10px] text-nexus-muted uppercase font-bold">{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {daysArray.map((date, idx) => (
              <button key={idx} onClick={(e) => { if(date) { e.stopPropagation(); onChange(date.toISOString().split('T')[0]); setIsOpen(false); }}} className={`h-8 w-8 rounded-lg text-xs font-medium transition-all duration-200 ${!date ? 'invisible' : value === date.toISOString().split('T')[0] ? 'bg-nexus-accent text-white shadow-neon' : 'text-white hover:bg-white/10'}`}>{date?.getDate()}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Pagination ---
export const Pagination: React.FC<{ currentPage: number; totalPages: number; onPageChange: (p: number) => void }> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-2 rounded-xl bg-white/5 border border-white/10 text-nexus-muted hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronLeft size={16} /></button>
      <div className="flex gap-2">{Array.from({ length: totalPages }).map((_, idx) => <button key={idx+1} onClick={() => onPageChange(idx+1)} className={`w-8 h-8 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center ${idx+1 === currentPage ? 'bg-nexus-accent text-white shadow-neon scale-110' : 'bg-white/5 text-nexus-muted hover:bg-white/10 hover:text-white'}`}>{idx+1}</button>)}</div>
      <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="p-2 rounded-xl bg-white/5 border border-white/10 text-nexus-muted hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronRight size={16} /></button>
    </div>
  );
};

// --- Bar Chart ---
export const BarChart: React.FC<{ data: any[]; height?: number; colorStart?: string; colorEnd?: string }> = ({ data, height = 200, colorStart = 'from-emerald-500', colorEnd = 'to-teal-600' }) => {
  const maxValue = Math.max(...data.map((d: any) => d.value), 1);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return (
    <div className="w-full flex items-end justify-between gap-2 px-2 pt-6" style={{ height: `${height}px` }}>
      {data.map((item: any, idx: number) => {
        const percent = (item.value / maxValue) * 100;
        const isHovered = hoverIdx === idx;
        const displayValue = Math.round(item.value); 
        const barHeight = Math.max(percent, 2);
        
        // Deduction check for tooltip: Explicit leave deduction or implicit (Standard > RealBasic)
        const hasImplicitDeduction = item.details && item.details.base > item.details.realBasic && item.details.deduction === 0;
        
        return (
          <div key={idx} className="relative flex-1 flex flex-col justify-end items-center group h-full" onMouseEnter={() => setHoverIdx(idx)} onMouseLeave={() => setHoverIdx(null)}>
            <div className={`absolute bottom-full mb-3 bg-[#0F111A] border border-white/10 px-4 py-3 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] z-20 pointer-events-none transition-all duration-200 whitespace-nowrap min-w-[200px] ${isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'}`}>
               <div className="text-xs text-nexus-muted mb-2 border-b border-white/5 pb-1">{item.label} 薪资详情</div>
               {item.details ? (
                 <div className="space-y-1 text-xs">
                    {item.details.days !== undefined && item.details.standardDays !== undefined && (
                        <div className="flex justify-between gap-4 mb-2 bg-white/5 p-1.5 rounded">
                            <span className="text-gray-400">出勤</span>
                            {/* If paid days are less than standard days, show gap in red, otherwise full attendance */}
                            {item.details.days < item.details.standardDays ? (
                                <span className="text-red-400 font-mono font-bold">{item.details.days}天 (缺{item.details.standardDays - item.details.days}天)</span>
                            ) : (
                                <span className="text-green-400 font-mono font-bold">{item.details.days}天 (全勤)</span>
                            )}
                        </div>
                    )}
                    
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-400">标准薪资</span>
                        <span className="text-white font-mono">¥{Math.round(item.details.base).toLocaleString()}</span>
                    </div>

                    {/* Explicit Leave Deduction */}
                    {item.details.deduction > 0 && (
                        <div className="flex justify-between gap-4">
                            <span className="text-red-400">请假扣除</span>
                            <span className="text-red-400 font-mono">-¥{Math.round(item.details.deduction).toLocaleString()}</span>
                        </div>
                    )}

                    {/* Implicit Deduction (Late Join / Partial Month) */}
                    {hasImplicitDeduction && (
                        <div className="flex justify-between gap-4">
                            <span className="text-orange-400">缺勤/未入职扣除</span>
                            <span className="text-orange-400 font-mono">-¥{Math.round(item.details.base - item.details.realBasic).toLocaleString()}</span>
                        </div>
                    )}

                    <div className="flex justify-between gap-4 border-t border-white/5 pt-1 mt-1">
                        <span className="text-gray-400">实发底薪</span>
                        <span className="text-white font-mono">¥{Math.round(item.details.realBasic).toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between gap-4"><span className="text-gray-400">绩效奖金</span><span className="text-green-400 font-mono">+¥{Math.round(item.details.bonus).toLocaleString()}</span></div>
                    {item.details.attendanceBonus > 0 && <div className="flex justify-between gap-4"><span className="text-yellow-400">全勤奖</span><span className="text-yellow-400 font-mono">+¥{Math.round(item.details.attendanceBonus).toLocaleString()}</span></div>}
                    
                    {/* Calculate Net Pay */}
                    <div className="border-t border-white/10 my-1 pt-1 flex justify-between gap-4"><span className="text-white font-bold">实际发放</span><span className="text-nexus-accent font-bold font-mono">¥{Math.round(item.details.real).toLocaleString()}</span></div>
                 </div>
               ) : ( <div className="text-lg font-bold text-white font-mono leading-none">¥{displayValue.toLocaleString()}</div> )}
               <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#0F111A]"></div>
            </div>
            <div className="relative w-full h-full flex items-end justify-center">
                <div className={`absolute w-full text-center text-[10px] font-mono font-bold transition-all duration-300 pointer-events-none z-10 ${isHovered ? 'text-white -translate-y-1 scale-110' : 'text-white/70 translate-y-0'}`} style={{ bottom: mounted ? `${barHeight}%` : '0%', marginBottom: '2px' }}>{item.value > 0 ? `¥${displayValue.toLocaleString()}` : ''}</div>
                <div className={`w-full max-w-[40px] rounded-t-sm transition-all duration-700 ease-out bg-gradient-to-t ${colorStart} ${colorEnd} relative overflow-hidden ${isHovered ? 'brightness-125 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'opacity-80'}`} style={{ height: mounted ? `${barHeight}%` : '0%' }}><div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div></div>
            </div>
            <div className={`text-[10px] text-center mt-3 font-mono transition-colors duration-200 ${isHovered ? 'text-white font-bold' : 'text-nexus-muted'}`}>{item.label.split('-')[1] || item.label}</div>
          </div>
        );
      })}
    </div>
  );
};

// --- Line Chart ---
export const LineChart: React.FC<{ data: { label: string; value: number }[]; height?: number }> = ({ data, height = 250 }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  if (!data || data.length === 0) return <div className="h-[250px] flex items-center justify-center text-nexus-muted">暂无数据</div>;
  const maxValue = Math.max(...data.map(d => d.value)) * 1.1 || 1000;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (d.value / maxValue) * 100;
    return { x, y, ...d };
  });
  const pathD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
  const areaD = `${pathD} L 100,100 L 0,100 Z`;

  return (
    <div className="relative w-full" style={{ height: `${height}px` }} onMouseLeave={() => setHoverIdx(null)}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={areaD} fill="url(#lineGradient)" className="opacity-50 animate-grow" />
        <path d={pathD} fill="none" stroke="#818cf8" strokeWidth="0.8" filter="url(#glow)" className="animate-draw" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHoverIdx(i)}>
            <circle cx={p.x} cy={p.y} r={hoverIdx === i ? "2" : "1"} fill="#fff" className="transition-all duration-300" />
            <circle cx={p.x} cy={p.y} r={hoverIdx === i ? "4" : "0"} fill="rgba(99,102,241,0.3)" className="animate-pulse" />
          </g>
        ))}
      </svg>
      {hoverIdx !== null && (
        <div className="absolute bg-[#0F111A] border border-white/10 rounded-xl px-3 py-2 text-xs shadow-neon pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all" style={{ left: `${points[hoverIdx].x}%`, top: `${points[hoverIdx].y}%`, marginTop: '-12px' }}>
          <div className="text-nexus-muted mb-1">{points[hoverIdx].label}</div>
          <div className="text-white font-mono font-bold">¥{Math.round(points[hoverIdx].value).toLocaleString()}</div>
        </div>
      )}
      <div className="absolute bottom-0 w-full flex justify-between text-[10px] text-nexus-muted translate-y-full pt-2">
        {data.map((d, i) => (
          <span key={i} className={i === 0 || i === data.length-1 || i % 2 === 0 ? 'opacity-100' : 'opacity-0 md:opacity-50'}>{d.label.split('-')[1] || d.label}月</span>
        ))}
      </div>
    </div>
  );
};

// ... (Button, Input, Badge, Modal, Toast, ToastContainer)
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
  const variants = {
    primary: "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-neon hover:shadow-neon-hover border border-white/10",
    success: "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-neon hover:shadow-neon-hover border border-white/10",
    secondary: "bg-white/5 border border-white/10 text-nexus-text hover:bg-white/10 hover:border-white/20 backdrop-blur-md",
    danger: "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40",
    ghost: "text-nexus-muted hover:text-nexus-text hover:bg-white/5"
  };
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-5 py-2.5 text-sm", lg: "px-8 py-3 text-base" };
  
  return (
    <button className={`rounded-xl font-medium transition-all duration-150 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden ${sizes[size]} ${variants[variant]} ${className}`} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? <span className="animate-spin">C</span> : (icon && <span className="opacity-90">{icon}</span>)}
      {children}
    </button>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-semibold text-nexus-muted uppercase tracking-wider pl-1">{label}</label>}
    <input className={`bg-nexus-dark/50 border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-sm text-nexus-text placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-nexus-accent/50 focus:border-nexus-accent transition-all ${className}`} {...props} />
    {error && <span className="text-xs text-red-400 pl-1">{error}</span>}
  </div>
);

export const Badge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = { PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', APPROVED: 'bg-green-500/10 text-green-400 border-green-500/20', REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20', PROBATION: 'bg-orange-500/10 text-orange-400 border-orange-500/20', OFFICIAL: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
  const labels: Record<string, string> = { PENDING: '申请中', APPROVED: '已批准', REJECTED: '已拒绝', PROBATION: '试用期', OFFICIAL: '正式员工' };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>{labels[status] || status}</span>;
};

export interface ModalProps {
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
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300" onClick={onClose} />
      <div className="relative bg-[#0F111A] border border-white/10 rounded-2xl w-[92%] md:w-full max-w-2xl shadow-2xl transform transition-all animate-slide-up duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent"><h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2"><span className="w-1 h-6 bg-nexus-accent rounded-full"></span>{title}</h3><button onClick={onClose} className="text-nexus-muted hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-lg"><X size={18} /></button></div>
        <div className="p-5 md:p-8 overflow-y-auto custom-scrollbar">{children}</div>
        {footer && <div className="p-4 md:p-6 border-t border-white/5 bg-white/5 rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
};

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
  const icons = { success: <CheckCircle size={18} className="text-green-400" />, error: <AlertCircle size={18} className="text-red-400" />, info: <Info size={18} className="text-blue-400" /> };
  const bgStyles = { success: "bg-[#0F111A] border-green-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]", error: "bg-[#0F111A] border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]", info: "bg-[#0F111A] border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]" };
  return <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md animate-slide-up ${bgStyles[type]}`}>{icons[type]}<span className="text-sm font-medium text-white">{message}</span><button onClick={onClose} className="ml-2 text-white/50 hover:text-white"><X size={14} /></button></div>;
};

export const ToastContainer: React.FC<{ toasts: { id: string; message: string; type: ToastType }[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => (
  <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3">{toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />)}</div>
);

// --- Component Export ---
export const UI = () => {
    return (
        <GlobalStyles />
    )
}
