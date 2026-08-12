import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './components/layout';
import { Toaster } from './components/toaster';
import { TimerProvider } from './lib/timer';
import { RitualGate } from './components/ritual-gate';
import Dashboard from './pages/dashboard';
import Ritual from './pages/ritual';
import Brain from './pages/brain';
import Todos from './pages/todos';
import Exam from './pages/exam';
import Reviews from './pages/reviews';
import Thoughts from './pages/thoughts';
import Diary from './pages/diary';
import Exercise from './pages/exercise';
import Wellness from './pages/wellness';
import Mood from './pages/mood';
import Dates from './pages/dates';
import Goals from './pages/goals';
import Analytics from './pages/analytics';
import Search from './pages/search';
import Pomodoro from './pages/pomodoro';
import Rumination from './pages/rumination';
import Decisions from './pages/decisions';
import Settings from './pages/settings';
import Login from './pages/login';
import { db } from './lib/db';
import { useWorkspace } from './store';
import { notify } from './lib/notify';
import { daysBetween, formatCN, todayStr } from './lib/utils';
import type { ImportantDate, Todo } from './lib/types';

function useDailyReminders() {
  const { settings } = useWorkspace();
  useEffect(() => {
    if (!settings.notifications || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const check = () => {
      const today = todayStr();
      const key = `pw-reminded-${today}`;
      let done: string[] = [];
      try { done = JSON.parse(localStorage.getItem(key) || '[]'); } catch { /* 忽略 */ }
      const mark = (id: string) => {
        done.push(id);
        localStorage.setItem(key, JSON.stringify(done));
      };
      void db.records.where('kind').equals('importantDate').toArray().then((rows) => {
        for (const row of rows) {
          const d = row.data as ImportantDate;
          if (!d || row.deletedAt) continue;
          const n = daysBetween(today, d.date);
          if (n >= 0 && d.remindDays?.includes(n) && !done.includes(`date:${d.id}`)) {
            notify(`「${d.title}」还有 ${n} 天`, formatCN(d.date));
            mark(`date:${d.id}`);
          }
        }
      });
      void db.records.where('kind').equals('todo').toArray().then((rows) => {
        for (const row of rows) {
          const t = row.data as Todo;
          if (!t || row.deletedAt || t.done) continue;
          if (t.dueDate === today && t.priority === 1 && !done.includes(`todo:${t.id}`)) {
            notify('今天有高优先级待办', t.title);
            mark(`todo:${t.id}`);
          }
        }
      });
    };
    check();
    const timer = setInterval(check, 3600000);
    return () => clearInterval(timer);
  }, [settings.notifications]);
}

function useReviewReminder() {
  const { settings } = useWorkspace();
  useEffect(() => {
    if (!settings.notifications || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const timer = setInterval(() => {
      const now = new Date();
      if (now.getHours() !== settings.remindReviewHour) return;
      const key = `pw-review-${todayStr()}`;
      if (localStorage.getItem(key)) return;
      void db.records.get(['review', `daily:${todayStr()}`]).then((row) => {
        if (row && !row.deletedAt) return;
        notify('该做每日复盘了', '花 5 分钟：收获、浪费、明天第一件事。');
        localStorage.setItem(key, '1');
      });
    }, 60000);
    return () => clearInterval(timer);
  }, [settings.notifications, settings.remindReviewHour]);
}

export default function App() {
  // 注册 PWA service worker
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
    }
  }, []);

  useDailyReminders();
  useReviewReminder();

  return (
    <TimerProvider>
      <RitualGate />
      <Shell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ritual" element={<Ritual />} />
          <Route path="/brain" element={<Brain />} />
          <Route path="/todos" element={<Todos />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/thoughts" element={<Thoughts />} />
          <Route path="/diary" element={<Diary />} />
          <Route path="/exercise" element={<Exercise />} />
          <Route path="/wellness" element={<Wellness />} />
          <Route path="/mood" element={<Mood />} />
          <Route path="/dates" element={<Dates />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/search" element={<Search />} />
          <Route path="/pomodoro" element={<Pomodoro />} />
          <Route path="/rumination" element={<Rumination />} />
          <Route path="/decisions" element={<Decisions />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
      <Toaster />
    </TimerProvider>
  );
}
