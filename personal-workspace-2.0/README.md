# Personal Workspace · 个人工作台 v2.0

一个本地优先、支持云同步的个人管理系统：思考、学习、工作、自律、复盘、成长。
React + TypeScript + Tailwind CSS + PWA + Supabase。

## 功能一览

- 首页 Dashboard：今日 MIT、待办、学习、倒计时、打卡、心情、思绪、复盘状态一目了然
- 每日开工仪式：先思考再行动，严格模式每天首次进入必须完成，回答自动存档
- AI 思绪整理：乱写一段话 → 当前问题 / 优先级 / 可执行任务 / 建议安排，一键加入待办
- 注册土木基础考试专区：倒计时、学习计划、学习记录、知识点掌握率、错题本、学习曲线、薄弱分析
- Todo：优先级、标签、截止、预计/实际耗时、目标关联、今日/本周/以后视图、拖拽排序、归档
- 每日/每周/每月复盘 + AI 成长总结
- 私密想法：PBKDF2 + AES-256-GCM 端到端加密，密码 201128，云端只见密文
- 图文日记：时间线 / 日历 / 月份相册，导出 Markdown / Word / PDF，一键生成本月回忆
- 运动中心：GitHub 式热力图、周/月统计、连续打卡、趋势
- 养生中心：自定义项目、打卡、连续天数
- 情绪管理：1-10 打分 + 情绪标签、趋势图、AI 情绪分析
- 重要日期倒计时：自动排序、临近提醒
- 目标系统：年度 → 月度 → 周度拆解，一键生成关联待办
- 数据分析：成长仪表盘、学习/运动/专注/情绪/待办完成率图表
- 搜索中心：全模块全文搜索
- 番茄钟：25/40/50 分钟、专注统计、自我排行榜、完成后引导复盘
- 停止反刍：三问法 + 自动生成行动待办
- 决策日志：记录、三个月后回顾、经验库
- 通知、深色模式、JSON/Markdown/Word 备份与恢复

## 本地运行

```bash
pnpm install
pnpm dev
```

生产构建（含 PWA）：

```bash
pnpm build
pnpm preview
```

## 开启云同步（Supabase）

1. 到 [supabase.com](https://supabase.com) 创建项目（免费档足够个人使用）；
2. 打开 SQL Editor，执行 [`supabase/schema.sql`](supabase/schema.sql)（建表 + 行级权限 + 照片桶）；
3. 确认 Authentication → Providers 里 Email 已启用；
4. 复制 Project Settings → API 里的 Project URL 与 anon public key；
5. 两种方式任选：
   - 写入 `.env`（见 `.env.example`），重新构建；
   - 或在应用「设置与备份」页直接粘贴保存（无需重新构建）。
6. 在登录页注册/登录，iPad、iPhone、电脑登录同一账号即自动同步。

> 不配置 Supabase 时，应用以纯本地模式运行（IndexedDB），数据只在本设备。

## AI 功能

「AI 深度整理 / 成长总结 / 情绪分析 / 目标拆解」等：

- 未配置 Key 时使用内置的本地规则版（离线可用）；
- 配置 `VITE_OPENAI_API_KEY` 后调用 OpenAI（注意：前端环境变量会被打包，仅建议个人自用；更稳妥的做法是放到 Supabase Edge Function 中调用）。

## 数据与安全

- 全部数据先写入本机 IndexedDB，联网后自动同步到 Supabase（文档式 `records` 表）；
- 私密想法在浏览器端用 PBKDF2(210,000 次) 派生密钥、AES-256-GCM 加密后上传，密码只在设备上；
- 删除采用软删除墓碑，多端合并不会复活已删数据；
- 设置页可导出 JSON/Markdown/Word 全量备份并恢复。

## 目录结构

```
src/
  lib/       数据模型、IndexedDB、Supabase 同步、加密、导出、AI
  components/UI 组件、布局、开工仪式门禁
  pages/     各功能模块页面
supabase/    初始化 SQL
scripts/     图标生成脚本
```
