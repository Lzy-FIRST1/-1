import { useEffect, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { Icon } from './icons';
import { cnWeekday, lastNDays, todayStr, parseDate, daysInMonth } from '../lib/utils';

// ─── 基础控件 ────────────────────────────────────────────────────────────────

export function Btn({
  variant = 'primary', size = 'md', className = '', children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'soft' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = { sm: 'px-3 py-1.5 text-xs rounded-lg', md: 'px-4 py-2.5 text-sm rounded-xl', lg: 'px-5 py-3 text-[15px] rounded-xl' };
  const variants = {
    primary: 'btn-primary', ghost: 'btn-ghost', soft: 'btn-soft', danger: 'btn-danger'
  };
  return (
    <button className={`btn ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Card({
  title, action, children, className = '', pad = true, as
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  pad?: boolean;
  as?: 'div' | 'section';
}) {
  const Tag = as || 'div';
  return (
    <Tag className={`card ${pad ? 'p-4 sm:p-5' : ''} ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </Tag>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[var(--text-3)]">{hint}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className || ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`textarea ${props.className || ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`select ${props.className || ''}`} />;
}

export function Tag({ children, tone = 'default', className = '' }: { children: ReactNode; tone?: 'default' | 'on' | 'red' | 'green' | 'amber'; className?: string }) {
  const tones = {
    default: '', on: 'chip-on',
    red: '!bg-[rgba(255,59,48,.1)] !text-[var(--red)] !border-[rgba(255,59,48,.25)]',
    green: '!bg-[rgba(52,199,89,.1)] !text-[var(--green)] !border-[rgba(52,199,89,.3)]',
    amber: '!bg-[rgba(255,159,10,.12)] !text-[var(--amber)] !border-[rgba(255,159,10,.3)]'
  };
  return <span className={`chip ${tones[tone]} ${className}`}>{children}</span>;
}

export function Modal({
  open, onClose, title, children, wide = false
}: {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`fade-up relative z-10 max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] shadow-2xl sm:rounded-3xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} pb-[env(safe-area-inset-bottom)]`}>
        {title && (
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-5 py-3.5">
            <h3 className="text-[15px] font-semibold">{title}</h3>
            {onClose && (
              <button onClick={onClose} className="rounded-full p-1.5 text-[var(--text-2)] hover:bg-[var(--surface-2)]">
                <Icon name="x" />
              </button>
            )}
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ icon = 'inbox', text }: { icon?: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="text-[var(--text-3)]"><Icon name={icon} size={28} /></div>
      <p className="text-sm text-[var(--text-3)]">{text}</p>
    </div>
  );
}

export function Seg<T extends string | number>({
  options, value, onChange
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-xl bg-[var(--surface-2)] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
            value === o.value ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--text-2)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Progress({ value, max = 100, className = '', barClass = '' }: { value: number; max?: number; className?: string; barClass?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)] ${className}`}>
      <div className={`h-full rounded-full bg-[var(--accent)] transition-all ${barClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({ icon, label, value, sub }: { icon?: string; label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="card-flat p-3.5">
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-2)]">
        {icon && <Icon name={icon} size={13} />}
        <span>{label}</span>
      </div>
      <div className="tnum mt-1.5 text-2xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-[var(--text-3)]">{sub}</div>}
    </div>
  );
}

export function Ring({ progress, size = 168, stroke = 9, children }: { progress: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, progress)));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-2)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke="var(--accent)" strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

// ─── 热力图（GitHub 风格） ───────────────────────────────────────────────────

export function Heatmap({
  values, weeks = 16, color = 'var(--accent)'
}: {
  values: Record<string, number>;
  weeks?: number;
  color?: string;
}) {
  const days = lastNDays(weeks * 7);
  const start = parseDate(days[0]);
  const startDow = start.getDay();
  const cells: (string | null)[] = [...Array.from({ length: startDow }, () => null), ...days];
  const max = Math.max(1, ...Object.values(values));
  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-grid grid-flow-col gap-[3px]">
        {Array.from({ length: 7 }, (_, row) => (
          <div key={row} className="grid gap-[3px]">
            {cells.map((date, i) => {
              if ((i % 7) !== row) return null;
              if (date === null) return <div key={i} className="h-[11px] w-[11px]" />;
              const v = values[date] || 0;
              const alpha = v === 0 ? 0 : Math.max(0.18, v / max);
              const isToday = date === todayStr();
              return (
                <div
                  key={date}
                  title={`${date}：${v}`}
                  className="h-[11px] w-[11px] rounded-[3px]"
                  style={{ background: v ? color : 'var(--surface-2)', opacity: v ? alpha : 1, boxShadow: isToday ? '0 0 0 1.5px var(--accent)' : undefined }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 图表 ────────────────────────────────────────────────────────────────────

export function Sparkline({ points, height = 56, color = 'var(--accent)', labels }: { points: number[]; height?: number; color?: string; labels?: string[] }) {
  const w = 260;
  const max = Math.max(1, ...points);
  const min = Math.min(...points, 0);
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const coords = points.map((p, i) => `${i * step},${height - 4 - ((p - min) / (max - min || 1)) * (height - 10)}`);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      {labels && points.map((p, i) => (
        <rect key={i} x={i * step - step / 3} y={height - (p / max) * (height - 10) - 8} width={step / 1.5} height={(p / max) * (height - 10)} rx={2} fill={color} opacity={0.85} />
      ))}
      {!labels && <polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
    </svg>
  );
}

export function Bars({ data, height = 120, color = 'var(--accent)' }: { data: { label: string; value: number; sub?: string }[]; height?: number; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md transition-all"
              style={{ height: `${Math.max(2, (d.value / max) * (height - 22))}px`, background: d.value ? color : 'var(--surface-2)' }}
              title={`${d.label} ${d.value}`}
            />
          </div>
          <span className="text-[10px] text-[var(--text-3)]">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── 日历视图 ────────────────────────────────────────────────────────────────

export function MonthCalendar({
  month, marks, onPick, markColor = 'var(--accent)'
}: {
  month: string; // YYYY-MM
  marks: Record<string, number | boolean>;
  onPick?: (date: string) => void;
  markColor?: string;
}) {
  const [y, m] = month.split('-').map(Number);
  const firstDow = new Date(y, m - 1, 1).getDay();
  const total = daysInMonth(y, m);
  const cells: (string | null)[] = Array.from({ length: firstDow }, () => null);
  for (let d = 1; d <= total; d++) cells.push(`${month}-${String(d).padStart(2, '0')}`);
  return (
    <div className="grid grid-cols-7 gap-1">
      {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
        <div key={w} className="py-1 text-center text-[11px] text-[var(--text-3)]">{w}</div>
      ))}
      {cells.map((date, i) => {
        if (!date) return <div key={i} />;
        const mark = marks[date];
        const isToday = date === todayStr();
        return (
          <button
            key={date}
            onClick={() => onPick?.(date)}
            className={`relative flex aspect-square items-center justify-center rounded-lg text-[13px] tnum ${
              isToday ? 'font-bold text-[var(--accent)]' : 'text-[var(--text)]'
            } ${onPick ? 'hover:bg-[var(--surface-2)]' : ''}`}
          >
            {Number(date.slice(8))}
            {mark !== undefined && (
              <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full" style={{ background: markColor, opacity: typeof mark === 'number' ? Math.max(0.25, mark / 4) : 1 }} />
            )}
            <span className="sr-only">{cnWeekday(date)}</span>
          </button>
        );
      })}
    </div>
  );
}
