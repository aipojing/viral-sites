export function makeRawTagsConfig() {
  const question = (n: number) => ({
    text: `第 ${n} 题`,
    note: '测试题·年代标注示例',
    options: [
      { text: '选 X', tags: { X: 2 } },
      { text: '选 Y', tags: { Y: 2 } },
      { text: '各半', tags: { X: 1, Y: 1 } },
    ],
  })
  return {
    meta: { slug: 'tags-demo', title: '成分演示', subtitle: '演示副标题' },
    questions: [1, 2, 3, 4, 5, 6, 7, 8].map(question),
    scoring: {
      mode: 'tags',
      dimensions: [
        { tag: 'X', title: 'X 系传人', anchorAge: 40, barColor: '#00AEEF', comments: ['x1', 'x2', 'x3'] },
        { tag: 'Y', title: 'Y 系新贵', anchorAge: 20, barColor: '#FF3E9D', comments: ['y1', 'y2', 'y3'] },
      ],
      ageJitterSpan: 5,
    },
  }
}
