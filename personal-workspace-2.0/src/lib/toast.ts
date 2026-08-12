export interface ToastMsg {
  id: number;
  text: string;
  kind: 'ok' | 'err' | 'info';
}

type Listener = (t: ToastMsg) => void;
const listeners = new Set<Listener>();

export function toast(text: string, kind: ToastMsg['kind'] = 'info'): void {
  const t: ToastMsg = { id: Date.now() + Math.random(), text, kind };
  listeners.forEach((l) => l(t));
}

export function onToast(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
