import React from 'react';

// ============================================================================
// BUTTON
// ============================================================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  style,
  ...props
}) => {
  const getStyles = (): React.CSSProperties => {
    let bg = 'var(--color-primary-600)';
    let color = '#ffffff';
    let border = 'none';

    if (variant === 'secondary') {
      bg = 'var(--color-bg-subtle)';
      color = 'var(--color-text-main)';
      border = '1px solid var(--color-border)';
    } else if (variant === 'danger') {
      bg = 'var(--color-danger)';
      color = '#ffffff';
    } else if (variant === 'warning') {
      bg = 'var(--color-warning)';
      color = '#ffffff';
    } else if (variant === 'success') {
      bg = 'var(--color-success)';
      color = '#ffffff';
    } else if (variant === 'outline') {
      bg = 'transparent';
      color = 'var(--color-primary-600)';
      border = '1px solid var(--color-primary-600)';
    } else if (variant === 'ghost') {
      bg = 'transparent';
      color = 'var(--color-text-secondary)';
    }

    const padding = size === 'sm' ? '6px 12px' : size === 'lg' ? '12px 24px' : '9px 18px';
    const fontSize = size === 'sm' ? '13px' : size === 'lg' ? '15px' : '14px';

    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding,
      fontSize,
      fontWeight: 600,
      borderRadius: 'var(--radius-sm)',
      backgroundColor: bg,
      color,
      border,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled || loading ? 0.65 : 1,
      transition: 'all var(--transition-fast)',
      boxShadow: variant === 'primary' ? 'var(--shadow-sm)' : 'none',
      ...style,
    };
  };

  return (
    <button disabled={disabled || loading} style={getStyles()} {...props}>
      {loading ? <Spinner size={16} color="currentColor" /> : icon}
      {children}
    </button>
  );
};

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

export const Card: React.FC<CardProps> = ({ children, title, subtitle, action, style }) => (
  <div
    style={{
      backgroundColor: 'var(--color-bg-card)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
      transition: 'box-shadow var(--transition-fast)',
      ...style,
    }}
  >
    {(title || action) && (
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#fafbfc',
        }}
      >
        <div>
          {typeof title === 'string' ? (
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-main)' }}>{title}</h3>
          ) : (
            title
          )}
          {subtitle && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    )}
    <div style={{ padding: '20px' }}>{children}</div>
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

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', size = 'sm' }) => {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    success: { bg: 'var(--color-success-bg)', color: 'var(--color-success)', border: 'var(--color-success-border)' },
    warning: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: 'var(--color-warning-border)' },
    danger: { bg: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: 'var(--color-danger-border)' },
    info: { bg: 'var(--color-info-bg)', color: 'var(--color-info)', border: 'var(--color-info-border)' },
    purple: { bg: 'var(--color-purple-bg)', color: 'var(--color-purple)', border: 'var(--color-purple-border)' },
    neutral: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
    midnight: { bg: '#0b132b', color: '#ffffff', border: '#1c2e59' },
  };

  const c = map[variant] || map.neutral;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'sm' ? '2px 8px' : '4px 12px',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: 600,
        borderRadius: 'var(--radius-pill)',
        backgroundColor: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
};

// ============================================================================
// SPINNER
// ============================================================================
export const Spinner: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'var(--color-primary-600)' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    style={{ animation: 'spin 0.8s linear infinite' }}
  >
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
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 19, 43, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#fafbfc',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-midnight-900)' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              fontSize: '18px',
              fontWeight: 700,
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              backgroundColor: '#f8fafc',
            }}
          >
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

export const Input: React.FC<InputProps> = ({ label, error, helperText, style, ...props }) => (
  <div style={{ marginBottom: '14px', width: '100%' }}>
    {label && (
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
        {label}
      </label>
    )}
    <input
      style={{
        width: '100%',
        padding: '10px 14px',
        fontSize: '14px',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
        backgroundColor: '#ffffff',
        color: 'var(--color-text-main)',
        outline: 'none',
        transition: 'border-color var(--transition-fast)',
        ...style,
      }}
      {...props}
    />
    {helperText && !error && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{helperText}</p>}
    {error && <p style={{ fontSize: '12px', color: 'var(--color-danger)', marginTop: '4px' }}>{error}</p>}
  </div>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, style, ...props }) => (
  <div style={{ marginBottom: '14px', width: '100%' }}>
    {label && (
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
        {label}
      </label>
    )}
    <textarea
      style={{
        width: '100%',
        padding: '10px 14px',
        fontSize: '14px',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
        backgroundColor: '#ffffff',
        color: 'var(--color-text-main)',
        outline: 'none',
        minHeight: '80px',
        ...style,
      }}
      {...props}
    />
    {error && <p style={{ fontSize: '12px', color: 'var(--color-danger)', marginTop: '4px' }}>{error}</p>}
  </div>
);

// ============================================================================
// ALERT
// ============================================================================
export const Alert: React.FC<{ type?: 'info' | 'warning' | 'error' | 'success'; children: React.ReactNode; style?: React.CSSProperties }> = ({
  type = 'info',
  children,
  style,
}) => {
  const map = {
    info: { bg: 'var(--color-info-bg)', color: '#0369a1', border: 'var(--color-info-border)' },
    warning: { bg: 'var(--color-warning-bg)', color: '#92400e', border: 'var(--color-warning-border)' },
    error: { bg: 'var(--color-danger-bg)', color: '#991b1b', border: 'var(--color-danger-border)' },
    success: { bg: 'var(--color-success-bg)', color: '#166534', border: 'var(--color-success-border)' },
  };
  const c = map[type];
  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
        fontSize: '13px',
        marginBottom: '16px',
        lineHeight: 1.4,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ============================================================================
// EMPTY STATE
// ============================================================================
export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div
    style={{
      padding: '48px 24px',
      textAlign: 'center',
      backgroundColor: '#ffffff',
      borderRadius: 'var(--radius-md)',
      border: '1px dashed var(--color-border)',
      margin: '16px 0',
    }}
  >
    {icon && <div style={{ color: 'var(--color-text-light)', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>{icon}</div>}
    <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>{title}</h4>
    {description && <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto 16px' }}>{description}</p>}
    {action && <div style={{ marginTop: '16px' }}>{action}</div>}
  </div>
);