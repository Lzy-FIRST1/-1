export function notifySupported(): boolean {
  return typeof Notification !== 'undefined';
}

export async function requestNotifyPermission(): Promise<boolean> {
  if (!notifySupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function notify(title: string, body?: string): void {
  if (!notifySupported() || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: 'icons/icon-192.png' });
  } catch {
    /* 忽略 */
  }
}
