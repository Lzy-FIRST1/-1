import { useMemo, useState } from 'react';
import { Btn, Card, Empty, Field, Input, Modal, Progress, Seg, Select, Stat, Tag, Textarea } from '../components/ui';
import { Icon } from '../components/icons';
import { useRecords } from '../lib/hooks';
import { useWorkspace } from '../store';
import { addDays, daysBetween, formatCN, groupBy, lastNDays, monthKey, nowIso, sum, todayStr } from '../lib/utils';
import { newId, remove, save } from '../lib/repo';
import { toast } from '../lib/toast';
import type { ChapterMastery, ImportantDate, StudyEntry, StudyPlan, WrongQuestion } from '../lib/types';

export default function Exam() {
  const { user, settings, saveSettings } = useWorkspace();
  const studies = useRecords<StudyEntry>('study');
  const plans = useRecords<StudyPlan>('studyPlan');
  const mastery = useRecords<ChapterMastery>('mastery');
  const wrongs = useRecords<WrongQuestion>('wrongQuestion');
  const dates = useRecords<ImportantDate>('importantDate');
  const today = todayStr();

  const [planSubject, setPlanSubject] = useState('高数');
  const [planText, setPlanText] = useState('');
  const [showStudy, setShowStudy] = useState(false);
  const [study, setStudy] = useState({ subject: '高数', chapter: '', minutes: '30', delta: '0', notes: '' });
  const [showWrong, setShowWrong] = useState(false);
  const [wrong, setWrong] = useState({ subject: '高数', question: '', answer: '', reason: '' });
  const [weakness, setWeakness] = useState('');
  const [analysing, setAnalysing] = useState(false);
  const [tab, setTab] = useState<'plan' | 'study' | 'mastery' | 'wrong'>('plan');

  const examDate = settings.examDate || dates.find((d) => d.type === 'exam' && d.date >= today)?.date;
  const examDays = examDate ? daysBetween(today, examDate) : null;

  const plansToday = plans.filter((p) => p.date === today);
  const weekDays = lastNDays(7);
  const monthNow = monthKey(today);
  const studyWeek = studies.filter((s) => weekDays.includes(s.date));
  const studyMonth = studies.filter((s) => monthKey(s.date) === monthNow);

  const bySubject = groupBy(studies, (s) => s.subject);
  const masteryBySubject = groupBy(mastery, (m) => m.subject);
  const subjectStats = settings.examSubjects.map((subject) => {
    const list = bySubject[subject] || [];
    const masteryList = masteryBySubject[subject] || [];
    return {
      subject,
      minutes: sum(list.map((s) => s.minutes)),
      days: new Set(list.map((s) => s.date)).size,
      masteryAvg: masteryList.length ? Math.round(sum(masteryList.map((m) => m.mastery)) / masteryList.length) : 0
    };
  });

  const addPlan = async () => {
    if (!planText.trim()) return;
    const ts = nowIso();
    const p: StudyPlan = { id: newId(), createdAt: ts, updatedAt: ts, date: today, subject: planSubject, plan: planText.trim(), done: false };
    await save('studyPlan', p, user?.id || 'local');
    setPlanText('');
    toast('已加入今日学习计划', 'ok');
  };

  const togglePlan = async (p: StudyPlan) => {
    await save('studyPlan', { ...p, done: !p.done }, user?.id || 'local');
  };

  const addStudy = async () => {
    const minutes = Number(study.minutes) || 0;
    if (!study.chapter.trim() || minutes <= 0) return;
    const ts = nowIso();
    const e: StudyEntry = {
      id: newId(), createdAt: ts, updatedAt: ts, date: today,
      subject: study.subject, chapter: study.chapter.trim(), minutes,
      progressDelta: Number(study.delta) || 0, notes: study.notes || undefined
    };
    await save('study', e, user?.id || 'local');
    if (Number(study.delta)) {
      const id = `${study.subject}|${study.chapter.trim()}`;
      const existing = mastery.find((m) => m.id === id);
      const m: ChapterMastery = {
        ...(existing || { id, createdAt: ts, updatedAt: ts, subject: study.subject, chapter: study.chapter.trim(), mastery: 0 }),
        mastery: Math.max(0, Math.min(100, (existing?.mastery || 0) + (Number(study.delta) || 0))),
        updatedAt: ts
      };
      await save('mastery', m, user?.id || 'local');
    }
    setStudy({ subject: '高数', chapter: '', minutes: '30', delta: '0', notes: '' });
    setShowStudy(false);
    toast('学习记录已保存', 'ok');
  };

  const adjustMastery = async (m: ChapterMastery, delta: number) => {
    await save('mastery', { ...m, mastery: Math.max(0, Math.min(100, m.mastery + delta)), updatedAt: nowIso() }, user?.id || 'local');
  };

  const addWrong = async () => {
    if (!wrong.question.trim()) return;
    const ts = nowIso();
    const w: WrongQuestion = {
      id: newId(), createdAt: ts, updatedAt: ts, subject: wrong.subject,
      question: wrong.question.trim(), answer: wrong.answer.trim(), reason: wrong.reason.trim(),
      reviewCount: 0, mastered: false, nextReviewAt: addDays(today, 3)
    };
    await save('wrongQuestion', w, user?.id || 'local');
    setWrong({ subject: '高数', question: '', answer: '', reason: '' });
    setShowWrong(false);
    toast('已加入错题本', 'ok');
  };

  const reviewWrong = async (w: WrongQuestion) => {
    await save('wrongQuestion', {
      ...w,
      reviewCount: w.reviewCount + 1,
      nextReviewAt: w.reviewCount >= 2 ? null : addDays(today, w.reviewCount >= 1 ? 7 : 3),
      updatedAt: nowIso()
    }, user?.id || 'local');
    toast('已复习一次', 'ok');
  };

  const analyze = () => {
    setAnalysing(true);
    const sorted = subjectStats.filter((s) => s.days > 0).sort((a, b) => a.masteryAvg - b.masteryAvg);
    const weak = [...mastery].sort((a, b) => a.mastery - b.mastery).slice(0, 3);
    const leastPracticed = subjectStats.filter((s) => s.days > 0).sort((a, b) => a.days - b.days).slice(0, 2);
    const lines = [
      `最近 7 天学习 ${sum(studyWeek.map((s) => s.minutes))} 分钟，${new Set(studyWeek.map((s) => s.date)).size} 天。`,
      sorted.length ? `掌握率偏低的科目：${sorted.slice(0, 3).map((s) => `${s.subject}(${s.masteryAvg}%)`).join('、')}。` : '',
      weak.length ? `最薄弱的知识点：${weak.map((w) => `${w.subject}·${w.chapter}(${w.mastery}%)`).join('、')}。` : '',
      leastPracticed.length ? `练习最少的科目：${leastPracticed.map((s) => s.subject).join('、')}，建议安排固定时段。` : '',
      `错题本还有 ${wrongs.filter((w) => !w.mastered).length} 题待复习。`
    ].filter(Boolean);
    setWeakness(lines.join('\n'));
    setAnalysing(false);
  };

  const last14 = useMemo(() => lastNDays(14).map((d) => ({
    label: d.slice(5), value: sum(studies.filter((s) => s.date === d).map((s) => s.minutes))
  })), [studies]);

  return (
    <div className="space-y-4">
      {/* 考试倒计时 */}
      <Card title="注册土木基础考试">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="tnum text-5xl font-bold tracking-tight" style={{ color: examDays !== null && examDays <= 30 ? 'var(--amber)' : 'var(--accent)' }}>
              {examDays ?? '—'}<span className="ml-1 text-lg font-medium text-[var(--text-2)]">天</span>
            </div>
            {examDate && <p className="mt-1 text-xs text-[var(--text-2)]">{formatCN(examDate)}</p>}
          </div>
          <div className="w-full max-w-[200px]">
            <Field label="考试日期">
              <Input type="date" value={settings.examDate || ''} onChange={(e) => void saveSettings({ examDate: e.target.value || null })} />
            </Field>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="今日学习" value={`${sum(studies.filter((s) => s.date === today).map((s) => s.minutes))}分`} />
          <Stat label="本周学习" value={`${sum(studyWeek.map((s) => s.minutes))}分`} />
          <Stat label="本月学习" value={`${sum(studyMonth.map((s) => s.minutes))}分`} />
        </div>
      </Card>

      <Seg
        options={[
          { value: 'plan', label: '今日计划' },
          { value: 'study', label: '学习记录' },
          { value: 'mastery', label: '掌握率' },
          { value: 'wrong', label: '错题本' }
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'plan' && (
        <Card title="今日学习计划">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <Select value={planSubject} onChange={(e) => setPlanSubject(e.target.value)} className="sm:w-36">
              {settings.examSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Input value={planText} onChange={(e) => setPlanText(e.target.value)} placeholder="例如：完成第三章习题 20 题" onKeyDown={(e) => { if (e.key === 'Enter') void addPlan(); }} />
            <Btn onClick={() => void addPlan()} disabled={!planText.trim()}>添加</Btn>
          </div>
          {plansToday.length === 0 ? (
            <Empty icon="book" text="今天还没有学习计划，从一小步开始。" />
          ) : (
            <div className="space-y-1.5">
              {plansToday.map((p) => (
                <button key={p.id} onClick={() => void togglePlan(p)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-[var(--surface-2)]">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${p.done ? 'border-[var(--green)] bg-[var(--green)] text-white' : 'border-[var(--line)]'}`}>
                    {p.done && <Icon name="check" size={11} />}
                  </span>
                  <span className={`text-sm ${p.done ? 'line-through opacity-60' : ''}`}>{p.subject} · {p.plan}</span>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'study' && (
        <Card
          title="学习记录"
          action={<Btn size="sm" variant="soft" onClick={() => setShowStudy(true)}><Icon name="plus" size={13} />记录</Btn>}
        >
          <div className="mb-4">
            <div className="label mb-2">最近 14 天学习分钟</div>
            <div className="card-flat p-3">
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(7, last14.length)}, 1fr)`, gap: 4, height: 96 }}>
                {last14.map((d) => (
                  <div key={d.label} className="flex flex-col justify-end items-center gap-1">
                    <div className="w-full rounded-t" style={{ height: `${Math.max(2, (d.value / Math.max(1, ...last14.map((x) => x.value))) * 70)}px`, background: d.value ? 'var(--accent)' : 'var(--surface-2)' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {[...studies].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12).map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm">
                <Tag>{s.subject}</Tag>
                <span className="flex-1 truncate">{s.chapter}</span>
                <span className="tnum text-[var(--text-2)]">{s.minutes} 分钟</span>
                {s.progressDelta ? <Tag tone="green">+{s.progressDelta}%</Tag> : null}
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'mastery' && (
        <Card
          title="知识点掌握率"
          action={<Btn size="sm" variant="soft" onClick={analyze} disabled={analysing}><Icon name="sparkles" size={13} />{analysing ? '分析中…' : 'AI 薄弱分析'}</Btn>}
        >
          {weakness && (
            <div className="mb-4 whitespace-pre-wrap rounded-xl border border-[rgba(10,132,255,.25)] bg-[rgba(10,132,255,.05)] p-3.5 text-[13px] leading-relaxed">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-[var(--accent)]"><Icon name="sparkles" size={14} />薄弱分析</div>
              {weakness}
            </div>
          )}
          <div className="space-y-4">
            {subjectStats.map((s) => (
              <div key={s.subject}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium">{s.subject}</span>
                  <span className="text-xs text-[var(--text-2)]">累计 {s.minutes} 分 · {s.days} 天 · 掌握 {s.masteryAvg}%</span>
                </div>
                <Progress value={s.masteryAvg} />
                <div className="mt-2 space-y-1">
                  {masteryBySubject[s.subject]?.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-xs text-[var(--text-2)]">
                      <span className="w-24 truncate">{m.chapter}</span>
                      <div className="flex-1"><Progress value={m.mastery} className="h-1" /></div>
                      <span className="tnum w-8 text-right">{m.mastery}%</span>
                      <button onClick={() => void adjustMastery(m, 10)} className="rounded-md px-1.5 py-0.5 text-[var(--accent)] hover:bg-[var(--surface-2)]">+10</button>
                      <button onClick={() => void adjustMastery(m, -10)} className="rounded-md px-1.5 py-0.5 text-[var(--text-3)] hover:bg-[var(--surface-2)]">-10</button>
                    </div>
                  ))}
                  {(!masteryBySubject[s.subject] || masteryBySubject[s.subject].length === 0) && (
                    <p className="text-[11px] text-[var(--text-3)]">暂无章节，记录学习时填写章节即可建立。</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'wrong' && (
        <Card
          title={`错题本（待复习 ${wrongs.filter((w) => !w.mastered).length}）`}
          action={<Btn size="sm" variant="soft" onClick={() => setShowWrong(true)}><Icon name="plus" size={13} />记错题</Btn>}
        >
          {wrongs.length === 0 ? (
            <Empty icon="doc" text="还没有错题。错题是提分最快的路径。" />
          ) : (
            <div className="space-y-2.5">
              {[...wrongs].sort((a, b) => Number(a.mastered) - Number(b.mastered)).map((w) => (
                <div key={w.id} className={`rounded-xl border border-[var(--line)] p-3.5 ${w.mastered ? 'opacity-55' : ''}`}>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Tag>{w.subject}</Tag>
                    {w.mastered ? <Tag tone="green">已掌握</Tag> : w.nextReviewAt && w.nextReviewAt <= today ? <Tag tone="red">待复习</Tag> : <Tag>复习 {w.reviewCount} 次</Tag>}
                  </div>
                  <p className="text-sm font-medium">{w.question}</p>
                  <p className="mt-1 text-xs text-[var(--text-2)]"><span className="text-[var(--green)]">答案：</span>{w.answer}</p>
                  {w.reason && <p className="mt-0.5 text-xs text-[var(--text-3)]"><span className="text-[var(--amber)]">错因：</span>{w.reason}</p>}
                  <div className="mt-2 flex gap-2">
                    {!w.mastered && <Btn size="sm" variant="soft" onClick={() => void reviewWrong(w)}>复习</Btn>}
                    {!w.mastered && <Btn size="sm" variant="ghost" onClick={() => void save('wrongQuestion', { ...w, mastered: true, updatedAt: nowIso() }, user?.id || 'local')}>标记掌握</Btn>}
                    <Btn size="sm" variant="ghost" onClick={() => void remove('wrongQuestion', w.id)}>删除</Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Modal open={showStudy} onClose={() => setShowStudy(false)} title="记录学习">
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="科目">
              <Select value={study.subject} onChange={(e) => setStudy((s) => ({ ...s, subject: e.target.value }))}>
                {settings.examSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="时长（分钟）">
              <Input type="number" inputMode="numeric" value={study.minutes} onChange={(e) => setStudy((s) => ({ ...s, minutes: e.target.value }))} />
            </Field>
          </div>
          <Field label="章节 / 内容">
            <Input value={study.chapter} onChange={(e) => setStudy((s) => ({ ...s, chapter: e.target.value }))} placeholder="例如：高数第三章 微分中值定理" />
          </Field>
          <Field label="知识点进度变化（%）" hint="完成了某个知识点就 +10 或 +20">
            <Input type="number" inputMode="numeric" value={study.delta} onChange={(e) => setStudy((s) => ({ ...s, delta: e.target.value }))} />
          </Field>
          <Field label="备注">
            <Input value={study.notes} onChange={(e) => setStudy((s) => ({ ...s, notes: e.target.value }))} placeholder="可选" />
          </Field>
          <Btn className="w-full" onClick={() => void addStudy()} disabled={!study.chapter.trim() || !(Number(study.minutes) > 0)}>保存</Btn>
        </div>
      </Modal>

      <Modal open={showWrong} onClose={() => setShowWrong(false)} title="记录错题">
        <div className="space-y-3.5">
          <Field label="科目">
            <Select value={wrong.subject} onChange={(e) => setWrong((w) => ({ ...w, subject: e.target.value }))}>
              {settings.examSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="题目">
            <Textarea rows={3} value={wrong.question} onChange={(e) => setWrong((w) => ({ ...w, question: e.target.value }))} />
          </Field>
          <Field label="正确答案">
            <Textarea rows={2} value={wrong.answer} onChange={(e) => setWrong((w) => ({ ...w, answer: e.target.value }))} />
          </Field>
          <Field label="错误原因">
            <Textarea rows={2} value={wrong.reason} onChange={(e) => setWrong((w) => ({ ...w, reason: e.target.value }))} />
          </Field>
          <Btn className="w-full" onClick={() => void addWrong()} disabled={!wrong.question.trim()}>保存</Btn>
        </div>
      </Modal>
    </div>
  );
}
