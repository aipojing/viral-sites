export interface Project {
  slug: string
  title: string
  shortTitle: string
  description: string
  href: string
  preview: string
  flavor: string
  accent: string
  hero?: string
}

export const projects: Project[] = [
  {
    slug: 'life-grid',
    title: '人生进度条',
    shortTitle: '人生进度',
    description: '把一生摊成四千个星期。看看走了多少，还剩多少。',
    href: '/life-grid/',
    preview: '/previews/life-grid.avif',
    flavor: '时间可视化',
    accent: '#1557ff',
    hero: '/assets/life-grid-hero-v2.jpg',
  },
  {
    slug: 'mental-state',
    title: '班味浓度检测',
    shortTitle: '班味浓度',
    description: '八道题测测你被工位腌入味了没，顺手领一张诊断书。',
    href: '/mental-state/',
    preview: '/previews/mental-state.avif',
    flavor: '职场玩梗',
    accent: '#ff3f74',
    hero: '/assets/mental-state-hero-v2.jpg',
  },
  {
    slug: 'tacit-test',
    title: '默契度测试',
    shortTitle: '默契测试',
    description: '你先答，再把链接甩给对方。友情和爱情都经得起这一轮。',
    href: '/tacit-test/',
    preview: '/previews/tacit-test.avif',
    flavor: '双人挑战',
    accent: '#794cff',
    hero: '/assets/tacit-test-hero-v2.jpg',
  },
  {
    slug: 'cyber-fortune',
    title: '赛博求签',
    shortTitle: '赛博求签',
    description: '打工人电子黄历，一天一签。宜摸鱼，忌主动接活。',
    href: '/cyber-fortune/',
    preview: '/previews/cyber-fortune.avif',
    flavor: '每日一签',
    accent: '#0875ff',
    hero: '/assets/cyber-fortune-hero-v3.jpg',
  },
  {
    slug: 'refusal-generator',
    title: '拒绝话术生成器',
    shortTitle: '拒绝话术',
    description: '不好意思说不？选个场景和语气，让它替你开口。',
    href: '/refusal-generator/',
    preview: '/previews/refusal-generator.avif',
    flavor: '嘴替工具',
    accent: '#ff4f35',
    hero: '/assets/refusal-generator-hero-v2.jpg',
  },
  {
    slug: 'internet-age',
    title: '网感年龄测试',
    shortTitle: '网感年龄',
    description: '测出你的互联网精神年龄，以及成分到底有多复杂。',
    href: '/internet-age/',
    preview: '/previews/internet-age.avif',
    flavor: '互联网考古',
    accent: '#b4dc00',
    hero: '/assets/internet-age-hero-v2.jpg',
  },
  {
    slug: 'next-question',
    title: '下一问',
    shortTitle: '下一问',
    description: '回答上一棒，再把下一问交给一个人。六个人后，问题回到起点。',
    href: '/next-question/',
    preview: '/previews/next-question.avif',
    flavor: '六人接力',
    accent: '#e63b2e',
    hero: '/assets/next-question-hero-v1.jpg',
  },
]

export function pickRandomProject(
  items: readonly Project[],
  random: () => number = Math.random,
): Project | undefined {
  if (items.length === 0) return undefined
  const index = Math.min(Math.floor(random() * items.length), items.length - 1)
  return items[index]
}
