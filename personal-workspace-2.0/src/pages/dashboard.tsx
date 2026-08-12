import { Link } from 'react-router-dom';
import { Btn, Card, Empty, Progress, Ring, Stat, Tag } from '../components/ui';
import { Icon } from '../components/icons';
import { useRecords } from '../lib/hooks';
import { useWorkspace } from '../store';
import { quoteOfDay } from '../lib/quotes';
import {
  addDays, cnWeekday, daysBetween, formatCN, monthKey, nowIso, streakDays, sum, timeHM, todayStr
} from '../lib/utils';
import { newId, save, remove } from '../lib/repo';
import { toast } from '../lib/toast';
import type {
  ExerciseEntry, ImportantDate, MoodEntry, PomodoroSession, Review, Ritual, StudyEntry,
  StudyPlan, Thought, Todo, WellnessEntry
} from '../lib/types';

export default function Dashboard() {
  const { user, settings } = useWorkspace();
  const today = todayStr();
  const rituals = useRecords<Ritual>('ritual');
  const todos = useRecords<Todo>('todo');
  const thoughts = useRecords<Thought>('thought');
  const reviews = useRecords<Review>('review');
  const exercises = useRecords<ExerciseEntry>('exercise');
  const wellness = useRecords<WellnessEntry>('wellness');
  const moods = useRecords<MoodEntry>('mood');
  const dates = useRecords<ImportantDate>('importantDate');
  const pomodoros = useRecords<PomodoroSession>('pomodoro');
  const studies = useRecords<StudyEntry>('study');
  const plans = useRecords<StudyPlan>('studyPlan');

  const ritualToday = rituals.find((r) => r.date === today);
  const mit = ritualToday?.ifOnlyOne || ritualToday?.mostImportant;
  const moodToday = moods.find((m) => m.date === today);
  const exerciseToday = exercises.find((e) => e.date === today);
  const wellnessToday = wellness.find((w) => w.date === today);
  const reviewDone = reviews.some((r) => r.type === 'daily' && r.date === today);

  const openTodos = todos
    .filter((t) => !t.done && !t.archived)
    .sort((a, b) => a.priority - b.priority || (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
  const todayTodos = openTodos.filter((t) => t.dueDate === today || (t.dueDate && t.dueDate < today)).slice(0, 6);
  const soonTodos = openTodos.filter((t) => !t.dueDate || t.dueDate >= addDays(today, 1)).slice(0, 4);

  const upcomingDates = dates
    .filter((d) => !d.done && d.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);
  const examDate = settings.examDate || dates.find((d) => d.type === 'exam' && d.date >= today)?.date;
  const examDays = examDate ? daysBetween(today, examDate) : null;

  const studyToday = studies.filter((s) => s.date === today);
  const studyMinutesToday = sum(studyToday.map((s) => s.minutes));
  const plansToday = plans.filter((p) => p.date === today);
  const focusToday = sum(pomodoros.filter((p) => p.date === today).map((p) => p.minutes));

  const week = [...Array(7)].map((_, i) => addDays(today, -6 + i));
  const exerciseDaysWeek = week.filter((d) => exercises.some((e) => e.date === d)).length;
  const wellnessDaysWeek = week.filter((d) => wellness.some((w) => w.date === d)).length;
  const streak = streakDays(new Set(exercises.map((e) => e.date)));

  const lastThought = [...thoughts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const doneCount = todos.filter((t) => t.done).length;
  const todoRate = todos.length ? Math.round((doneCount / todos.length) * 100) : 0;
  const monthKeyNow = monthKey(today);
  const monthExercises = exercises.filter((e) => monthKey(e.date) === monthKeyNow);

  const toggleTodo = async (t: Todo) => {
    await save('todo', { ...t, done: !t.done, doneAt: t.done ? null : nowIso() }, user?.id || 'local');
  };
  const saveMood = async (score: number) => {
    const ts = nowIso();
    const entry: MoodEntry = {
      id: today,
      createdAt: ts, updatedAt: ts, date: today,
      score, label: score >= 7 ? '开心' : score >= 5 ? '平静' : '疲惫'
    };
    await save('mood', entry, user?.id || 'local');
    toast('心情已记录', 'ok');
  };

  return (
    <div className="space-y-4">
      {/* 问候 */}
      <div className="fade-up">
        <p className="text-sm text-[var(--text-2)]">{formatCN(today)} · {cnWeekday(today)}</p>
        <h2 className="mt-0.5 text-2xl font-bold tracking-tight">
          {new Date().getHours() < 11 ? '早上好' : new Date().getHours() < 18 ? '下午好' : '晚上好'}
        </h2>
        <p className="mt-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[13.5px] leading-relaxed text-[var(--text-2)]">
          <span className="mr-1.5 text-[var(--amber)]">“</span>{quoteOfDay(today)}<span className="ml-1.5 text-[var(--amber)]">”</span>
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {/* 今日最重要 + 开工状态 */}
          <Card
            title="今日最重要 · MIT"
            action={
              ritualToday ? (
                <Tag tone="green">✓ 已开工</Tag>
              ) : (
                <Link to="/ritual"><Btn size="sm" variant="soft">开始思考</Btn></Link>
              )
            }
          >
            {mit ? (
              <div>
                <p className="text-[15px] font-semibold leading-snug">{mit}</p>
                <p className="mt-1.5 text-xs text-[var(--text-2)]">为什么：{ritualToday?.why}</p>
                {ritualToday?.risk && (
                  <p className="mt-1 text-xs text-[var(--amber)]">风险：{ritualToday.risk}</p>
                )}
              </div>
            ) : (
              <Empty icon="flag" text="还没有记录今天最重要的事。花两分钟完成开工仪式。" />
            )}
          </Card>

          {/* 今日待办 */}
          <Card
            title="今日待办"
            action={<Link to="/todos" className="text-xs font-medium text-[var(--accent)]">全部 →</Link>}
          >
            {todayTodos.length === 0 ? (
              <Empty icon="checkCircle" text="今天没有到期待办，去添加或看看稍后事项。" />
            ) : (
              <div className="space-y-1">
                {todayTodos.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => void toggleTodo(t)}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-[var(--surface-2)]"
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${t.done ? 'border-[var(--green)] bg-[var(--green)] text-white' : 'border-[var(--line)]'}`}>
                      {t.done && <Icon name="check" size={11} />}
                    </span>
                    <span className="flex-1 text-sm">{t.title}</span>
                    {t.priority === 1 && <Tag tone="red">高</Tag>}
                    {t.dueDate === today && <span className="text-[11px] text-[var(--amber)]">今天</span>}
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* 考试 + 学习 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card title="考试倒计时">
              {examDays !== null ? (
                <div>
                  <div className="tnum text-4xl font-bold tracking-tight" style={{ color: examDays <= 30 ? 'var(--amber)' : 'var(--accent)' }}>
                    {examDays}<span className="ml-1 text-base font-medium text-[var(--text-2)]">天</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-2)]">注册土木基础考试 · {formatCN(examDate!)}</p>
                  <Link to="/exam" className="mt-3 inline-block text-xs font-medium text-[var(--accent)]">进入考试专区 →</Link>
                </div>
              ) : (
                <div className="py-2">
                  <p className="text-sm text-[var(--text-2)]">还没设置考试日期</p>
                  <Link to="/dates" className="mt-2 inline-block text-xs font-medium text-[var(--accent)]">去添加 →</Link>
                </div>
              )}
            </Card>
            <Card title="今日学习">
              <div className="flex items-end justify-between">
                <div className="tnum text-4xl font-bold tracking-tight">{studyMinutesToday}<span className="ml-1 text-base font-medium text-[var(--text-2)]">分钟</span></div>
                <Link to="/exam" className="text-xs font-medium text-[var(--accent)]">记录 →</Link>
              </div>
              <div className="mt-2 space-y-1">
                {plansToday.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-xs text-[var(--text-2)]">
                    <span className={`h-1.5 w-1.5 rounded-full ${p.done ? 'bg-[var(--green)]' : 'bg-[var(--amber)]'}`} />
                    <span className={p.done ? 'line-through opacity-60' : ''}>{p.subject}：{p.plan}</span>
                  </div>
                ))}
                {plansToday.length === 0 && <p className="text-xs text-[var(--text-3)]">今天还没有学习计划</p>}
              </div>
            </Card>
          </div>

          {/* 打卡状态 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon="bolt" label="今日运动" value={exerciseToday ? `${exerciseToday.minutes}分` : '—'} sub={streak ? `连续 ${streak} 天` : '尚未打卡'} />
            <Stat icon="heart" label="今日养生" value={wellnessToday?.items.length || 0} sub={wellnessToday ? wellnessToday.items.slice(0, 3).join('、') : '尚未打卡'} />
            <Stat icon="timer" label="今日专注" value={`${focusToday}分`} sub={`${pomodoros.filter((p) => p.date === today).length} 个番茄钟`} />
            <Stat icon="sparkles" label="今日心情" value={moodToday ? `${moodToday.score}/10` : '—'} sub={moodToday ? moodToday.label : '未记录'} />
          </div>

          {/* 最近思绪 */}
          <Card title="最近一条思绪" action={<Link to="/brain" className="text-xs font-medium text-[var(--accent)]">整理思绪 →</Link>}>
            {lastThought ? (
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs text-[var(--text-3)]">
                  <span className="chip">
                    {lastThought.type === 'ritual' ? '开工仪式' : lastThought.type === 'rumination' ? '停止反刍' : '思绪'}
                  </span>
                  <span>{timeHM(lastThought.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-2)] line-clamp-4">{lastThought.content}</p>
              </div>
            ) : (
              <Empty icon="bulb" text="还没有思绪记录。" />
            )}
          </Card>

          {/* 复盘状态 */}
          <Card
            title="今日复盘"
            action={
              reviewDone
                ? <Tag tone="green">✓ 已完成</Tag>
                : <Link to="/reviews"><Btn size="sm" variant="soft">去复盘</Btn></Link>
            }
          >
            <p className="text-sm text-[var(--text-2)]">
              {reviewDone
                ? '今天的复盘已完成，明天会更好。'
                : '晚上花五分钟，记录今天的收获、浪费与明天第一件事。'}
            </p>
          </Card>
        </div>

        {/* 右侧栏 */}
        <div className="space-y-4">
          <Card title="重要日期">
            {upcomingDates.length === 0 ? (
              <p className="py-3 text-center text-xs text-[var(--text-3)]">暂无进行中的日期</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingDates.map((d) => {
                  const days = daysBetween(today, d.date);
                  return (
                    <Link key={d.id} to="/dates" className="flex items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2.5">
                      <div>
                        <div className="text-[13.5px] font-medium">{d.title}</div>
                        <div className="text-[11px] text-[var(--text-3)]">{formatCN(d.date)}</div>
                      </div>
                      <span className={`tnum text-lg font-bold ${days <= 7 ? 'text-[var(--amber)]' : 'text-[var(--accent)]'}`}>{days}天</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="本月运动" action={<Link to="/exercise" className="text-xs font-medium text-[var(--accent)]">详情 →</Link>}>
            <div className="tnum text-2xl font-semibold">{monthExercises.length}<span className="text-sm font-normal text-[var(--text-2)]"> 天</span>
              <span className="ml-2 text-sm font-normal text-[var(--text-2)]">{sum(monthExercises.map((e) => e.minutes))} 分钟</span>
            </div>
            <p className="mt-1 text-xs text-[var(--text-3)]">本周运动 {exerciseDaysWeek} 天 · 养生 {wellnessDaysWeek} 天</p>
          </Card>

          <Card title="待办完成率">
            <div className="flex items-center gap-4">
              <div className="flex-1"><Progress value={todoRate} /></div>
              <span className="tnum text-sm font-semibold">{todoRate}%</span>
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-[var(--text-3)]">
              <span>已完成 {doneCount}</span>
              <span>共 {todos.length}</span>
            </div>
          </Card>

          <Card title="今日心情">
            {moodToday ? (
              <div className="flex items-center gap-3">
                <Ring progress={moodToday.score / 10} size={64} stroke={6}>
                  <span className="tnum text-sm font-bold">{moodToday.score}</span>
                </Ring>
                <div>
                  <p className="text-sm font-medium">{moodToday.label}</p>
                  <p className="text-xs text-[var(--text-3)]">已记录 · {moodToday.note || '无备注'}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {[5, 6, 7, 8, 9, 10, 4, 3].map((s) => (
                  <button
                    key={s}
                    onClick={() => void saveMood(s)}
                    className="h-9 w-9 rounded-full border border-[var(--line)] text-sm hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
