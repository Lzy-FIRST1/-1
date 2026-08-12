// ─── 数据模型 ───────────────────────────────────────────────────────────────
// 所有实体都带有 Base（时间戳），软删除通过 deletedAt 保留墓碑以支持云同步。

export type Kind =
  | 'todo'
  | 'ritual'
  | 'thought'
  | 'review'
  | 'privateThought'
  | 'diary'
  | 'exercise'
  | 'wellness'
  | 'mood'
  | 'importantDate'
  | 'goal'
  | 'pomodoro'
  | 'study'
  | 'studyPlan'
  | 'wrongQuestion'
  | 'mastery'
  | 'rumination'
  | 'decision'
  | 'setting';

export const KINDS: Kind[] = [
  'todo', 'ritual', 'thought', 'review', 'privateThought', 'diary',
  'exercise', 'wellness', 'mood', 'importantDate', 'goal', 'pomodoro',
  'study', 'studyPlan', 'wrongQuestion', 'mastery', 'rumination', 'decision', 'setting'
];

export interface Base {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type Priority = 0 | 1 | 2 | 3; // 0 无 / 1 高 / 2 中 / 3 低

export interface Todo extends Base {
  title: string;
  done: boolean;
  doneAt?: string | null;
  archived?: boolean;
  priority: Priority;
  tags: string[];
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  actualMinutes?: number | null;
  goalId?: string | null;
  note?: string;
  order?: number;
}

export interface Ritual extends Base {
  date: string; // YYYY-MM-DD
  mostImportant: string;
  why: string;
  risk: string;
  distraction: string;
  ifOnlyOne: string;
}

export type ThoughtType = 'ritual' | 'brain' | 'rumination';

export interface Thought extends Base {
  type: ThoughtType;
  content: string;
  summary?: string;
}

export type ReviewType = 'daily' | 'weekly' | 'monthly';

export interface Review extends Base {
  type: ReviewType;
  date: string; // 日：当天日期；周：周一日期；月：当月 'YYYY-MM'
  biggestGain?: string;
  biggestWaste?: string;
  efficiencyReason?: string;
  learned?: string;
  tomorrowFirst?: string;
  problems?: string;
  tomorrowPriority?: string;
  aiSummary?: string;
}

export interface PrivateThought extends Base {
  title?: string;
  contentEnc: string; // AES-GCM 密文 base64
  salt: string;
  iv: string;
  tags: string[];
  favorite?: boolean;
}

export interface DiaryPhoto {
  path: string;       // 云存储路径，本地模式下为 dataURL
  thumb?: string;     // 小图 dataURL，用于离线展示
  name?: string;
}

export interface DiaryEntry extends Base {
  date: string;
  text: string;
  photos: DiaryPhoto[];
  moodScore?: number | null;
  moodLabel?: string | null;
}

export type Intensity = 'low' | 'mid' | 'high';

export interface ExerciseEntry extends Base {
  date: string;
  type: string;
  minutes: number;
  intensity: Intensity;
  calories?: number | null;
}

export interface WellnessEntry extends Base {
  date: string;
  items: string[];
}

export interface MoodEntry extends Base {
  date: string;
  score: number; // 1-10
  label: string;
  note?: string;
}

export type DateKind = 'exam' | 'birthday' | 'anniversary' | 'deadline' | 'other';

export interface ImportantDate extends Base {
  title: string;
  date: string;
  type: DateKind;
  remindDays: number[];
  done?: boolean;
}

export type GoalPeriod = 'year' | 'month' | 'week';

export interface Goal extends Base {
  title: string;
  period: GoalPeriod;
  parentId?: string | null;
  start: string;
  end: string;
  progress: number; // 0-100
  order?: number;
}

export interface PomodoroSession extends Base {
  date: string;
  minutes: number;
  task?: string;
}

export interface StudyEntry extends Base {
  date: string;
  subject: string;
  chapter: string;
  minutes: number;
  progressDelta?: number;
  notes?: string;
}

export interface StudyPlan extends Base {
  date: string;
  subject: string;
  plan: string;
  done: boolean;
}

export interface WrongQuestion extends Base {
  subject: string;
  question: string;
  answer: string;
  reason: string;
  reviewCount: number;
  mastered: boolean;
  nextReviewAt?: string | null;
}

export interface ChapterMastery extends Base {
  subject: string;
  chapter: string;
  mastery: number; // 0-100
}

export interface Rumination extends Base {
  worry: string;
  needNow: boolean;
  minAction: string;
  createdTodoId?: string | null;
}

export interface DecisionLog extends Base {
  decision: string;
  reason: string;
  info: string;
  expected: string;
  review?: string;
  reviewedAt?: string | null;
  reviewDueAt?: string | null;
}

export interface AppSettings extends Base {
  theme: 'light' | 'dark' | 'system';
  ritualMode: 'strict' | 'remind';
  pomodoroMinutes: number;
  pomodoroShortBreak: number;
  pomodoroLongBreak: number;
  wellnessCatalog: string[];
  examSubjects: string[];
  examDate?: string | null;
  notifications: boolean;
  remindReviewHour: number;
}

export const DEFAULT_WELLNESS = ['早睡', '喝水', '拉伸', '冥想', '按摩', '泡脚', '护肤', '阅读'];
export const DEFAULT_SUBJECTS = ['高数', '物理', '理论力学', '材料力学', '水力学', '结构力学', '土力学', '基础工程', '工程地质', '法规', '其他'];

export const MOOD_LABELS = ['开心', '平静', '焦虑', '疲惫', '兴奋', '压力大', '低落', '烦躁', '感恩', '期待'];
export const EXERCISE_TYPES = ['跑步', '快走', '力量训练', '骑行', '游泳', '球类', '瑜伽', '拉伸', '跳操', '爬楼', '其他'];
export const PRIORITY_LABEL: Record<Priority, string> = { 0: '无', 1: '高', 2: '中', 3: '低' };
export const DATE_KIND_LABEL: Record<DateKind, string> = {
  exam: '考试', birthday: '生日', anniversary: '纪念日', deadline: '截止日', other: '其他'
};
export const INTENSITY_LABEL: Record<Intensity, string> = { low: '轻松', mid: '适中', high: '高强度' };

export function defaultSettings(): AppSettings {
  return {
    id: 'app',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    theme: 'system',
    ritualMode: 'strict',
    pomodoroMinutes: 25,
    pomodoroShortBreak: 5,
    pomodoroLongBreak: 15,
    wellnessCatalog: [...DEFAULT_WELLNESS],
    examSubjects: [...DEFAULT_SUBJECTS],
    examDate: null,
    notifications: true,
    remindReviewHour: 21
  };
}
