import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { Btn, Field, Textarea } from './ui';
import { useWorkspace } from '../store';
import { nowIso, todayStr } from '../lib/utils';
import { newId, save } from '../lib/repo';
import { toast } from '../lib/toast';
import type { Ritual, Thought } from '../lib/types';

export function RitualForm({ onSaved, compact = false }: { onSaved?: () => void; compact?: boolean }) {
  const { user } = useWorkspace();
  const [form, setForm] = useState({ mostImportant: '', why: '', risk: '', distraction: '', ifOnlyOne: '' });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const canSave = Object.values(form).every((v) => v.trim().length >= 2);

  const submit = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    const ts = nowIso();
    const today = todayStr();
    const owner = user?.id || 'local';
    const ritual: Ritual = {
      id: today,
      createdAt: ts,
      updatedAt: ts,
      date: today,
      ...form
    };
    await save('ritual', ritual, owner);
    const thought: Thought = {
      id: newId(),
      createdAt: ts,
      updatedAt: ts,
      type: 'ritual',
      content: `【今日最重要】${form.mostImportant}\n【为什么重要】${form.why}\n【最大风险】${form.risk}\n【容易分心的事】${form.distraction}\n【如果只做一件事】${form.ifOnlyOne}`
    };
    await save('thought', thought, owner);
    toast('开工仪式完成，先思考再行动', 'ok');
    setSaving(false);
    onSaved?.();
  };

  const fields: { key: keyof typeof form; label: string; placeholder: string }[] = [
    { key: 'mostImportant', label: '今天最重要的一件事', placeholder: '例如：完成高数第三章习题' },
    { key: 'why', label: '为什么这件事重要', placeholder: '它如何影响你的目标或状态？' },
    { key: 'risk', label: '最大的风险是什么', placeholder: '可能出什么岔子？提前想好对策。' },
    { key: 'distraction', label: '今天最容易让我分心的事情', placeholder: '手机？消息？临时任务？' },
    { key: 'ifOnlyOne', label: '如果今天只完成一件事，它是什么', placeholder: '守住这个底线。' }
  ];

  return (
    <div className="space-y-4">
      <div className={`grid gap-4 ${compact ? '' : 'sm:grid-cols-2'}`}>
        {fields.map((f, i) => (
          <div key={f.key} className={f.key === 'mostImportant' || f.key === 'ifOnlyOne' ? '' : ''}>
            <Field label={`${i + 1}. ${f.label}`}>
              <Textarea
                value={form[f.key]}
                onChange={set(f.key)}
                placeholder={f.placeholder}
                rows={f.key === 'why' || f.key === 'risk' ? 3 : 2}
              />
            </Field>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-xs text-[var(--text-3)]">先想清楚，再开始。回答会自动存档到思绪记录。</p>
        <Btn onClick={submit} disabled={!canSave || saving}>
          {saving ? '保存中…' : '完成开工仪式'}
        </Btn>
      </div>
    </div>
  );
}
