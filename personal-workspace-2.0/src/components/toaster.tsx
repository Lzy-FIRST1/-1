import { useEffect, useState } from 'react';
import { onToast, type ToastMsg } from '../lib/toast';
import { Icon } from './icons';

export function Toaster() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => onToast((t) => {
    setItems((prev) => [...prev.slice(-2), t]);
    setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 2600);
  }), []);
  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-[80] flex w-[92vw] max-w-sm -translate-x-1/2 flex-col gap-2 sm:bottom-8">
      {items.map((t) => (
        <div
          key={t.id}
          className={`toast-in pointer-events-auto flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${
            t.kind === 'ok' ? 'border-[rgba(52,199,89,.35)] bg-[var(--surface)]' :
            t.kind === 'err' ? 'border-[rgba(255,59,48,.35)] bg-[var(--surface)]' :
            'border-[var(--line)] bg-[var(--surface)]'
          }`}
        >
          <Icon name={t.kind === 'ok' ? 'checkCircle' : t.kind === 'err' ? 'x' : 'bell'} size={16}
            style={{ color: t.kind === 'ok' ? 'var(--green)' : t.kind === 'err' ? 'var(--red)' : 'var(--accent)' }} />
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
