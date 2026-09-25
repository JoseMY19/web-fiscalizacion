import React from 'react';
import { cn } from '../../lib/cn';

// Nota: las clases que llegan por `className` desde fuera deben usar el
// modificador `!` (ej. `mb-0!`) cuando pisan una propiedad que el componente
// ya define, igual que antes `style` se aplicaba encima de los estilos base.

// ============================================================================
// BUTTON
// ============================================================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

const BUTTON_VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-[#1d4ed8] text-[#ffffff] border-none shadow-[0_2px_6px_rgba(29,78,216,0.2)] enabled:hover:bg-[#1e40af] enabled:hover:shadow-[0_6px_16px_rgba(29,78,216,0.35)]',
  secondary:
    'bg-[#ffffff] text-[#0f172a] border border-[#cbd5e1] shadow-[0_1px_3px_rgba(0,0,0,0.05)] enabled:hover:bg-[#f8fafc]',
  danger:
    'bg-[#dc2626] text-[#ffffff] border-none shadow-[0_2px_6px_rgba(220,38,38,0.2)] enabled:hover:bg-[#b91c1c] enabled:hover:shadow-[0_4px_12px_rgba(220,38,38,0.3)]',
  warning:
    'bg-[#d97706] text-[#ffffff] border-none shadow-[0_2px_6px_rgba(217,119,6,0.2)] enabled:hover:bg-[#b45309] enabled:hover:shadow-[0_4px_12px_rgba(217,119,6,0.3)]',
  success:
    'bg-[#16a34a] text-[#ffffff] border-none shadow-[0_2px_6px_rgba(22,163,74,0.2)] enabled:hover:bg-[#15803d] enabled:hover:shadow-[0_4px_12px_rgba(22,163,74,0.3)]',
  outline: 'bg-transparent text-[#1d4ed8] border border-[#1d4ed8] shadow-none enabled:hover:bg-[#eff6ff]',
  ghost: 'bg-transparent text-[#334155] border-none shadow-none enabled:hover:bg-[#f1f5f9]',
};

const BUTTON_SIZES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'py-[6px] px-[12px] text-[12px]',
  md: 'py-[9px] px-[18px] text-[13px]',
  lg: 'py-[12px] px-[24px] text-[15px]',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  className,
  ...props
}) => (
  <button
    disabled={disabled || loading}
    className={cn(
      'inline-flex items-center justify-center gap-[8px] font-semibold rounded-sm select-none',
      '[transition:all_160ms_cubic-bezier(0.4,0,0.2,1)]',
      'enabled:cursor-pointer enabled:hover:-translate-y-px enabled:active:translate-y-0',
      'disabled:cursor-not-allowed disabled:opacity-[0.65]',
      BUTTON_VARIANTS[variant] ?? BUTTON_VARIANTS.primary,
      BUTTON_SIZES[size] ?? BUTTON_SIZES.md,
      className,
    )}
    {...props}
  >
    {loading ? <Spinner size={16} color="currentColor" /> : icon}
    {children}
  </button>
);

// ============================================================================
// CARD
// ============================================================================
interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, title, subtitle, action, style, className }) => (
  <div
    className={cn(
      'bg-bg-card rounded-md border border-border shadow-sm overflow-hidden [transition:box-shadow_var(--transition-fast)]',
      className,
    )}
    style={style}
  >
    {(title || action) && (
      <div className="py-[16px] px-[20px] border-b border-b-border flex items-center justify-between bg-[#fafbfc]">
        <div>
          {typeof title === 'string' ? <h3 className="text-[15px] font-bold text-text-main">{title}</h3> : title}
          {subtitle && <p className="text-[12px] text-text-muted mt-[2px]">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    )}
    <div className="p-[20px]">{children}</div>
  </div>
);

// ============================================================================
// BADGE
// ============================================================================
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral' | 'midnight';
  size?: 'sm' | 'md';
}

const BADGE_VARIANTS: Record<string, string> = {
  success: 'bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]',
  warning: 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]',
  danger: 'bg-[#fff1f2] text-[#be123c] border-[#fecdd3]',
  info: 'bg-[#f0f9ff] text-[#0369a1] border-[#bae6fd]',
  purple: 'bg-[#f5f3ff] text-[#6d28d9] border-[#ddd6fe]',
  neutral: 'bg-[#f8fafc] text-[#475569] border-[#e2e8f0]',
  midnight: 'bg-[#10264a] text-[#ffffff] border-[#163666]',
};

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', size = 'sm' }) => (
  <span
    className={cn(
      'inline-flex items-center font-semibold rounded-[6px] border whitespace-nowrap tracking-[0.2px]',
      size === 'sm' ? 'py-[2px] px-[8px] text-[11px]' : 'py-[4px] px-[10px] text-[12px]',
      BADGE_VARIANTS[variant] || BADGE_VARIANTS.neutral,
    )}
  >
    {children}
  </span>
);

// ============================================================================
// SPINNER
// ============================================================================
export const Spinner: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'var(--color-primary-600)' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="inline-block animate-spin-fast align-middle">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" strokeLinecap="round" />
  </svg>
);

// ============================================================================
// MODAL
// ============================================================================
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, maxWidth = '560px' }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-[rgba(11,19,43,0.65)] backdrop-blur-[3px] flex items-center justify-center z-[9999] p-[16px]"
      onClick={onClose}
    >
      <div
        // maxWidth es una prop libre (cualquier valor CSS): se aplica en línea.
        className="bg-[#ffffff] rounded-lg shadow-xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="py-[18px] px-[24px] border-b border-b-border flex items-center justify-between bg-[#fafbfc]">
          <h3 className="text-[16px] font-bold text-midnight-900">{title}</h3>
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-text-muted p-[6px] rounded-[6px] flex items-center justify-center [transition:background_150ms] hover:bg-[#f1f5f9]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="p-[24px] overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="py-[16px] px-[24px] border-t border-t-border flex items-center justify-end gap-[12px] bg-[#f8fafc]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// FORM INPUTS
// ============================================================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const LABEL_CLASS = 'block text-[13px] font-semibold text-text-secondary mb-[6px]';
const FIELD_CLASS = 'w-full py-[10px] px-[14px] text-[14px] rounded-sm border bg-[#ffffff] text-text-main outline-none';

export const Input: React.FC<InputProps> = ({ label, error, helperText, className, ...props }) => (
  <div className="mb-[14px] w-full">
    {label && <label className={LABEL_CLASS}>{label}</label>}
    <input
      className={cn(FIELD_CLASS, '[transition:border-color_var(--transition-fast)]', error ? 'border-danger' : 'border-border', className)}
      {...props}
    />
    {helperText && !error && <p className="text-[12px] text-text-muted mt-[4px]">{helperText}</p>}
    {error && <p className="text-[12px] text-danger mt-[4px]">{error}</p>}
  </div>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className, ...props }) => (
  <div className="mb-[14px] w-full">
    {label && <label className={LABEL_CLASS}>{label}</label>}
    <textarea className={cn(FIELD_CLASS, 'min-h-[80px]', error ? 'border-danger' : 'border-border', className)} {...props} />
    {error && <p className="text-[12px] text-danger mt-[4px]">{error}</p>}
  </div>
);

// ============================================================================
// ALERT
// ============================================================================
const ALERT_TYPES = {
  info: 'bg-info-bg text-[#0369a1] border-info-border',
  warning: 'bg-warning-bg text-[#92400e] border-warning-border',
  error: 'bg-danger-bg text-[#991b1b] border-danger-border',
  success: 'bg-success-bg text-[#166534] border-success-border',
};

export const Alert: React.FC<{
  type?: 'info' | 'warning' | 'error' | 'success';
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}> = ({ type = 'info', children, style, className }) => (
  <div
    className={cn('py-[12px] px-[16px] rounded-sm border text-[13px] mb-[16px] leading-[1.4]', ALERT_TYPES[type], className)}
    style={style}
  >
    {children}
  </div>
);

// ============================================================================
// EMPTY STATE
// ============================================================================
export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="py-[48px] px-[24px] text-center bg-[#ffffff] rounded-md border border-dashed border-border my-[16px]">
    {icon && <div className="text-text-light mb-[12px] flex justify-center">{icon}</div>}
    <h4 className="text-[16px] font-semibold text-text-main mb-[4px]">{title}</h4>
    {description && <p className="text-[13px] text-text-muted max-w-[400px] mx-auto mb-[16px]">{description}</p>}
    {action && <div className="mt-[16px]">{action}</div>}
  </div>
);
