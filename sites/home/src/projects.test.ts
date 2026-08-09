import { describe, expect, it } from 'vitest'
import { pickRandomProject, projects } from './projects'

describe('projects', () => {
  it('收录当前七个玩法，并全部使用同站路径', () => {
    expect(projects).toHaveLength(7)
    expect(projects.map((project) => project.slug)).toEqual([
      'life-grid',
      'mental-state',
      'tacit-test',
      'cyber-fortune',
      'refusal-generator',
      'internet-age',
      'next-question',
    ])

    for (const project of projects) {
      expect(project.href).toBe(`/${project.slug}/`)
      expect(project.href).not.toMatch(/^https?:\/\//)
    }
  })

  it('每个入口都有完整且唯一的导航信息', () => {
    expect(new Set(projects.map((project) => project.slug)).size).toBe(projects.length)

    for (const project of projects) {
      expect(project.title).not.toBe('')
      expect(project.description).not.toBe('')
      expect(project.preview).toMatch(/^\/previews\/.+\.avif$/)
      expect(project.hero).toMatch(/^\/assets\/.+-hero-v\d+\.jpg$/)
      expect(project.accent).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})

describe('pickRandomProject', () => {
  it('按随机值选择对应项目', () => {
    expect(pickRandomProject(projects, () => 0)).toBe(projects[0])
    expect(pickRandomProject(projects, () => 0.999)).toBe(projects.at(-1))
  })

  it('项目为空时返回 undefined', () => {
    expect(pickRandomProject([], () => 0.5)).toBeUndefined()
  })
})
