import React from 'react';

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-nexus-card border border-white/5 rounded-2xl p-6 shadow-float backdrop-blur-sm ${className}`}>
    {children}
  </div>
);

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  isLoading, 
  className = '', 
  ...props 
}) => {
  const baseStyle = "rounded-xl font-medium transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-2.5",
    lg: "px-8 py-3 text-lg"
  };

  const variants = {
    primary: "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-neon hover:shadow-neon-hover",
    secondary: "bg-white/5 border border-white/10 text-nexus-text hover:bg-white/10 hover:border-white/20",
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
        <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : children}
    </button>
  );
};

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-semibold text-nexus-muted uppercase tracking-wider pl-1">{label}</label>}
    <input
      className={`bg-nexus-dark/50 border border-white/10 rounded-xl px-4 py-3 text-base text-nexus-text placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-nexus-accent/50 focus:border-nexus-accent transition-all ${className}`}
      {...props}
    />
  </div>
);

// --- Select ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-semibold text-nexus-muted uppercase tracking-wider pl-1">{label}</label>}
    <div className="relative">
      <select
        className={`bg-nexus-dark/50 border border-white/10 rounded-xl px-4 py-3 text-base text-nexus-text appearance-none w-full focus:outline-none focus:ring-2 focus:ring-nexus-accent/50 transition-all ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-nexus-card text-nexus-text">
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-nexus-muted">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </div>
    </div>
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
