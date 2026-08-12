import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Btn, Card, Empty, Field, Input, Ring, Seg, Select, Stat, Tag } from '../components/ui';
import { Icon } from '../components/icons';
import { useRecords } from '../lib/hooks';
import { useWorkspace } from '../store';
import { useTimer } from '../lib/timer';
import { groupBy, lastNDays, sum, todayStr } from '../lib/utils';
import type { PomodoroSession, Todo } from '../lib/types';

export default function Pomodoro() {
  const { settings, saveSettings } = useWorkspace();
  const { phase, running, remaining, total, task, startFocus, startBreak, toggle, stop, lastCompleted } = useTimer();
  const sessions = useRecords<PomodoroSession>('pomodoro');
  const todos = useRecords<Todo>('todo');
  const [taskName, setTaskName] = useState('');
  const [minutes, setMinutes] = useState(String(settings.pomodoroMinutes));
  const today = todayStr();

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const todaySessions = sessions.filter((s) => s.date === today);
  const week = lastNDays(7);
  const weekSessions = sessions.filter((s) => week.includes(s.date));

  const byTask = groupBy(sessions.filter((s) => s.task), (s) => s.task!);
  const leaderboard = Object.entries(byTask)
    .map(([taskName, list]) => ({ task: taskName, minutes: sum(list.map((s) => s.minutes)), count: list.length }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5);

  const openTodos = todos.filter((t) => !t.done && !t.archived).sort((a, b) => a.priority - b.priority);

  const start = () => {
    const m = Number(minutes) || settings.pomodoroMinutes;
    startFocus(m, taskName);
  };

  const bars = week.map((d) => ({ label: d.slice(5), value: sum(sessions.filter((s) => s.date === d).map((s) => s.minutes)) }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">番茄钟</h2>
        <div className="flex items-center gap-2">
          <Select value={taskName} onChange={(e) => setTaskName(e.target.value)} className="!w-44 !py-2 text-sm">
            <option value="">当前任务（可选）</option>
            {openTodos.map((t) => <option key={t.id} value={t.title}>{t.title}</option>)}
          </Select>
          <Input type="number" min={1} max={120} value={minutes} onChange={(e) => setMinutes(e.target.value)} className="!w-20 text-center" title="专注时长（分钟）" />
          <Btn onClick={start}><Icon name="play" size={14} />开始专注</Btn>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center py-8">
          <Ring progress={total ? remaining / total : 0} size={220} stroke={12}>
            <div className={`tnum text-5xl font-bold tracking-tight ${phase === 'focus' ? 'text-[var(--red)]' : phase === 'break' ? 'text-[var(--green)]' : ''}`}>
              {mm}:{ss}
            </div>
            <div className="mt-1 text-xs text-[var(--text-3)]">
              {phase === 'focus' ? `专注中${task ? ` · ${task}` : ''}` : phase === 'break' ? '休息中' : '准备好后开始'}
            </div>
          </Ring>
          <div className="mt-6 flex gap-2">
            {phase !== 'idle' && (
              <>
                <Btn variant="soft" onClick={toggle}>{running ? <><Icon name="pause" size={14} />暂停</> : <><Icon name="play" size={14} />继续</>}</Btn>
                <Btn variant="ghost" onClick={stop}>结束</Btn>
              </>
            )}
            {phase === 'idle' && (
              <Btn variant="ghost" onClick={() => startBreak(settings.pomodoroShortBreak)}>休息 5 分钟</Btn>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            {[25, 40, 50].map((m) => (
              <button key={m} onClick={() => { setMinutes(String(m)); }} className={`rounded-lg px-3 py-1 text-xs font-medium ${Number(minutes) === m ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-2)] text-[var(--text-2)]'}`}>
                {m} 分钟
              </button>
            ))}
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-3 gap-3">
            <Stat icon="timer" label="今日专注" value={`${sum(todaySessions.map((s) => s.minutes))}分`} sub={`${todaySessions.length} 个番茄`} />
            <Stat icon="clock" label="本周专注" value={`${sum(weekSessions.map((s) => s.minutes))}分`} sub={`${weekSessions.length} 个番茄`} />
            <Stat icon="flame" label="累计" value={`${sum(sessions.map((s) => s.minutes))}分`} sub={`${sessions.length} 个番茄`} />
          </div>

          {lastCompleted && (
            <Card title="刚刚完成" className="border-[rgba(52,199,89,.3)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  <span className="font-semibold">{lastCompleted.task || '专注'}</span> 完成 {lastCompleted.minutes} 分钟。
                  <span className="text-[var(--text-2)]">趁热打铁，花两分钟复盘。</span>
                </p>
                <Link to="/reviews"><Btn size="sm"><Icon name="clipboard" size={13} />去做复盘</Btn></Link>
              </div>
            </Card>
          )}

          <Card title="近 7 天专注">
            <div className="flex h-28 items-end gap-1.5">
              {bars.map((b) => (
                <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div className="w-full rounded-t" style={{ height: `${Math.max(2, (b.value / Math.max(1, ...bars.map((x) => x.value))) * 90)}px`, background: b.value ? 'var(--red)' : 'var(--surface-2)' }} />
                  </div>
                  <span className="text-[10px] text-[var(--text-3)]">{b.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="专注排行榜（自己）">
            {leaderboard.length === 0 ? (
              <Empty icon="timer" text="专注时给任务命名，这里会出现排行榜。" />
            ) : (
              <div className="space-y-1.5">
                {leaderboard.map((l, i) => (
                  <div key={l.task} className="flex items-center gap-3 rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm">
                    <span className="tnum w-5 font-bold text-[var(--text-3)]">{i + 1}</span>
                    <span className="flex-1 truncate">{l.task}</span>
                    <Tag>{l.count} 次</Tag>
                    <span className="tnum font-semibold">{l.minutes} 分钟</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
