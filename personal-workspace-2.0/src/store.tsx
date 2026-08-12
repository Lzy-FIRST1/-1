import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode
} from 'react';
import { getSupabase } from './lib/supabase';
import { db } from './lib/db';
import { fullPull, isOnline, pullAll, pushAll } from './lib/sync';
import { defaultSettings, type AppSettings } from './lib/types';
import { getOne, save } from './lib/repo';
import { useThemeEffect } from './lib/theme';

export interface AuthUser {
  id: string;
  email: string;
}

interface WorkspaceCtx {
  user: AuthUser | null;
  guest: boolean;
  syncStatus: 'off' | 'idle' | 'syncing' | 'error';
  syncError: string | null;
  lastSyncedAt: string | null;
  online: boolean;
  settings: AppSettings;
  saveSettings(patch: Partial<AppSettings>): Promise<void>;
  signIn(email: string, password: string): Promise<string | null>;
  signUp(email: string, password: string): Promise<string | null>;
  signOut(): Promise<void>;
  syncNow(forceFull?: boolean): Promise<void>;
  refreshAuth(): Promise<void>;
}

const Ctx = createContext<WorkspaceCtx | null>(null);

export function useWorkspace(): WorkspaceCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('WorkspaceProvider 缺失');
  return ctx;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => defaultSettings());
  const [settingsReady, setSettingsReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'off' | 'idle' | 'syncing' | 'error'>('off');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [online, setOnline] = useState(isOnline());
  const busyRef = useRef(false);

  useThemeEffect(settings.theme);

  const syncNow = useCallback(async (forceFull = false) => {
    if (busyRef.current) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    busyRef.current = true;
    setSyncStatus('syncing');
    try {
      if (forceFull) await fullPull(data.user.id);
      await pushAll(data.user.id);
      await pullAll(data.user.id);
      setLastSyncedAt(new Date().toISOString());
      setSyncError(null);
      setSyncStatus('idle');
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : String(e));
      setSyncStatus('error');
    } finally {
      busyRef.current = false;
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setUser(null);
      setSyncStatus('off');
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      setUser({ id: data.session.user.id, email: data.session.user.email || '' });
      setSyncStatus('idle');
    } else {
      setUser(null);
      setSyncStatus('off');
    }
  }, []);

  // 加载设置
  useEffect(() => {
    (async () => {
      const existing = await getOne<AppSettings>('setting', 'app');
      setSettings({ ...defaultSettings(), ...(existing || {}) });
      setSettingsReady(true);
    })();
  }, []);

  // 初始化登录态 + 监听
  useEffect(() => {
    let unsub: (() => void) | undefined;
    void refreshAuth();
    const supabase = getSupabase();
    if (supabase) {
      unsub = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email || '' });
          setSyncStatus('idle');
          void syncNow();
        } else {
          setUser(null);
          setSyncStatus('off');
        }
      }).data.subscription.unsubscribe;
    }
    return () => unsub?.();
  }, [refreshAuth, syncNow]);

  // 在线状态 + 自动同步
  useEffect(() => {
    const on = () => { setOnline(true); if (user) void syncNow(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const timer = setInterval(() => {
      if (user && isOnline() && syncStatus !== 'syncing') void syncNow();
    }, 60000);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      clearInterval(timer);
    };
  }, [user, syncStatus, syncNow]);

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const supabase = getSupabase();
    if (!supabase) return '未配置 Supabase，无法登录';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    return null;
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<string | null> => {
    const supabase = getSupabase();
    if (!supabase) return '未配置 Supabase，无法注册';
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return error.message;
    return null;
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setSyncStatus('off');
  }, []);

  const saveSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch, updatedAt: new Date().toISOString() };
    setSettings(next);
    await save<AppSettings>('setting', next, user?.id || 'local');
  }, [settings, user]);

  const value = useMemo<WorkspaceCtx>(() => ({
    user,
    guest: !user,
    syncStatus,
    syncError,
    lastSyncedAt,
    online,
    settings,
    saveSettings,
    signIn,
    signUp,
    signOut,
    syncNow,
    refreshAuth
  }), [user, syncStatus, syncError, lastSyncedAt, online, settings, saveSettings, signIn, signUp, signOut, syncNow, refreshAuth]);

  if (!settingsReady) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[var(--text-2)]">加载中…</div>;
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { db };
