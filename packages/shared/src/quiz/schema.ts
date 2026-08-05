import { z } from 'zod'

const metaSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  subtitle: z.string().min(1),
})

// ---------- linear（02 起的 v1 形状 + 可选 note） ----------

export const quizOptionSchema = z.object({
  text: z.string().min(1),
  score: z.number().int().min(0),
})

export const quizQuestionSchema = z.object({
  text: z.string().min(1),
  note: z.string().optional(),
  options: z.array(quizOptionSchema).min(3).max(4),
})

export const quizTierSchema = z.object({
  minScore: z.number().int().min(0),
  title: z.string().min(1),
  percentRange: z.tuple([z.number().min(0).max(100), z.number().min(0).max(100)]),
  comments: z.array(z.string().min(1)).length(3),
  remedy: z.string().min(1),
})

export const linearTestConfigSchema = z
  .object({
    meta: metaSchema,
    questions: z.array(quizQuestionSchema).length(8),
    scoring: z.object({
      mode: z.literal('linear').default('linear'),
      tiers: z.array(quizTierSchema).length(5),
    }),
  })
  .superRefine((config, ctx) => {
    const tiers = config.scoring.tiers
    if (tiers[0].minScore !== 0) {
      ctx.addIssue({
        code: 'custom',
        message: '第一档 minScore 必须为 0',
        path: ['scoring', 'tiers', 0, 'minScore'],
      })
    }
    for (let i = 1; i < tiers.length; i += 1) {
      if (tiers[i].minScore <= tiers[i - 1].minScore) {
        ctx.addIssue({
          code: 'custom',
          message: '分档 minScore 必须严格递增',
          path: ['scoring', 'tiers', i, 'minScore'],
        })
      }
    }
  })

// ---------- tags（v2 新增：多维成分计分） ----------

export const tagsOptionSchema = z.object({
  text: z.string().min(1),
  tags: z
    .record(z.string().min(1), z.number().positive())
    .refine((tags) => Object.keys(tags).length > 0, { message: '每个选项至少带一个 tag' }),
})

export const tagsQuestionSchema = z.object({
  text: z.string().min(1),
  note: z.string().optional(),
  options: z.array(tagsOptionSchema).min(3).max(4),
})

export const quizDimensionSchema = z.object({
  tag: z.string().min(1),
  title: z.string().min(1),
  anchorAge: z.number().int().min(1).max(120),
  barColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  comments: z.array(z.string().min(1)).length(3),
})

export const tagsTestConfigSchema = z
  .object({
    meta: metaSchema,
    questions: z.array(tagsQuestionSchema).length(8),
    scoring: z.object({
      mode: z.literal('tags'),
      dimensions: z.array(quizDimensionSchema).min(2),
      ageJitterSpan: z.number().int().min(1).default(5),
    }),
  })
  .superRefine((config, ctx) => {
    const dims = config.scoring.dimensions
    const known = new Set(dims.map((d) => d.tag))
    if (known.size !== dims.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'dimensions tag 重复',
        path: ['scoring', 'dimensions'],
      })
    }
    config.questions.forEach((q, qi) => {
      q.options.forEach((o, oi) => {
        for (const tag of Object.keys(o.tags)) {
          if (!known.has(tag)) {
            ctx.addIssue({
              code: 'custom',
              message: `未知 tag「${tag}」（未在 dimensions 注册）`,
              path: ['questions', qi, 'options', oi, 'tags', tag],
            })
          }
        }
      })
    })
  })

// ---------- 导出类型 ----------
// TestConfig 使用宽松类型（所有属性可访问），保证 v1 测试无需改动即可编译。
// LinearTestConfig / TagsTestConfig 是严格类型，v2 站点可在运行时守卫后安全使用。

export type QuizTier = z.infer<typeof quizTierSchema>
export type QuizDimension = z.infer<typeof quizDimensionSchema>

export type LinearTestConfig = z.infer<typeof linearTestConfigSchema>
export type TagsTestConfig = z.infer<typeof tagsTestConfigSchema>

export type TestConfig = {
  meta: { slug: string; title: string; subtitle: string }
  questions: Array<{
    text: string
    note?: string
    options: Array<{
      text: string
      score: number
      tags?: Record<string, number>
    }>
  }>
  scoring: {
    mode: 'linear' | 'tags'
    tiers: QuizTier[]
    dimensions: QuizDimension[]
    ageJitterSpan: number
  }
}

export type QuizQuestion = TestConfig['questions'][number]
export type QuizOption = TestConfig['questions'][number]['options'][number]

export function parseTestConfig(raw: unknown): TestConfig {
  const mode =
    typeof raw === 'object' && raw !== null
      ? ((raw as { scoring?: { mode?: unknown } }).scoring?.mode ?? 'linear')
      : 'linear'
  const schema = mode === 'tags' ? tagsTestConfigSchema : linearTestConfigSchema
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`测试配置不合法：${issues}`)
  }
  return parsed.data as unknown as TestConfig
}
