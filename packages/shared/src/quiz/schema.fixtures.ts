export function makeRawConfig() {
  const question = (n: number) => ({
    text: `第 ${n} 题`,
    options: [
      { text: '选项 0 分', score: 0 },
      { text: '选项 1 分', score: 1 },
      { text: '选项 2 分', score: 2 },
      { text: '选项 3 分', score: 3 },
    ],
  })
  return {
    meta: { slug: 'demo', title: '演示测试', subtitle: '演示副标题' },
    questions: [1, 2, 3, 4, 5, 6, 7, 8].map(question),
    scoring: {
      tiers: [
        { minScore: 0, title: '一档', percentRange: [0, 19], comments: ['a1', 'a2', 'a3'], remedy: 'r1' },
        { minScore: 5, title: '二档', percentRange: [20, 39], comments: ['b1', 'b2', 'b3'], remedy: 'r2' },
        { minScore: 10, title: '三档', percentRange: [40, 64], comments: ['c1', 'c2', 'c3'], remedy: 'r3' },
        { minScore: 15, title: '四档', percentRange: [65, 84], comments: ['d1', 'd2', 'd3'], remedy: 'r4' },
        { minScore: 20, title: '五档', percentRange: [85, 100], comments: ['e1', 'e2', 'e3'], remedy: 'r5' },
      ],
    },
  }
}
