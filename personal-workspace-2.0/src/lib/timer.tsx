import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode
} from 'react';
import { nowIso, todayStr } from './utils';
import { newId, save } from './repo';
import type { PomodoroSession } from './types';
import { notify } from './notify';
import { toast } from './toast';

type Phase = 'idle' | 'focus' | 'break';

interface TimerCtx {
  phase: Phase;
  running: boolean;
  remaining: number;
  total: number;
  task: string;
  lastCompleted: { minutes: number; task: string } | null;
  startFocus(minutes: number, task?: string): void;
  startBreak(minutes: number): void;
  toggle(): void;
  stop(): void;
}

const Ctx = createContext<TimerCtx | null>(null);

export function useTimer(): TimerCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('TimerProvider 缺失');
  return ctx;
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [running, setRunning] = useState(false);
  const [total, setTotal] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [task, setTask] = useState('');
  const [lastCompleted, setLastCompleted] = useState<{ minutes: number; task: string } | null>(null);
  const tickRef = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const saveSession = useCallback((minutes: number, taskName: string) => {
    const session: PomodoroSession = {
      id: newId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      date: todayStr(),
      minutes,
      task: taskName || undefined
    };
    void save('pomodoro', session);
  }, []);

  const finish = useCallback(() => {
    clear();
    setRunning(false);
    if (phase === 'focus') {
      setLastCompleted({ minutes: Math.round(total / 60), task });
      saveSession(Math.round(total / 60), task);
      notify('专注完成', task ? `「${task}」完成一个番茄钟，休息一下。` : '完成一个番茄钟，休息一下。');
      toast('专注完成，休息一下', 'ok');
      setPhase('idle');
    } else {
      notify('休息结束', '可以开始下一轮专注了。');
      toast('休息结束', 'info');
      setPhase('idle');
    }
  }, [clear, phase, task, total, saveSession]);

  useEffect(() => {
    if (!running) return;
    tickRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          finish();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return clear;
  }, [running, clear, finish]);

  const startFocus = useCallback((minutes: number, taskName = '') => {
    clear();
    setPhase('focus');
    setTotal(minutes * 60);
    setRemaining(minutes * 60);
    setTask(taskName);
    setRunning(true);
  }, [clear]);

  const startBreak = useCallback((minutes: number) => {
    clear();
    setPhase('break');
    setTotal(minutes * 60);
    setRemaining(minutes * 60);
    setRunning(true);
  }, [clear]);

  const toggle = useCallback(() => setRunning((r) => !r), []);
  const stop = useCallback(() => { clear(); setRunning(false); setPhase('idle'); }, [clear]);

  const value = useMemo<TimerCtx>(() => ({
    phase, running, remaining, total, task, lastCompleted,
    startFocus, startBreak, toggle, stop
  }), [phase, running, remaining, total, task, lastCompleted, startFocus, startBreak, toggle, stop]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
