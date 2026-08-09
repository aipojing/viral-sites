import type { FragmentResult } from './fragment'
import type { SalarySettings } from './settings'
import { daysBetween, localDateKey } from './time-local'

export interface SalaryLocalData {
  version: 1
  settings: SalarySettings
  fragments: readonly FragmentResult[]
  firstVisitDate: string
  activeDates: readonly string[]
  reportedReturnDays: readonly number[]
}

export const STORAGE_KEY = 'viral:salary-timer:data:v1'

// 片段记录最多保留 31 个自然日。
const MAX_RETENTION_DAYS = 31

function isValidData(raw: unknown): raw is SalaryLocalData {
  if (typeof raw !== 'object' || raw === null) return false
  const record = raw as Record<string, unknown>
  return (
    record.version === 1 &&
    typeof record.settings === 'object' &&
    record.settings !== null &&
    Array.isArray(record.fragments) &&
    typeof record.firstVisitDate === 'string' &&
    Array.isArray(record.activeDates) &&
    Array.isArray(record.reportedReturnDays)
  )
}

function readFrom(storage: Storage): SalaryLocalData | null {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isValidData(parsed) ? parsed : null
  } catch {
    return null
  }
}

// 按 persistMode 选择容器；另一个容器中的旧数据视为迁移残留。
export function loadSalaryData(local: Storage, session: Storage): SalaryLocalData | null {
  const localData = readFrom(local)
  const sessionData = readFrom(session)

  if (localData && localData.settings.persistMode === 'local') {
    // 迁移残留：清除旧容器，避免双份工资数据
    try {
      session.removeItem(STORAGE_KEY)
    } catch {
      /* 忽略存储异常 */
    }
    return localData
  }
  if (sessionData && sessionData.settings.persistMode === 'session') {
    try {
      local.removeItem(STORAGE_KEY)
    } catch {
      /* 忽略存储异常 */
    }
    return sessionData
  }
  return localData ?? sessionData
}

// 写入失败（quota / 隐私模式 security error）返回 false，由上层提示用户。
export function saveSalaryData(data: SalaryLocalData, local: Storage, session: Storage): boolean {
  const serialized = JSON.stringify(data)
  const target = data.settings.persistMode === 'session' ? session : local
  const other = data.settings.persistMode === 'session' ? local : session
  try {
    target.setItem(STORAGE_KEY, serialized)
    // 切换保存方式时从旧容器删除，保证一键清除有效
    other.removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

export function clearSalaryData(local: Storage, session: Storage): void {
  try {
    local.removeItem(STORAGE_KEY)
    session.removeItem(STORAGE_KEY)
  } catch {
    /* 忽略存储异常 */
  }
}

// 按 31 个自然日裁剪片段与活跃日，返回新对象。
export function pruneOldRecords(data: SalaryLocalData, now: Date): SalaryLocalData {
  const todayKey = localDateKey(now)
  const fragments = data.fragments.filter(
    (fragment) => daysBetween(localDateKey(new Date(fragment.endedAtMs)), todayKey) < MAX_RETENTION_DAYS,
  )
  const activeDates = data.activeDates.filter((dateKey) => daysBetween(dateKey, todayKey) < MAX_RETENTION_DAYS)
  if (fragments.length === data.fragments.length && activeDates.length === data.activeDates.length) {
    return data
  }
  return { ...data, fragments, activeDates }
}

// 登记今天为活跃日（返回新对象，不改动入参）。
export function touchActiveDate(data: SalaryLocalData, now: Date): SalaryLocalData {
  const todayKey = localDateKey(now)
  if (data.activeDates.includes(todayKey)) return data
  return { ...data, activeDates: [...data.activeDates, todayKey] }
}
