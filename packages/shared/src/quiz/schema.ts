import { z } from 'zod'

export const quizOptionSchema = z.object({
  text: z.string().min(1),
  score: z.number().int().min(0),
})

export const quizQuestionSchema = z.object({
  text: z.string().min(1),
  options: z.array(quizOptionSchema).min(3).max(4),
})

export const quizTierSchema = z.object({
  minScore: z.number().int().min(0),
  title: z.string().min(1),
  percentRange: z.tuple([z.number().min(0).max(100), z.number().min(0).max(100)]),
  comments: z.array(z.string().min(1)).length(3),
  remedy: z.string().min(1),
})

export const testConfigSchema = z
  .object({
    meta: z.object({
      slug: z.string().regex(/^[a-z0-9-]+$/),
      title: z.string().min(1),
      subtitle: z.string().min(1),
    }),
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

export type TestConfig = z.infer<typeof testConfigSchema>
export type QuizQuestion = z.infer<typeof quizQuestionSchema>
export type QuizOption = z.infer<typeof quizOptionSchema>
export type QuizTier = z.infer<typeof quizTierSchema>

export function parseTestConfig(raw: unknown): TestConfig {
  const parsed = testConfigSchema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`测试配置不合法：${issues}`)
  }
  return parsed.data
}
