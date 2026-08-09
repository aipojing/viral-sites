import { describe, expect, it } from 'vitest'
import { MAX_MONTHLY_SALARY, validateSettings } from './settings'

function validRaw(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 1,
    monthlySalary: 15_000,
    salaryBasis: 'net',
    workdays: [1, 2, 3, 4, 5],
    paidHoursPerDay: 8,
    shiftStart: '09:00',
    shiftEnd: '18:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
    lunchPaid: false,
    persistMode: 'local',
    effectiveFrom: '2026-08-10',
    ...overrides,
  }
}

describe('validateSettings', () => {
  it('接受一份合法的常规设置', () => {
    const settings = validateSettings(validRaw())
    expect(settings.monthlySalary).toBe(15_000)
    expect(settings.workdays).toEqual([1, 2, 3, 4, 5])
    expect(settings.lunchStart).toBe('12:00')
  })

  it('月薪必须为正数且不超过上限', () => {
    expect(() => validateSettings(validRaw({ monthlySalary: 0 }))).toThrow()
    expect(() => validateSettings(validRaw({ monthlySalary: -1 }))).toThrow()
    expect(() => validateSettings(validRaw({ monthlySalary: MAX_MONTHLY_SALARY + 1 }))).toThrow()
    expect(validateSettings(validRaw({ monthlySalary: MAX_MONTHLY_SALARY })).monthlySalary).toBe(
      MAX_MONTHLY_SALARY,
    )
  })

  it('拒绝 NaN 与 Infinity', () => {
    expect(() => validateSettings(validRaw({ monthlySalary: Number.NaN }))).toThrow()
    expect(() => validateSettings(validRaw({ monthlySalary: Number.POSITIVE_INFINITY }))).toThrow()
    expect(() => validateSettings(validRaw({ paidHoursPerDay: Number.NaN }))).toThrow()
  })

  it('工作日必须 1～7 个且不重复', () => {
    expect(() => validateSettings(validRaw({ workdays: [] }))).toThrow()
    expect(() => validateSettings(validRaw({ workdays: [1, 1, 2] }))).toThrow()
    expect(() => validateSettings(validRaw({ workdays: [1, 2, 3, 4, 5, 6, 0, 1] }))).toThrow()
    expect(() => validateSettings(validRaw({ workdays: [7] }))).toThrow()
    expect(validateSettings(validRaw({ workdays: [0, 6] })).workdays).toEqual([0, 6])
  })

  it('每日带薪小时必须在 0.5～24 之间', () => {
    expect(() => validateSettings(validRaw({ paidHoursPerDay: 0.4 }))).toThrow()
    expect(() => validateSettings(validRaw({ paidHoursPerDay: 25 }))).toThrow()
  })

  it('时间必须是 HH:mm 格式', () => {
    expect(() => validateSettings(validRaw({ shiftStart: '9:00' }))).toThrow()
    expect(() => validateSettings(validRaw({ shiftEnd: '18:60' }))).toThrow()
    expect(() => validateSettings(validRaw({ shiftEnd: '24:00' }))).toThrow()
  })

  it('允许跨午夜班次', () => {
    const settings = validateSettings(
      validRaw({
        shiftStart: '22:00',
        shiftEnd: '06:00',
        lunchStart: undefined,
        lunchEnd: undefined,
        paidHoursPerDay: 8,
      }),
    )
    expect(settings.shiftEnd).toBe('06:00')
  })

  it('午休字段必须成对出现', () => {
    expect(() => validateSettings(validRaw({ lunchStart: '12:00', lunchEnd: undefined }))).toThrow()
    expect(() => validateSettings(validRaw({ lunchStart: undefined, lunchEnd: '13:00' }))).toThrow()
  })

  it('午休必须完整落在班次区间内', () => {
    expect(() => validateSettings(validRaw({ lunchStart: '08:00', lunchEnd: '09:30' }))).toThrow()
    expect(() => validateSettings(validRaw({ lunchStart: '17:30', lunchEnd: '18:30' }))).toThrow()
    // 跨午夜班次不允许午休
    expect(() =>
      validateSettings(
        validRaw({ shiftStart: '22:00', shiftEnd: '06:00', lunchStart: '00:00', lunchEnd: '01:00' }),
      ),
    ).toThrow()
  })

  it('带薪小时与班次推导值相差超过 15 分钟时拒绝', () => {
    // 班次 9 小时 - 午休 1 小时 = 8 小时，填 7 小时即差 60 分钟
    expect(() => validateSettings(validRaw({ paidHoursPerDay: 7 }))).toThrow()
    // 差 10 分钟在容差内
    expect(validateSettings(validRaw({ paidHoursPerDay: 7.9 })).paidHoursPerDay).toBe(7.9)
  })

  it('午休带薪时不做区间扣减', () => {
    // 班次 9 小时，午休带薪，带薪小时应接近 9
    expect(() => validateSettings(validRaw({ lunchPaid: true }))).toThrow()
    expect(
      validateSettings(validRaw({ lunchPaid: true, paidHoursPerDay: 9 })).lunchPaid,
    ).toBe(true)
  })

  it('税前/到手只影响标签，不影响数值校验', () => {
    const gross = validateSettings(validRaw({ salaryBasis: 'gross' }))
    const net = validateSettings(validRaw({ salaryBasis: 'net' }))
    expect(gross.salaryBasis).toBe('gross')
    expect(net.salaryBasis).toBe('net')
    expect(() => validateSettings(validRaw({ salaryBasis: 'other' }))).toThrow()
  })

  it('必须选择保存方式与生效日期', () => {
    expect(() => validateSettings(validRaw({ persistMode: 'cloud' }))).toThrow()
    expect(() => validateSettings(validRaw({ effectiveFrom: '2026/08/10' }))).toThrow()
  })
})
