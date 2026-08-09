export interface PopularRelation {
  entryId: string
  title: string
  hint: string
}

// 春节饭桌高频查询，全部必须指向 MANDARIN_RELATIONS 中存在的 entryId（lint 强制校验）
export const POPULAR_RELATIONS: readonly PopularRelation[] = [
  { entryId: 'kc-maternal-uncle', title: '舅舅', hint: '妈妈的兄弟' },
  { entryId: 'kc-yifu', title: '姨父', hint: '姨妈的丈夫' },
  { entryId: 'kc-maternal-grandmother', title: '外婆', hint: '妈妈的妈妈' },
  { entryId: 'kc-maternal-grandfather', title: '外公', hint: '妈妈的爸爸' },
  { entryId: 'kc-tang-brother', title: '堂哥 / 堂弟', hint: '伯父叔叔的儿子' },
  { entryId: 'kc-biao-brother-jiu', title: '表哥 / 表弟', hint: '姑舅姨的儿子' },
  { entryId: 'kc-saozi', title: '嫂子', hint: '哥哥的妻子' },
  { entryId: 'kc-zhouli', title: '妯娌', hint: '丈夫兄弟的妻子' },
  { entryId: 'kc-lianjin', title: '连襟', hint: '妻子姐妹的丈夫' },
  { entryId: 'kc-yuefu', title: '岳父', hint: '妻子的爸爸' },
  { entryId: 'kc-zhinv', title: '侄女', hint: '兄弟的女儿' },
  { entryId: 'kc-waisheng', title: '外甥', hint: '姐妹的儿子' },
]
