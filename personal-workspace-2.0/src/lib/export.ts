import { db } from './db';
import type { RecordRow } from './db';
import { download, formatCN, monthKey, monthLabel } from './utils';
import { type DiaryEntry } from './types';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function snapshot(): Promise<RecordRow[]> {
  return (await db.records.toArray()).filter((r) => !r.deletedAt);
}

export async function exportJSON(): Promise<void> {
  const rows = await snapshot();
  const date = new Date().toISOString().slice(0, 10);
  download(`workspace-backup-${date}.json`, JSON.stringify(rows, null, 2), 'application/json');
}

export async function importJSON(file: File): Promise<{ count: number }> {
  const text = await file.text();
  const rows = JSON.parse(text) as RecordRow[];
  if (!Array.isArray(rows)) throw new Error('文件格式不正确');
  let count = 0;
  await db.transaction('rw', db.records, async () => {
    for (const r of rows) {
      if (!r.kind || !r.id || !r.data) continue;
      await db.records.put({
        kind: r.kind,
        id: r.id,
        ownerId: r.ownerId || 'local',
        data: r.data,
        createdAt: r.createdAt || new Date().toISOString(),
        updatedAt: r.updatedAt || new Date().toISOString(),
        deletedAt: r.deletedAt ?? null
      });
      count++;
    }
  });
  return { count };
}

export async function buildMarkdown(rows: RecordRow[]): Promise<string> {
  const lines: string[] = ['# 个人工作台数据导出', '', `导出时间：${new Date().toLocaleString('zh-CN')}`, ''];
  const byKind = new Map<string, RecordRow[]>();
  for (const r of rows) {
    if (!byKind.has(r.kind)) byKind.set(r.kind, []);
    byKind.get(r.kind)!.push(r);
  }
  const title: Record<string, string> = {
    todo: '待办事项', ritual: '开工仪式', thought: '思绪记录', review: '复盘',
    diary: '图文日记', exercise: '运动记录', wellness: '养生记录', mood: '心情记录',
    importantDate: '重要日期', goal: '目标', pomodoro: '番茄钟', study: '学习记录',
    studyPlan: '学习计划', wrongQuestion: '错题本', mastery: '知识点掌握',
    rumination: '停止反刍', decision: '决策日志', privateThought: '私密想法（加密）'
  };
  for (const [kind, items] of byKind) {
    if (kind === 'setting') continue;
    lines.push(`\n## ${title[kind] || kind}\n`);
    for (const row of items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
      const d = row.data as Record<string, unknown>;
      if (kind === 'todo') {
        const t = d as { title: string; done?: boolean; priority?: number; tags?: string[]; dueDate?: string };
        lines.push(`- [${t.done ? 'x' : ' '}] ${t.title}${t.dueDate ? `（截止 ${t.dueDate}）` : ''}${t.tags?.length ? ` #${t.tags.join(' #')}` : ''}`);
      } else if (kind === 'diary') {
        const e = d as unknown as DiaryEntry;
        lines.push(`\n### ${formatCN(e.date)}${e.moodScore ? ` 心情 ${e.moodScore}/10` : ''}\n`);
        if (e.text) lines.push(e.text, '');
        e.photos.forEach((p) => lines.push(`![照片](${p.thumb || p.path})`));
      } else if (kind === 'privateThought') {
        lines.push(`- 加密记录（${row.updatedAt.slice(0, 10)}），请在应用内解密查看`);
      } else {
        const summary = Object.entries(d)
          .filter(([k, v]) => !['id', 'createdAt', 'updatedAt', 'deletedAt'].includes(k) && v !== null && v !== undefined && v !== '')
          .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
          .join('；');
        if (summary) lines.push(`- ${row.updatedAt.slice(0, 16).replace('T', ' ')}｜${summary}`);
      }
    }
  }
  return lines.join('\n');
}

export async function exportMarkdown(): Promise<void> {
  const rows = await snapshot();
  const md = await buildMarkdown(rows);
  download(`workspace-${new Date().toISOString().slice(0, 10)}.md`, md, 'text/markdown');
}

export async function exportWord(): Promise<void> {
  const rows = await snapshot();
  const md = await buildMarkdown(rows);
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>个人工作台导出</title></head>
<body style="font-family:-apple-system,'PingFang SC',sans-serif;max-width:720px;margin:24px auto;line-height:1.7">
<pre style="white-space:pre-wrap;font-family:inherit">${esc(md)}</pre></body></html>`;
  download(`workspace-${new Date().toISOString().slice(0, 10)}.doc`, html, 'application/msword');
}

function diaryHTML(entries: DiaryEntry[]): string {
  const cards = entries
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => {
      const photos = e.photos.map((p) => `<img src="${p.thumb || p.path}" style="max-width:220px;border-radius:10px;margin:4px"/>`).join('');
      return `<div style="border:1px solid #e3e3e8;border-radius:16px;padding:16px;margin:12px 0">
        <div style="font-weight:600;color:#1d1d1f">${formatCN(e.date)}${e.moodScore ? ` · 心情 ${e.moodScore}/10` : ''}</div>
        ${e.text ? `<p style="white-space:pre-wrap;color:#3a3a3c">${esc(e.text)}</p>` : ''}
        <div>${photos}</div></div>`;
    })
    .join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>图文日记导出</title></head>
  <body style="font-family:-apple-system,'PingFang SC',sans-serif;max-width:760px;margin:24px auto;color:#1d1d1f">
  <h1 style="font-size:22px">图文日记 · ${monthLabel(monthKey(entries[0]?.date || new Date().toISOString().slice(0, 10)))}</h1>${cards}</body></html>`;
}

export async function exportDiary(entries: DiaryEntry[], format: 'markdown' | 'word' | 'pdf'): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  if (format === 'markdown') {
    const md = entries
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((e) => `## ${formatCN(e.date)}\n\n${e.text || ''}\n${e.photos.map((p) => `![照片](${p.thumb || p.path})`).join('\n')}`)
      .join('\n\n');
    download(`diary-${date}.md`, md, 'text/markdown');
  } else if (format === 'word') {
    download(`diary-${date}.doc`, diaryHTML(entries), 'application/msword');
  } else {
    openPrint(diaryHTML(entries), '图文日记导出');
  }
}

export function openPrint(html: string, title: string): void {
  const w = window.open('', '_blank', 'width=860,height=1000');
  if (!w) return;
  w.document.write(`<html><head><title>${title}</title><style>@media print{body{margin:0}}img{max-width:100%}</style></head>${html}</html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}

export function exportMonthMemory(entries: DiaryEntry[]): void {
  const sorted = entries.sort((a, b) => a.date.localeCompare(b.date));
  const month = monthLabel(monthKey(sorted[0]?.date || new Date().toISOString().slice(0, 10)));
  const lines = [
    `# ${month}生活回忆`,
    '',
    `本月共记录 ${sorted.length} 天，${sorted.reduce((n, e) => n + e.photos.length, 0)} 张照片。`,
    ''
  ];
  sorted.forEach((e) => {
    lines.push(`## ${formatCN(e.date)}`, '', e.text || '（今日无文字记录）', '');
    e.photos.forEach((p) => lines.push(`![照片](${p.thumb || p.path})`));
    lines.push('');
  });
  download(`${month.replace(/[年月]/g, '-')}-回忆.md`, lines.join('\n'), 'text/markdown');
}
