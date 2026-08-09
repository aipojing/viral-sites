import type { ComponentType } from 'react'

export type ExperienceSlug =
  | 'life-grid'
  | 'mental-state'
  | 'tacit-test'
  | 'cyber-fortune'
  | 'refusal-generator'
  | 'internet-age'
  | 'ai-judge'
  | 'next-question'
  | 'salary-timer'

export type ExperienceLoader = () => Promise<ComponentType>

// 每个 loader 必须保持字面量 dynamic import，Vite 才能静态发现并按玩法拆 chunk。
export const experienceLoaders: Readonly<Record<ExperienceSlug, ExperienceLoader>> = {
  'life-grid': async () => {
    const [module] = await Promise.all([
      import('../../life-grid/src/app'),
      import('../../life-grid/src/index.css'),
    ])
    return module.App
  },
  'mental-state': async () => {
    const [module] = await Promise.all([
      import('../../mental-state/src/app'),
      import('../../mental-state/src/index.css'),
    ])
    return module.App
  },
  'tacit-test': async () => {
    const [module] = await Promise.all([
      import('../../tacit-test/src/app'),
      import('../../tacit-test/src/index.css'),
    ])
    return module.App
  },
  'cyber-fortune': async () => {
    const [module] = await Promise.all([
      import('../../cyber-fortune/src/app'),
      import('../../cyber-fortune/src/index.css'),
    ])
    return module.App
  },
  'refusal-generator': async () => {
    const [module] = await Promise.all([
      import('../../refusal-generator/src/app'),
      import('../../refusal-generator/src/index.css'),
    ])
    return module.App
  },
  'internet-age': async () => {
    const [module] = await Promise.all([
      import('../../internet-age/src/app'),
      import('../../internet-age/src/index.css'),
    ])
    return module.App
  },
  'ai-judge': async () => {
    const [module] = await Promise.all([
      import('../../ai-judge/src/app'),
      import('../../ai-judge/src/index.css'),
    ])
    return module.App
  },
  'next-question': async () => {
    const [module] = await Promise.all([
      import('../../next-question/src/app'),
      import('../../next-question/src/index.css'),
    ])
    return module.App
  },
  'salary-timer': async () => {
    const [module] = await Promise.all([
      import('../../salary-timer/src/app'),
      import('../../salary-timer/src/index.css'),
    ])
    return module.App
  },
}

export function resolveExperienceSlug(pathname: string): ExperienceSlug | undefined {
  const segment = pathname.split('/').filter(Boolean)[0]
  if (segment && Object.hasOwn(experienceLoaders, segment)) {
    return segment as ExperienceSlug
  }
  return undefined
}
