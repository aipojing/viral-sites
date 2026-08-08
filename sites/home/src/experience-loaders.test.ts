import { describe, expect, it } from 'vitest'
import { experienceLoaders } from './experience-loaders'
import { projects } from './projects'

describe('experience registry', () => {
  it('首页项目、懒加载器和同源路径一一对应', () => {
    expect(Object.keys(experienceLoaders).sort()).toEqual(
      projects.map(({ slug }) => slug).sort(),
    )
    for (const project of projects) expect(project.href).toBe(`/${project.slug}/`)
  })

  it('每个懒加载器都能解析出可渲染的玩法组件', async () => {
    for (const [slug, loader] of Object.entries(experienceLoaders)) {
      const Component = await loader()
      expect(typeof Component, `${slug} loader 必须返回组件`).toBe('function')
    }
  })
})
