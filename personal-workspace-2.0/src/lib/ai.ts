import { OPENAI_KEY } from './supabase';

export interface AiTask {
  title: string;
  priority: 0 | 1 | 2 | 3;
  tag: string;
  dueHint?: string;
}

export interface OrganizeResult {
  problem: string;
  priorities: { title: string; reason: string }[];
  tasks: AiTask[];
  schedule: string[];
  source: 'ai' | 'local';
}

const TAG_KEYWORDS: [string, string][] = [
  ['考试', '学习'], ['复习', '学习'], ['学习', '学习'], ['看书', '学习'], ['听课', '学习'],
  ['图纸', '工作'], ['画图', '工作'], ['设计', '工作'], ['方案', '工作'], ['汇报', '工作'], ['开会', '工作'], ['报告', '工作'],
  ['健身', '运动'], ['跑步', '运动'], ['运动', '运动'], ['锻炼', '运动'], ['练', '运动'],
  ['洗', '生活'], ['家务', '生活'], ['买', '生活'], ['做饭', '生活'], ['快递', '生活'], ['缴费', '生活'],
  ['约', '社交'], ['电话', '社交'], ['回复', '社交'], ['联系', '社交']
];

function tagFor(text: string): string {
  for (const [kw, tag] of TAG_KEYWORDS) if (text.includes(kw)) return tag;
  return '待分类';
}

function priorityFor(text: string): 0 | 1 | 2 | 3 {
  if (/考试|紧急|必须|今天|马上|截止/.test(text)) return 1;
  if (/明天|尽快|本周|安排/.test(text)) return 2;
  return 3;
}

export function organizeLocally(raw: string): OrganizeResult {
  const items = raw
    .split(/[\n。；;！!？?，,]+/)
    .map((s) => s.trim().replace(/^\d+[\.、)\s]*/, ''))
    .filter((s) => s.length >= 2);
  const seen = new Set<string>();
  const tasks: AiTask[] = [];
  for (const item of items) {
    const title = item.length > 42 ? `${item.slice(0, 42)}…` : item;
    if (seen.has(title)) continue;
    seen.add(title);
    tasks.push({ title, priority: priorityFor(item), tag: tagFor(item) });
  }
  const priorities = [...tasks]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5)
    .map((t, i) => ({
      title: t.title,
      reason: i === 0 ? '最重要或最紧急' : i === 1 ? '紧随其后' : '建议当天完成'
    }));
  const byTag: Record<string, number> = {};
  tasks.forEach((t) => { byTag[t.tag] = (byTag[t.tag] || 0) + 1; });
  const schedule = Object.entries(byTag)
    .sort((a, b) => b[1] - a[1])
    .map(([tag], i) => `${i === 0 ? '优先' : i === 1 ? '其次' : '最后'}处理「${tag}」类事项`);
  const problem = tasks.length
    ? `当前有 ${tasks.length} 件待处理事项，集中在「${Object.entries(byTag).sort((a, b) => b[1] - a[1])[0]?.[0] || '其他'}」。`
    : '没有识别出明确任务，请补充更多信息。';
  return { problem, priorities, tasks: tasks.slice(0, 8), schedule, source: 'local' };
}

async function chat(prompt: string, system: string): Promise<string | null> {
  if (!OPENAI_KEY) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ]
      })
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export async function organizeWithAI(raw: string): Promise<OrganizeResult | null> {
  const system = [
    '你是一个克制、务实的个人效率助手。把用户杂乱的想法整理成结构化 JSON，只输出 JSON。',
    '字段：problem(一句话概括当前问题), priorities(数组,{title,reason}),',
    'tasks(数组,{title,priority:1高/2中/3低,tag:学习|工作|运动|生活|社交|待分类,dueHint?}),',
    'schedule(数组,3-5条建议安排)。'
  ].join('');
  const content = await chat(raw, system);
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as OrganizeResult;
    if (!Array.isArray(parsed.tasks)) return null;
    return { ...parsed, source: 'ai' };
  } catch {
    return null;
  }
}

export async function aiText(prompt: string): Promise<string | null> {
  const system = '你是个人成长教练，回答简洁、具体、克制，使用中文。';
  return chat(prompt, system);
}
