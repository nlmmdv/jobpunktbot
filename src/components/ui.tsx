import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes, InputHTMLAttributes } from 'react';

/**
 * UI-примитивы ПроПункт.
 *
 * Тонкая обёртка над дизайн-системой из `src/styles/design-system.css`.
 * Единый источник стилей — CSS-классы (.screen, .card, .btn, .chip …),
 * компоненты лишь задают структуру и подставляют вариант (freelancer/owner).
 */

export type Variant = 'freelancer' | 'owner';

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/* ── Layout ──────────────────────────────────────────────── */

export const Screen = ({ children, center }: { children: ReactNode; center?: boolean }) => (
  <div
    className="screen"
    style={center ? { display: 'flex', flexDirection: 'column', justifyContent: 'center' } : undefined}
  >
    {children}
  </div>
);

export const BackButton = ({ onClick, variant }: { onClick: () => void; variant: Variant }) => (
  <button className={cx('back-btn', variant)} onClick={onClick}>
    ← Назад
  </button>
);

export const ScreenHeader = ({
  title,
  subtitle,
  variant,
  onBack,
  action,
}: {
  title: string;
  subtitle?: string;
  variant?: Variant;
  onBack?: () => void;
  action?: ReactNode;
}) => (
  <>
    {onBack && variant && <BackButton onClick={onBack} variant={variant} />}
    {action ? (
      <div className="section-header">
        <div className="title" style={{ marginBottom: 0 }}>{title}</div>
        {action}
      </div>
    ) : (
      <div className="title">{title}</div>
    )}
    {subtitle && <div className="subtitle">{subtitle}</div>}
  </>
);

export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <div className="section-title">{children}</div>
);

/* ── Cards ───────────────────────────────────────────────── */

export const Card = ({
  children,
  variant,
  large,
  onClick,
  style,
}: {
  children: ReactNode;
  variant: Variant;
  large?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}) => (
  <div
    className={cx(large ? 'card-lg' : 'card', variant)}
    onClick={onClick}
    style={{ ...(onClick ? { cursor: 'pointer' } : null), ...style }}
  >
    {children}
  </div>
);

/* ── Buttons ─────────────────────────────────────────────── */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  tone?: 'primary' | 'secondary' | 'danger' | 'outline';
  small?: boolean;
};

export const Button = ({ variant = 'freelancer', tone = 'primary', small, className, ...rest }: ButtonProps) => {
  const toneClass =
    tone === 'secondary' ? 'secondary'
    : tone === 'danger' ? 'danger'
    : tone === 'outline' ? cx('ghost-outline', variant === 'owner' && 'owner')
    : variant;
  return <button className={cx('btn', toneClass, small && 'btn-sm', className)} {...rest} />;
};

/* ── Form controls ───────────────────────────────────────── */

export const Label = ({ children }: { children: ReactNode }) => <div className="label">{children}</div>;

type FieldProps = { label?: ReactNode; children: ReactNode };
const Field = ({ label, children }: FieldProps) => (
  <div className="field">
    {label && <Label>{label}</Label>}
    {children}
  </div>
);

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; variant?: Variant };
export const TextField = ({ label, variant = 'freelancer', className, ...rest }: TextFieldProps) => (
  <Field label={label}>
    <input className={cx('input', variant === 'owner' && 'owner', className)} {...rest} />
  </Field>
);

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: ReactNode; variant?: Variant };
export const TextArea = ({ label, variant = 'freelancer', rows = 4, className, ...rest }: TextAreaProps) => (
  <Field label={label}>
    <textarea className={cx('input', 'textarea', variant === 'owner' && 'owner', className)} rows={rows} {...rest} />
  </Field>
);

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & { label?: ReactNode; variant?: Variant };
export const SelectField = ({ label, variant = 'freelancer', className, children, ...rest }: SelectFieldProps) => (
  <Field label={label}>
    <select className={cx('select', variant === 'owner' && 'owner', className)} {...rest}>
      {children}
    </select>
  </Field>
);

/* ── Chips & badges ──────────────────────────────────────── */

export const Chip = ({
  label,
  active,
  variant,
  onClick,
}: {
  label: ReactNode;
  active: boolean;
  variant: Variant;
  onClick?: () => void;
}) => (
  <span className={cx('chip', active ? 'active' : 'inactive', variant)} onClick={onClick}>
    {label}
  </span>
);

export const Badge = ({ children, tone }: { children: ReactNode; tone: 'temp-f' | 'perm-f' | 'temp-o' }) => (
  <span className={cx('badge', tone)}>{children}</span>
);

/* ── Menu grid ───────────────────────────────────────────── */

export interface MenuItem<Screen extends string> {
  screen: Screen;
  icon: string;
  label: string;
  wide?: boolean;
}

export function MenuGrid<Screen extends string>({
  items,
  variant,
  onSelect,
}: {
  items: MenuItem<Screen>[];
  variant: Variant;
  onSelect: (screen: Screen) => void;
}) {
  return (
    <div className="menu-grid">
      {items.map((item) => (
        <div
          key={item.screen}
          className={cx('menu-card', variant, item.wide && 'wide')}
          onClick={() => onSelect(item.screen)}
        >
          <span className="icon">{item.icon}</span>
          <span className="label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Modal / bottom sheet ────────────────────────────────── */

export const Modal = ({
  title,
  children,
  onClose,
  zIndex,
}: {
  title?: ReactNode;
  children: ReactNode;
  onClose?: () => void;
  zIndex?: number;
}) => (
  <div className="modal-overlay" style={zIndex ? { zIndex } : undefined} onClick={onClose}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      {title && <div className="title" style={{ marginBottom: 16 }}>{title}</div>}
      {children}
    </div>
  </div>
);

/* ── States ──────────────────────────────────────────────── */

export const Loading = ({ text = 'Загрузка...' }: { text?: string }) => (
  <div className="empty-state">{text}</div>
);

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <div className="empty-state">{children}</div>
);

export const ErrorText = ({ children }: { children: ReactNode }) => (
  <div className="error-text" style={{ marginTop: 0 }}>{children}</div>
);
