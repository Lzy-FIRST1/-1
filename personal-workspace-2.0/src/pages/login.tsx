import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Btn, Card, Field, Input } from '../components/ui';
import { Icon } from '../components/icons';
import { useWorkspace } from '../store';
import { getSupabaseConfig } from '../lib/supabase';
import { requestNotifyPermission } from '../lib/notify';
import { toast } from '../lib/toast';

export default function Login() {
  const { signIn, signUp, user } = useWorkspace();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const config = getSupabaseConfig();

  const submit = async () => {
    if (!email.trim() || !password) return;
    setBusy(true);
    setError('');
    const err = mode === 'in' ? await signIn(email.trim(), password) : await signUp(email.trim(), password);
    if (err) setError(err);
    else {
      toast(mode === 'in' ? '登录成功，正在同步数据' : '注册成功，请查收邮箱确认（如已配置）', 'ok');
      void requestNotifyPermission();
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-sm">
      <Card className="mt-8 p-6 sm:p-8">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)] text-white">
          <Icon name="cloud" size={20} />
        </div>
        <h2 className="text-xl font-bold">{mode === 'in' ? '登录' : '注册账号'}</h2>
        <p className="mt-1 text-sm text-[var(--text-2)]">登录后，iPad / iPhone / 电脑上的数据会自动同步。</p>

        {!config.configured ? (
          <div className="mt-5 rounded-xl border border-[var(--amber)]/30 bg-[rgba(255,159,10,.08)] p-3.5 text-[13px] leading-relaxed">
            还没有配置 Supabase。请先到「<Link to="/settings" className="text-[var(--accent)] underline">设置与备份</Link>」填入项目 URL 和 anon key。
          </div>
        ) : (
          <div className="mt-5 space-y-3.5">
            <Field label="邮箱">
              <Input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </Field>
            <Field label="密码">
              <Input type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位" onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }} />
            </Field>
            {error && <p className="text-sm text-[var(--red)]">{error}</p>}
            <Btn className="w-full" onClick={() => void submit()} disabled={!email.trim() || password.length < 6 || busy}>
              {busy ? '处理中…' : mode === 'in' ? '登录' : '注册'}
            </Btn>
            <p className="text-center text-sm text-[var(--text-2)]">
              {mode === 'in' ? '还没有账号？' : '已有账号？'}
              <button onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setError(''); }} className="ml-1 font-medium text-[var(--accent)]">
                {mode === 'in' ? '注册' : '登录'}
              </button>
            </p>
            {user && <p className="text-center text-xs text-[var(--text-3)]">当前已登录：{user.email}</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
