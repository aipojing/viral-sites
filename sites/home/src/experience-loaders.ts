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
  | 'hold-button'
  | 'one-second-world'
  | 'kinship-calculator'
  | 'year-report'

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
  'hold-button': async () => {
    const [module] = await Promise.all([
      import('../../hold-button/src/app'),
      import('../../hold-button/src/index.css'),
    ])
    return module.App
  },
  'one-second-world': async () => {
    const [module] = await Promise.all([
      import('../../one-second-world/src/app'),
      import('../../one-second-world/src/index.css'),
    ])
    return module.App
  },
  'kinship-calculator': async () => {
    const [module] = await Promise.all([
      import('../../kinship-calculator/src/app'),
      import('../../kinship-calculator/src/index.css'),
    ])
    return module.App
  },
  'year-report': async () => {
    const [module] = await Promise.all([
      import('../../year-report/src/app'),
      import('../../year-report/src/index.css'),
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
