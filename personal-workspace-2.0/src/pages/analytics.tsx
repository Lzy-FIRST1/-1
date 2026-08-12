import { useMemo } from 'react';
import { Bars, Card, Empty, Stat } from '../components/ui';
import { useRecords } from '../lib/hooks';
import { addDays, lastNDays, monthKey, nowIso, sum, todayStr, weekStart } from '../lib/utils';
import type {
  DiaryEntry, ExerciseEntry, MoodEntry, PomodoroSession, StudyEntry, Todo, WellnessEntry
} from '../lib/types';

export default function Analytics() {
  const todos = useRecords<Todo>('todo');
  const studies = useRecords<StudyEntry>('study');
  const exercises = useRecords<ExerciseEntry>('exercise');
  const wellness = useRecords<WellnessEntry>('wellness');
  const moods = useRecords<MoodEntry>('mood');
  const pomodoros = useRecords<PomodoroSession>('pomodoro');
  const diaries = useRecords<DiaryEntry>('diary');
  const today = todayStr();

  const days30 = lastNDays(30);
  const days14 = lastNDays(14);
  const days7 = lastNDays(7);

  const study30 = sum(studies.filter((s) => days30.includes(s.date)).map((s) => s.minutes));
  const exercise30 = exercises.filter((e) => days30.includes(e.date));
  const wellness30 = wellness.filter((w) => days30.includes(w.date));
  const mood30 = moods.filter((m) => days30.includes(m.date));
  const focus30 = sum(pomodoros.filter((p) => days30.includes(p.date)).map((p) => p.minutes));
  const diary30 = diaries.filter((d) => days30.includes(d.date)).length;

  const todoDone30 = todos.filter((t) => t.doneAt && days30.includes(t.doneAt.slice(0, 10))).length;
  const todoTotal30 = todos.filter((t) => (t.done && t.doneAt && days30.includes(t.doneAt.slice(0, 10))) || (t.createdAt.slice(0, 10) >= days30[0])).length;

  const moodPoints = useMemo(() => days30.map((d) => {
    const m = moods.find((x) => x.date === d);
    return m?.score ?? null;
  }), [moods, days30]);
  const moodAvg = (moodPoints.filter((x) => x !== null) as number[]).length
    ? (sum(moodPoints.filter((x) => x !== null) as number[]) / (moodPoints.filter((x) => x !== null) as number[]).length).toFixed(1)
    : '—';

  const studyBars = days14.map((d) => ({ label: d.slice(5), value: sum(studies.filter((s) => s.date === d).map((s) => s.minutes)) }));
  const exerciseBars = days14.map((d) => ({ label: d.slice(5), value: sum(exercises.filter((e) => e.date === d).map((e) => e.minutes)) }));
  const focusBars = days7.map((d) => ({ label: d.slice(5), value: sum(pomodoros.filter((p) => p.date === d).map((p) => p.minutes)) }));

  // 近 8 周待办完成率
  const weekCompletion = [...Array(8)].map((_, i) => {
    const ws = addDays(weekStart(), (i - 7) * 7);
    const end = addDays(ws, 6);
    const done = todos.filter((t) => t.doneAt && t.doneAt.slice(0, 10) >= ws && t.doneAt.slice(0, 10) <= end).length;
    const total = todos.filter((t) => (t.doneAt && t.doneAt.slice(0, 10) >= ws && t.doneAt.slice(0, 10) <= end) || (t.createdAt.slice(0, 10) >= ws && t.createdAt.slice(0, 10) <= end)).length;
    return { label: ws.slice(5, 10), value: total ? Math.round((done / total) * 100) : 0 };
  });

  const weekNow = days7;
  const weekBefore = lastNDays(7, addDays(today, -7));
  const studyNow = sum(studies.filter((s) => weekNow.includes(s.date)).map((s) => s.minutes));
  const studyBefore = sum(studies.filter((s) => weekBefore.includes(s.date)).map((s) => s.minutes));
  const exNow = new Set(exercises.filter((e) => weekNow.includes(e.date)).map((e) => e.date)).size;
  const exBefore = new Set(exercises.filter((e) => weekBefore.includes(e.date)).map((e) => e.date)).size;

  const summary = [
    `学习：本周 ${studyNow} 分钟${studyBefore ? `，上周 ${studyBefore} 分钟` : ''}${studyNow > studyBefore ? '，在变好。' : '，继续保持节奏。'}`,
    `运动：本周 ${exNow} 天${exBefore ? `，上周 ${exBefore} 天` : ''}。`,
    `情绪：近 30 天均值 ${moodAvg} / 10。`,
    `专注：近 30 天共 ${focus30} 分钟，${pomodoros.filter((p) => days30.includes(p.date)).length} 个番茄钟。`,
    `记录：近 30 天写了 ${diary30} 篇日记、${wellness30.length} 天养生打卡。`
  ].join('\n');

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">成长仪表盘</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Stat icon="book" label="学习(30天)" value={`${study30}分`} />
        <Stat icon="bolt" label="运动(30天)" value={`${exercise30.length}天`} sub={`${sum(exercise30.map((e) => e.minutes))} 分钟`} />
        <Stat icon="heart" label="养生(30天)" value={`${wellness30.length}天`} />
        <Stat icon="timer" label="专注(30天)" value={`${focus30}分`} />
        <Stat icon="sparkles" label="情绪均值" value={moodAvg} />
        <Stat icon="checkCircle" label="日记(30天)" value={`${diary30}篇`} />
      </div>

      <Card title="成长摘要">
        <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--text-2)]">{summary}</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="学习曲线（14 天 · 分钟）">
          {sum(studyBars.map((b) => b.value)) > 0 ? <Bars data={studyBars} /> : <Empty icon="chart" text="还没有学习数据。" />}
        </Card>
        <Card title="运动曲线（14 天 · 分钟）">
          {sum(exerciseBars.map((b) => b.value)) > 0 ? <Bars data={exerciseBars} color="var(--green)" /> : <Empty icon="chart" text="还没有运动数据。" />}
        </Card>
        <Card title="专注时长（7 天 · 分钟）">
          {sum(focusBars.map((b) => b.value)) > 0 ? <Bars data={focusBars} color="var(--red)" /> : <Empty icon="timer" text="还没有番茄钟记录。" />}
        </Card>
        <Card title="待办完成率（近 8 周）">
          <Bars data={weekCompletion} color="var(--violet)" />
          <p className="mt-2 text-center text-[11px] text-[var(--text-3)]">完成数 ÷ 新建数</p>
        </Card>
      </div>

      <Card title="情绪趋势（30 天）">
        {moodPoints.some((x) => x !== null) ? (
          <div className="card-flat p-3">
            <svg viewBox="0 0 300 90" className="w-full">
              <line x1="0" y1="45" x2="300" y2="45" stroke="var(--line)" strokeDasharray="4 4" />
              <polyline
                points={moodPoints.map((p, i) => `${(i / 29) * 300},${p === null ? 45 : 90 - 8 - (p - 1) * 8}`).join(' ')}
                fill="none" stroke="var(--violet)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
              />
            </svg>
          </div>
        ) : (
          <Empty icon="sparkles" text="记录心情后这里会出现趋势线。" />
        )}
      </Card>

      <Card title="习惯总览（30 天）">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card-flat p-3.5">
            <div className="label">运动打卡</div>
            <div className="tnum mt-1 text-xl font-semibold">{Math.round((exercise30.length / 30) * 100)}%</div>
            <div className="text-xs text-[var(--text-3)]">{exercise30.length} / 30 天</div>
          </div>
          <div className="card-flat p-3.5">
            <div className="label">养生打卡</div>
            <div className="tnum mt-1 text-xl font-semibold">{Math.round((wellness30.length / 30) * 100)}%</div>
            <div className="text-xs text-[var(--text-3)]">{wellness30.length} / 30 天</div>
          </div>
          <div className="card-flat p-3.5">
            <div className="label">记录日记</div>
            <div className="tnum mt-1 text-xl font-semibold">{Math.round((diary30 / 30) * 100)}%</div>
            <div className="text-xs text-[var(--text-3)]">{diary30} / 30 天</div>
          </div>
          <div className="card-flat p-3.5">
            <div className="label">待办完成率</div>
            <div className="tnum mt-1 text-xl font-semibold">{todoTotal30 ? Math.round((todoDone30 / todoTotal30) * 100) : 0}%</div>
            <div className="text-xs text-[var(--text-3)]">{todoDone30} / {todoTotal30} 条</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
