import { z } from 'zod'

export const phraseSchema = z.object({
  scene: z.string().min(1),
  tone: z.string().min(1),
  text: z.string().min(1).max(80),
})

export const phraseLibrarySchema = z.array(phraseSchema)

export type Phrase = z.infer<typeof phraseSchema>
