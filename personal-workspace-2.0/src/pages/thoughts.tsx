import { useMemo, useState } from 'react';
import { Btn, Card, Empty, Field, Input, Modal, Tag, Textarea } from '../components/ui';
import { Icon } from '../components/icons';
import { useRecords } from '../lib/hooks';
import { useWorkspace } from '../store';
import { db } from '../lib/db';
import {
  decryptText, encryptText, makeVaultMarker, PRIVATE_PIN, setVaultUnlocked, verifyVault, vaultUnlocked,
  type EncryptedBlob
} from '../lib/crypto';
import { formatCN, nowIso, timeHM, todayStr } from '../lib/utils';
import { newId, remove, save } from '../lib/repo';
import { aiText } from '../lib/ai';
import { toast } from '../lib/toast';
import type { PrivateThought } from '../lib/types';

interface Decrypted {
  thought: PrivateThought;
  content: string;
}

async function getMarker(): Promise<EncryptedBlob | null> {
  const row = await db.records.get(['setting', 'vault-marker']);
  return row ? (row.data as EncryptedBlob) : null;
}

export default function Thoughts() {
  const { user } = useWorkspace();
  const thoughts = useRecords<PrivateThought>('privateThought');
  const [unlocked, setUnlocked] = useState(vaultUnlocked());
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [decrypted, setDecrypted] = useState<Decrypted[] | null>(null);
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', tags: '' });
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const unlock = async () => {
    const marker = await getMarker();
    if (marker) {
      const ok = await verifyVault(pin, marker);
      if (!ok) { setError('密码错误，内容保持加密'); return; }
    } else {
      const m = await makeVaultMarker(pin);
      await db.records.put({ kind: 'setting', id: 'vault-marker', ownerId: user?.id || 'local', data: m, createdAt: nowIso(), updatedAt: nowIso() });
    }
    const list: Decrypted[] = [];
    for (const t of thoughts) {
      try {
        const content = await decryptText(pin, { salt: t.salt, iv: t.iv, data: t.contentEnc });
        list.push({ thought: t, content });
      } catch {
        /* 跳过无法解密的记录 */
      }
    }
    setDecrypted(list);
    setVaultUnlocked(true);
    setUnlocked(true);
    setError('');
    setPin('');
  };

  const lock = () => {
    setVaultUnlocked(false);
    setUnlocked(false);
    setDecrypted(null);
    setAiSummary('');
    setPin('');
  };

  const add = async () => {
    if (!form.content.trim()) return;
    const blob = await encryptText(PRIVATE_PIN, form.content.trim());
    const ts = nowIso();
    const t: PrivateThought = {
      id: newId(), createdAt: ts, updatedAt: ts,
      title: form.title.trim() || undefined,
      contentEnc: blob.data, salt: blob.salt, iv: blob.iv,
      tags: form.tags.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
      favorite: false
    };
    await save('privateThought', t, user?.id || 'local');
    const content = form.content.trim();
    setDecrypted((prev) => prev ? [{ thought: t, content }, ...prev] : prev);
    setForm({ title: '', content: '', tags: '' });
    setShowAdd(false);
    toast('已加密保存', 'ok');
  };

  const toggleFav = async (d: Decrypted) => {
    const t = { ...d.thought, favorite: !d.thought.favorite, updatedAt: nowIso() };
    await save('privateThought', t, user?.id || 'local');
    setDecrypted((prev) => prev?.map((x) => x.thought.id === t.id ? { ...x, thought: t } : x) || null);
  };

  const filtered = useMemo(() => {
    if (!decrypted) return [];
    const q = query.trim().toLowerCase();
    return decrypted
      .filter((d) => {
        if (q && !`${d.thought.title || ''} ${d.content} ${d.thought.tags.join(' ')}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.thought.createdAt.localeCompare(a.thought.createdAt));
  }, [decrypted, query]);

  const aiSummarize = async () => {
    if (!decrypted?.length) return;
    setAiLoading(true);
    const material = decrypted.slice(0, 20).map((d) => `[${d.thought.createdAt.slice(0, 10)}] ${d.content}`).join('\n');
    const text = await aiText(`以下是私密想法记录，请用中文总结 3-5 条反复出现的主题或模式，最后给 1 条行动建议。\n\n${material.slice(0, 4000)}`);
    setAiSummary(text || '无法生成总结（未配置 AI 或网络异常）。');
    setAiLoading(false);
  };

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-md">
        <Card className="mt-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--accent)]">
            <Icon name="lock" size={26} />
          </div>
          <h2 className="text-lg font-bold">私密想法 · 已加密</h2>
          <p className="mt-1 text-sm text-[var(--text-2)]">内容使用 AES-256 加密，输入密码后才能查看。密码错误不会显示任何内容。</p>
          <div className="mt-5 space-y-3">
            <Input type="password" inputMode="numeric" value={pin} onChange={(e) => { setPin(e.target.value); setError(''); }} placeholder="输入密码" onKeyDown={(e) => { if (e.key === 'Enter') void unlock(); }} />
            {error && <p className="text-sm text-[var(--red)]">{error}</p>}
            <Btn className="w-full" onClick={() => void unlock()} disabled={!pin}>解锁</Btn>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="chip chip-on"><Icon name="lock" size={12} />已解锁</span>
          <span className="text-xs text-[var(--text-3)]">{thoughts.length} 条加密记录</span>
        </div>
        <div className="flex gap-2">
          <Btn size="sm" variant="soft" onClick={() => void aiSummarize()} disabled={aiLoading}>
            <Icon name="sparkles" size={13} />{aiLoading ? '总结中…' : 'AI 总结'}
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => setShowAdd(true)}><Icon name="plus" size={13} />记录想法</Btn>
          <Btn size="sm" variant="ghost" onClick={lock}>锁定</Btn>
        </div>
      </div>

      {aiSummary && (
        <Card title="AI 总结" className="border-[rgba(175,82,222,.3)]">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{aiSummary}</p>
        </Card>
      )}

      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="按关键词或日期搜索（如 8月、焦虑、工作）" />

      {filtered.length === 0 ? (
        <Card><Empty icon="lock" text="没有匹配的想法，或还没有记录。" /></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <Card key={d.thought.id}>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text-2)]">{d.thought.title || '未命名想法'}</span>
                <span className="text-[11px] text-[var(--text-3)]">{formatCN(d.thought.createdAt.slice(0, 10))} {timeHM(d.thought.createdAt)}</span>
                <button onClick={() => void toggleFav(d)} className={`ml-auto ${d.thought.favorite ? 'text-[var(--amber)]' : 'text-[var(--text-3)]'}`}>
                  <Icon name="heart" size={15} style={d.thought.favorite ? { fill: 'currentColor' } : undefined} />
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{d.content}</p>
              {d.thought.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">{d.thought.tags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
              )}
              <div className="mt-2 flex justify-end">
                <button onClick={() => void remove('privateThought', d.thought.id)} className="rounded-lg p-1.5 text-[var(--text-3)] hover:bg-[var(--surface-2)]" title="删除">
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="记录一条私密想法">
        <div className="space-y-3.5">
          <Field label="标题（可选）"><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="给想法一个名字" /></Field>
          <Field label="内容" hint="保存前会在本机加密，云端只存密文。">
            <Textarea rows={5} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder="此刻的念头、担忧、灵感……" autoFocus />
          </Field>
          <Field label="标签（逗号分隔）"><Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="焦虑, 工作" /></Field>
          <Btn className="w-full" onClick={() => void add()} disabled={!form.content.trim()}>加密保存</Btn>
        </div>
      </Modal>
    </div>
  );
}
