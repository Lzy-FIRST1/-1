import { useRef, useState } from 'react';
import { Btn, Card, Field, Input, Modal, Seg, Tag } from '../components/ui';
import { Icon } from '../components/icons';
import { useWorkspace } from '../store';
import { getSupabaseConfig, setSupabaseConfig } from '../lib/supabase';
import { requestNotifyPermission, notify } from '../lib/notify';
import { exportJSON, exportMarkdown, exportWord, importJSON } from '../lib/export';
import { clearLocal, fullPull } from '../lib/sync';
import { toast } from '../lib/toast';
import { Link } from 'react-router-dom';

export default function Settings() {
  const {
    user, guest, settings, saveSettings, signOut, syncNow, syncStatus, syncError, lastSyncedAt, refreshAuth
  } = useWorkspace();
  const [sbUrl, setSbUrl] = useState(getSupabaseConfig().url);
  const [sbKey, setSbKey] = useState(getSupabaseConfig().key);
  const [confirmDanger, setConfirmDanger] = useState<'clear' | 'repull' | null>(null);
  const [newWellness, setNewWellness] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const config = getSupabaseConfig();

  const saveSbConfig = () => {
    setSupabaseConfig(sbUrl, sbKey);
    toast('已保存，正在刷新登录状态', 'ok');
    setTimeout(() => window.location.reload(), 600);
  };

  const doImport = async (file: File) => {
    try {
      const { count } = await importJSON(file);
      toast(`已导入 ${count} 条记录`, 'ok');
    } catch (e) {
      toast(`导入失败：${e instanceof Error ? e.message : String(e)}`, 'err');
    }
  };

  const doClear = async () => {
    if (confirmDanger === 'clear') {
      await clearLocal();
      toast('本地数据已清空（云端保留）', 'info');
    } else if (confirmDanger === 'repull') {
      await clearLocal();
      if (user) {
        await fullPull(user.id);
        toast('已从云端完整恢复', 'ok');
      }
    }
    setConfirmDanger(null);
  };

  const enableNotify = async () => {
    const ok = await requestNotifyPermission();
    if (ok) { await saveSettings({ notifications: true }); toast('通知已开启', 'ok'); notify('通知已开启', '重要提醒会在这里出现'); }
    else toast('通知权限被拒绝，请在浏览器设置中允许', 'err');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">设置与备份</h2>

      {/* 云同步 */}
      <Card title="云同步（Supabase）">
        {config.configured ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] p-3.5 text-sm">
              <div>
                <div className="font-medium">{user ? user.email : '未登录'}</div>
                <div className="mt-0.5 text-xs text-[var(--text-3)]">
                  状态：{syncStatus === 'syncing' ? '同步中…' : syncStatus === 'error' ? `同步异常：${syncError}` : user ? `已同步${lastSyncedAt ? ` · ${new Date(lastSyncedAt).toLocaleTimeString('zh-CN')}` : ''}` : '未登录'}
                </div>
              </div>
              {user ? (
                <Btn size="sm" variant="ghost" onClick={() => void signOut()}>退出登录</Btn>
              ) : (
                <Link to="/login"><Btn size="sm">去登录</Btn></Link>
              )}
            </div>
            {user && (
              <div className="flex flex-wrap gap-2">
                <Btn size="sm" variant="soft" onClick={() => void syncNow()} disabled={syncStatus === 'syncing'}>
                  <Icon name="sync" size={13} />立即同步
                </Btn>
                <Btn size="sm" variant="ghost" onClick={() => void syncNow(true)}>全量重新拉取</Btn>
                <Btn size="sm" variant="ghost" onClick={() => setConfirmDanger('repull')}>清空本地并从云端恢复</Btn>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] leading-relaxed text-[var(--text-2)]">
              当前是<b>纯本地模式</b>。填入 Supabase 项目 URL 和 anon key 即可开启多端云同步（免费档足够个人使用）。
              创建项目和建表方法见项目 README 中的 <code className="rounded bg-[var(--surface-2)] px-1">supabase/schema.sql</code>。
            </p>
            <Field label="Project URL"><Input value={sbUrl} onChange={(e) => setSbUrl(e.target.value)} placeholder="https://xxxx.supabase.co" /></Field>
            <Field label="anon public key"><Input value={sbKey} onChange={(e) => setSbKey(e.target.value)} placeholder="eyJhbGciOi..." /></Field>
            <Btn onClick={saveSbConfig} disabled={!sbUrl.trim() || !sbKey.trim()}>保存并启用云同步</Btn>
            <div className="flex flex-wrap gap-2">
              <Btn size="sm" variant="ghost" onClick={() => void refreshAuth()}>刷新登录状态</Btn>
              <Link to="/login"><Btn size="sm" variant="ghost">登录 / 注册</Btn></Link>
            </div>
          </div>
        )}
      </Card>

      {/* 外观 */}
      <Card title="外观">
        <div className="flex items-center justify-between">
          <span className="text-sm">深色模式</span>
          <Seg
            options={[
              { value: 'light', label: '浅色' },
              { value: 'dark', label: '深色' },
              { value: 'system', label: '跟随系统' }
            ]}
            value={settings.theme}
            onChange={(v) => void saveSettings({ theme: v })}
          />
        </div>
      </Card>

      {/* 行为 */}
      <Card title="行为偏好">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">开工仪式</div>
              <div className="text-xs text-[var(--text-3)]">严格模式：每天首次打开必须先完成思考</div>
            </div>
            <Seg
              options={[
                { value: 'strict', label: '严格' },
                { value: 'remind', label: '仅提醒' }
              ]}
              value={settings.ritualMode}
              onChange={(v) => void saveSettings({ ritualMode: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">番茄钟默认时长</div>
              <div className="text-xs text-[var(--text-3)]">专注时长，可随时在番茄钟页调整</div>
            </div>
            <Input
              type="number" min={1} max={120}
              value={settings.pomodoroMinutes}
              onChange={(e) => void saveSettings({ pomodoroMinutes: Number(e.target.value) || 25 })}
              className="!w-20 text-center"
            />
          </div>
        </div>
      </Card>

      {/* 通知 */}
      <Card title="提醒通知">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">浏览器通知</div>
            <div className="text-xs text-[var(--text-3)]">倒计时临近、高优先级待办、复盘提醒</div>
          </div>
          <Btn size="sm" variant={settings.notifications ? 'soft' : 'primary'} onClick={() => void enableNotify()}>
            {settings.notifications ? '已开启' : '开启'}
          </Btn>
        </div>
      </Card>

      {/* 养生项目 */}
      <Card title="养生项目" action={<span className="text-xs text-[var(--text-3)]">可自定义</span>}>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {settings.wellnessCatalog.map((item) => (
            <span key={item} className="chip">
              {item}
              <button onClick={() => void saveSettings({ wellnessCatalog: settings.wellnessCatalog.filter((i) => i !== item) })} className="ml-0.5 text-[var(--text-3)] hover:text-[var(--red)]">
                <Icon name="x" size={11} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newWellness} onChange={(e) => setNewWellness(e.target.value)} placeholder="添加养生项目" onKeyDown={(e) => { if (e.key === 'Enter' && newWellness.trim()) { void saveSettings({ wellnessCatalog: [...settings.wellnessCatalog, newWellness.trim()] }); setNewWellness(''); } }} />
          <Btn size="sm" variant="soft" onClick={() => { if (newWellness.trim()) { void saveSettings({ wellnessCatalog: [...settings.wellnessCatalog, newWellness.trim()] }); setNewWellness(''); } }}>添加</Btn>
        </div>
      </Card>

      {/* 考试科目 */}
      <Card title="考试科目">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {settings.examSubjects.map((s) => (
            <span key={s} className="chip">
              {s}
              <button onClick={() => void saveSettings({ examSubjects: settings.examSubjects.filter((i) => i !== s) })} className="ml-0.5 text-[var(--text-3)] hover:text-[var(--red)]">
                <Icon name="x" size={11} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="添加科目" onKeyDown={(e) => { if (e.key === 'Enter' && newSubject.trim()) { void saveSettings({ examSubjects: [...settings.examSubjects, newSubject.trim()] }); setNewSubject(''); } }} />
          <Btn size="sm" variant="soft" onClick={() => { if (newSubject.trim()) { void saveSettings({ examSubjects: [...settings.examSubjects, newSubject.trim()] }); setNewSubject(''); } }}>添加</Btn>
        </div>
      </Card>

      {/* 备份 */}
      <Card title="数据备份">
        <div className="flex flex-wrap gap-2">
          <Btn size="sm" variant="soft" onClick={() => void exportJSON()}><Icon name="download" size={13} />导出 JSON</Btn>
          <Btn size="sm" variant="soft" onClick={() => void exportMarkdown()}><Icon name="download" size={13} />导出 Markdown</Btn>
          <Btn size="sm" variant="soft" onClick={() => void exportWord()}><Icon name="download" size={13} />导出 Word</Btn>
          <Btn size="sm" variant="ghost" onClick={() => fileRef.current?.click()}><Icon name="upload" size={13} />导入恢复</Btn>
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void doImport(f); e.target.value = ''; }} />
        <p className="mt-2 text-xs text-[var(--text-3)]">JSON 备份包含全部数据（含加密的私密想法）。建议定期导出，或直接依赖云同步。</p>
      </Card>

      {/* 危险操作 */}
      <Card title="危险操作">
        <Btn size="sm" variant="ghost" onClick={() => setConfirmDanger('clear')} className="!text-[var(--red)]">
          清空本机数据（云端保留）
        </Btn>
      </Card>

      <Card title="关于">
        <div className="space-y-1 text-[13px] text-[var(--text-2)]">
          <p>Personal Workspace v2.0 · 本地优先 PWA</p>
          <p>私密想法使用 PBKDF2 + AES-256-GCM 加密，密钥只在设备上。</p>
          <p>桌面浏览器可用「安装应用」；iPhone Safari 用「添加到主屏幕」。</p>
        </div>
      </Card>

      <Modal open={Boolean(confirmDanger)} onClose={() => setConfirmDanger(null)} title="确认危险操作">
        <p className="text-sm leading-relaxed">
          {confirmDanger === 'clear'
            ? '将清空本机所有数据（云端不受影响）。下次同步时会重新拉取。确定继续吗？'
            : '将清空本机数据，然后从云端完整拉取覆盖。此操作会丢弃本机未同步的改动。确定继续吗？'}
        </p>
        <div className="mt-4 flex gap-2">
          <Btn variant="danger" className="flex-1" onClick={() => void doClear()}>确认</Btn>
          <Btn variant="ghost" className="flex-1" onClick={() => setConfirmDanger(null)}>取消</Btn>
        </div>
      </Modal>
    </div>
  );
}
