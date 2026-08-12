import { useMemo, useRef, useState } from 'react';
import { Btn, Card, Empty, Field, Input, Modal, MonthCalendar, Seg, Select, Tag, Textarea } from '../components/ui';
import { Icon } from '../components/icons';
import { useRecords } from '../lib/hooks';
import { useWorkspace } from '../store';
import { compressImage, fileToDataURL, resolvePhotoURL, uploadPhoto, type UploadedPhoto } from '../lib/photos';
import { addDays, formatCN, groupBy, monthKey, monthLabel, nowIso, todayStr } from '../lib/utils';
import { newId, save } from '../lib/repo';
import { exportDiary, exportMonthMemory } from '../lib/export';
import { toast } from '../lib/toast';
import type { DiaryEntry, DiaryPhoto } from '../lib/types';

type View = 'timeline' | 'calendar' | 'photos';

export default function Diary() {
  const { user } = useWorkspace();
  const entries = useRecords<DiaryEntry>('diary');
  const today = todayStr();
  const [view, setView] = useState<View>('timeline');
  const [month, setMonth] = useState(monthKey(today));
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date: today, text: '', moodScore: '' });
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const byDate = useMemo(() => groupBy(entries, (e) => e.date), [entries]);
  const sorted = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date)), [entries]);
  const monthEntries = entries.filter((e) => monthKey(e.date) === month);
  const marks: Record<string, number> = {};
  entries.forEach((e) => { marks[e.date] = (marks[e.date] || 0) + 1; });

  const pickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const next: UploadedPhoto[] = [];
    for (const file of Array.from(files).slice(0, 9)) {
      const dataUrl = await fileToDataURL(file);
      const uploaded = await uploadPhoto(dataUrl);
      next.push(uploaded);
    }
    setPhotos((p) => [...p, ...next]);
    setUploading(false);
  };

  const removePhoto = (i: number) => setPhotos((p) => p.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!form.text.trim() && photos.length === 0) return;
    const ts = nowIso();
    const entry: DiaryEntry = {
      id: newId(), createdAt: ts, updatedAt: ts,
      date: form.date, text: form.text.trim(),
      photos: photos.map((p) => ({ path: p.path, thumb: p.thumb })),
      moodScore: form.moodScore ? Number(form.moodScore) : null
    };
    await save('diary', entry, user?.id || 'local');
    setForm({ date: today, text: '', moodScore: '' });
    setPhotos([]);
    setShowAdd(false);
    toast('日记已保存', 'ok');
  };

  const addDay = (date: string) => { setMonth(monthKey(date)); setForm((f) => ({ ...f, date })); setShowAdd(true); };

  const exportCurrent = async (format: 'markdown' | 'word' | 'pdf') => {
    if (monthEntries.length === 0) { toast('这个月还没有日记', 'err'); return; }
    await exportDiary(monthEntries, format);
  };

  const allPhotos = sorted.flatMap((e) => e.photos.map((p) => ({ ...p, date: e.date })));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Seg
          options={[
            { value: 'timeline', label: '时间线' },
            { value: 'calendar', label: '日历' },
            { value: 'photos', label: '相册' }
          ]}
          value={view}
          onChange={setView}
        />
        <Btn onClick={() => { setForm({ date: today, text: '', moodScore: '' }); setPhotos([]); setShowAdd(true); }}>
          <Icon name="plus" size={15} />写今天
        </Btn>
      </div>

      {view === 'timeline' && (
        <div className="space-y-4">
          {sorted.length === 0 ? (
            <Card><Empty icon="photo" text="还没有日记，记录今天的第一条吧。" /></Card>
          ) : (
            [...new Set(sorted.map((e) => monthKey(e.date)))].map((mk) => (
              <div key={mk}>
                <h3 className="mb-2 px-1 text-sm font-semibold text-[var(--text-2)]">{monthLabel(mk)}</h3>
                <div className="space-y-3">
                  {sorted.filter((e) => monthKey(e.date) === mk).map((e) => (
                    <Card key={e.id}>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{formatCN(e.date)}</span>
                        {e.moodScore && <Tag>{`心情 ${e.moodScore}/10`}</Tag>}
                      </div>
                      {e.text && <p className="whitespace-pre-wrap text-sm leading-relaxed">{e.text}</p>}
                      {e.photos.length > 0 && (
                        <div className="mt-3 grid grid-cols-3 gap-1.5">
                          {e.photos.map((p, i) => (
                            <button key={i} onClick={() => setPreview(resolvePhotoURL(p.thumb || p.path))} className="aspect-square overflow-hidden rounded-xl bg-[var(--surface-2)]">
                              <img src={resolvePhotoURL(p.thumb || p.path)} alt="" loading="lazy" className="h-full w-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {view === 'calendar' && (
        <Card
          title={monthLabel(month)}
          action={
            <div className="flex gap-1">
              <button onClick={() => setMonth(addDays(`${month}-01`, -1).slice(0, 7))} className="rounded-lg p-1.5 hover:bg-[var(--surface-2)]"><Icon name="chevronRight" size={14} className="rotate-180" /></button>
              <button onClick={() => setMonth(monthKey(today))} className="rounded-lg px-2 text-xs text-[var(--accent)]">今天</button>
              <button onClick={() => setMonth(addDays(`${month}-01`, 32).slice(0, 7))} className="rounded-lg p-1.5 hover:bg-[var(--surface-2)]"><Icon name="chevronRight" size={14} /></button>
            </div>
          }
        >
          <MonthCalendar month={month} marks={marks} onPick={addDay} />
          <p className="mt-3 text-center text-xs text-[var(--text-3)]">点击日期直接写日记</p>
        </Card>
      )}

      {view === 'photos' && (
        <Card
          title="月份相册"
          action={
            <Select value={month} onChange={(e) => setMonth(e.target.value)} className="!w-auto !py-1.5 text-sm">
              {[...new Set([monthKey(today), ...entries.map((e) => monthKey(e.date))])].sort().map((mk) => (
                <option key={mk} value={mk}>{monthLabel(mk)}</option>
              ))}
            </Select>
          }
        >
          {monthEntries.flatMap((e) => e.photos).length === 0 ? (
            <Empty icon="camera" text="这个月还没有照片。" />
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {monthEntries.flatMap((e) => e.photos.map((p) => ({ p, date: e.date }))).map((item, i) => (
                <button key={i} onClick={() => setPreview(resolvePhotoURL(item.p.thumb || item.p.path))} className="relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-2)]">
                  <img src={resolvePhotoURL(item.p.thumb || item.p.path)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1 text-[10px] text-white">{item.date.slice(5)}</span>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card title="导出与回忆">
        <div className="flex flex-wrap gap-2">
          <Btn size="sm" variant="ghost" onClick={() => void exportCurrent('markdown')}><Icon name="download" size={13} />Markdown</Btn>
          <Btn size="sm" variant="ghost" onClick={() => void exportCurrent('word')}><Icon name="download" size={13} />Word</Btn>
          <Btn size="sm" variant="ghost" onClick={() => void exportCurrent('pdf')}><Icon name="download" size={13} />PDF（打印）</Btn>
          <Btn size="sm" variant="soft" onClick={() => { if (monthEntries.length) { exportMonthMemory(monthEntries); toast('回忆已生成', 'ok'); } }}><Icon name="sparkles" size={13} />生成本月生活回忆</Btn>
        </div>
        <p className="mt-2 text-xs text-[var(--text-3)]">PDF 会在新窗口打开，选择「另存为 PDF」即可。</p>
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="写日记" wide>
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="日期"><Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></Field>
            <Field label="心情（1-10）"><Input type="number" min={1} max={10} inputMode="numeric" value={form.moodScore} onChange={(e) => setForm((f) => ({ ...f, moodScore: e.target.value }))} placeholder="可选" /></Field>
          </div>
          <Field label="今天的日常">
            <Textarea rows={5} value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} placeholder="今天发生了什么？" />
          </Field>
          <div>
            <div className="label mb-1.5">照片</div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void pickFiles(e.target.files)} />
            <div className="grid grid-cols-4 gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-2)]">
                  <img src={resolvePhotoURL(p.thumb || p.path)} alt="" className="h-full w-full object-cover" />
                  <button onClick={() => removePhoto(i)} className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white"><Icon name="x" size={11} /></button>
                </div>
              ))}
              {photos.length < 9 && (
                <button onClick={() => fileRef.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--line)] text-[var(--text-3)] hover:border-[var(--accent)]">
                  <Icon name="camera" size={18} />
                  <span className="text-[10px]">{uploading ? '上传中' : '添加'}</span>
                </button>
              )}
            </div>
          </div>
          <Btn className="w-full" onClick={() => void submit()} disabled={uploading || (!form.text.trim() && photos.length === 0)}>保存日记</Btn>
        </div>
      </Modal>

      <Modal open={Boolean(preview)} onClose={() => setPreview(null)}>
        {preview && <img src={preview} alt="" className="max-h-[76vh] w-full rounded-2xl object-contain" />}
      </Modal>
    </div>
  );
}
