import { useState, type ReactNode } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { Icon } from './icons';
import { useWorkspace } from '../store';
import { useTimer } from '../lib/timer';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: '核心',
    items: [
      { to: '/', label: '首页总览', icon: 'home', end: true },
      { to: '/ritual', label: '开工仪式', icon: 'flag' },
      { to: '/brain', label: '思绪整理', icon: 'bulb' },
      { to: '/todos', label: '待办事项', icon: 'checkCircle' },
      { to: '/exam', label: '考试专区', icon: 'book' },
      { to: '/reviews', label: '每日复盘', icon: 'clipboard' }
    ]
  },
  {
    title: '记录',
    items: [
      { to: '/diary', label: '图文日记', icon: 'photo' },
      { to: '/thoughts', label: '私密想法', icon: 'lock' },
      { to: '/exercise', label: '运动中心', icon: 'bolt' },
      { to: '/wellness', label: '养生中心', icon: 'heart' },
      { to: '/mood', label: '情绪管理', icon: 'sparkles' }
    ]
  },
  {
    title: '成长',
    items: [
      { to: '/goals', label: '目标系统', icon: 'target' },
      { to: '/analytics', label: '数据分析', icon: 'chart' },
      { to: '/dates', label: '重要日期', icon: 'calendar' },
      { to: '/pomodoro', label: '番茄钟', icon: 'timer' },
      { to: '/rumination', label: '停止反刍', icon: 'chat' },
      { to: '/decisions', label: '决策日志', icon: 'scale' }
    ]
  },
  {
    title: '系统',
    items: [
      { to: '/search', label: '搜索中心', icon: 'search' },
      { to: '/settings', label: '设置与备份', icon: 'cog' }
    ]
  }
];

const MOBILE_TABS: NavItem[] = [
  { to: '/', label: '首页', icon: 'home', end: true },
  { to: '/todos', label: '待办', icon: 'checkCircle' },
  { to: '/exam', label: '考试', icon: 'book' },
  { to: '/diary', label: '日记', icon: 'photo' }
];

function PageTitle(path: string): string {
  for (const g of NAV_GROUPS) {
    for (const item of g.items) if (item.to === path) return item.label;
  }
  return '个人工作台';
}

function SyncBadge() {
  const { syncStatus, syncError, lastSyncedAt, online } = useWorkspace();
  if (syncStatus === 'off') return null;
  const color = syncStatus === 'error' ? 'var(--red)' : syncStatus === 'syncing' ? 'var(--amber)' : online ? 'var(--green)' : 'var(--text-3)';
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-3)]" title={syncError || lastSyncedAt || ''}>
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {syncStatus === 'syncing' ? '同步中' : syncStatus === 'error' ? '同步异常' : online ? '已同步' : '离线'}
    </span>
  );
}

function TimerBadge() {
  const { phase, running, remaining, total } = useTimer();
  if (phase === 'idle' || !running) return null;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const pct = remaining / total;
  return (
    <Link
      to="/pomodoro"
      className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium"
      style={{ color: phase === 'focus' ? 'var(--red)' : 'var(--green)' }}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute h-2 w-2 rounded-full opacity-60" style={{ background: 'currentColor', clipPath: `inset(${(1 - pct) * 100}% 0 0 0)` }} />
      </span>
      {mm}:{ss}
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const { settings, saveSettings } = useWorkspace();
  const location = useLocation();
  const title = PageTitle(location.pathname);

  const cycleTheme = () => {
    const next = settings.theme === 'light' ? 'dark' : settings.theme === 'dark' ? 'system' : 'light';
    void saveSettings({ theme: next });
  };

  const nav = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 pb-2 pt-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
          <Icon name="stack" size={17} />
        </div>
        <div>
          <div className="text-[15px] font-semibold leading-tight">个人工作台</div>
          <div className="text-[11px] text-[var(--text-3)]">Personal Workspace</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-6 pt-3">
        {NAV_GROUPS.map((g) => (
          <div key={g.title} className="mb-4">
            <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-3)]">{g.title}</div>
            {g.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setDrawer(false)}
                className={({ isActive }) =>
                  `mb-0.5 flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] transition-colors ${
                    isActive ? 'bg-[rgba(10,132,255,.1)] font-semibold text-[var(--accent)]' : 'text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
                  }`
                }
              >
                <Icon name={item.icon} size={17} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-[var(--line)] px-4 py-3">
        <SyncBadge />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* 桌面侧栏 */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-[var(--line)] bg-[var(--surface)] lg:block">
        {nav}
      </aside>

      {/* 移动端抽屉 */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-[78vw] max-w-xs bg-[var(--surface)] shadow-2xl">
            <button className="absolute right-3 top-4 rounded-full p-1.5 text-[var(--text-2)]" onClick={() => setDrawer(false)}>
              <Icon name="x" />
            </button>
            {nav}
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        {/* 顶栏 */}
        <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--bg)]/85 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
            <button className="rounded-xl p-2 text-[var(--text-2)] hover:bg-[var(--surface-2)] lg:hidden" onClick={() => setDrawer(true)}>
              <Icon name="list" />
            </button>
            <h1 className="flex-1 truncate text-[17px] font-semibold tracking-tight">{title}</h1>
            <TimerBadge />
            <SyncBadge />
            <button
              onClick={cycleTheme}
              className="rounded-xl p-2 text-[var(--text-2)] hover:bg-[var(--surface-2)]"
              title="切换主题"
            >
              <Icon name={settings.theme === 'dark' ? 'sun' : settings.theme === 'light' ? 'moon' : 'sun'} />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 sm:px-6 lg:pb-12">{children}</main>
      </div>

      {/* 移动端底部导航 */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[var(--surface)]/92 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {MOBILE_TABS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10.5px] ${
                  isActive ? 'font-semibold text-[var(--accent)]' : 'text-[var(--text-3)]'
                }`
              }
            >
              <Icon name={item.icon} size={21} />
              {item.label}
            </NavLink>
          ))}
          <button
            onClick={() => setDrawer(true)}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10.5px] text-[var(--text-3)]"
          >
            <Icon name="more" size={21} />
            更多
          </button>
        </div>
      </nav>
    </div>
  );
}
