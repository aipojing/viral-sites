import type { RelationQuery } from '../lib/resolve-relation'

// ⚠️ 发布 gate 说明（不得伪造）：
// docs/17-kinship-calculator.md §10 要求上线前「至少 200 条人工回归样例全过」，
// 且样例需由审核者根据关系链独立填写 expected 后与引擎盲测比对、由两位审核人签核。
// 当前开发态：样例由实现者独立编写并经引擎交叉核对，reviewedBy 记录的是实现者的
// 两个角色（初撰 / 交叉核对），不是两位独立真人审核人。
// 设置环境变量 KINSHIP_RELEASE_GATE=on 时，gate 测试会强制 200 条与分类下限。

export type ManualCaseCategory = 'paternal' | 'maternal' | 'spousal' | 'cousin' | 'multi' | 'other'

export interface ManualRelationCase {
  id: string
  query: RelationQuery
  expectedStatus: 'resolved' | 'needs-gender' | 'unresolved'
  expectedLabels: readonly string[]
  categories: readonly ManualCaseCategory[]
  reviewedBy: readonly [string, string]
  reviewedAt: string
}

const REVIEWERS = ['dev-author', 'dev-cross-check'] as const
const REVIEWED_AT = '2026-08-09'

function makeCase(
  id: string,
  query: RelationQuery,
  expectedLabels: readonly string[],
  categories: readonly ManualCaseCategory[],
  expectedStatus: ManualRelationCase['expectedStatus'] = 'resolved',
): ManualRelationCase {
  return { id, query, expectedStatus, expectedLabels, categories, reviewedBy: REVIEWERS, reviewedAt: REVIEWED_AT }
}

export const MANUAL_RELATION_CASES: readonly ManualRelationCase[] = [
  // ---------- 父系 ----------
  makeCase('case-001', { path: ['father'], subjectGender: 'unspecified' }, ['爸爸'], ['paternal']),
  makeCase('case-002', { path: ['father', 'father'], subjectGender: 'unspecified' }, ['爷爷'], ['paternal']),
  makeCase('case-003', { path: ['father', 'mother'], subjectGender: 'unspecified' }, ['奶奶'], ['paternal']),
  makeCase('case-004', { path: ['father', 'older-brother'], subjectGender: 'unspecified' }, ['伯父'], ['paternal']),
  makeCase('case-005', { path: ['father', 'younger-brother'], subjectGender: 'unspecified' }, ['叔叔'], ['paternal']),
  makeCase('case-006', { path: ['father', 'older-sister'], subjectGender: 'unspecified' }, ['姑妈'], ['paternal']),
  makeCase('case-007', { path: ['father', 'younger-sister'], subjectGender: 'unspecified' }, ['姑姑'], ['paternal']),
  makeCase('case-008', { path: ['father', 'older-brother', 'wife'], subjectGender: 'unspecified' }, ['伯母'], ['paternal']),
  makeCase('case-009', { path: ['father', 'younger-brother', 'wife'], subjectGender: 'unspecified' }, ['婶婶'], ['paternal']),
  makeCase('case-010', { path: ['father', 'younger-sister', 'husband'], subjectGender: 'unspecified' }, ['姑父'], ['paternal']),
  makeCase('case-011', { path: ['father', 'father', 'father'], subjectGender: 'unspecified' }, ['曾祖父'], ['paternal']),
  makeCase('case-012', { path: ['father', 'father', 'older-brother'], subjectGender: 'unspecified' }, ['伯公'], ['paternal']),
  makeCase('case-013', { path: ['father', 'father', 'younger-sister'], subjectGender: 'unspecified' }, ['姑婆'], ['paternal']),
  makeCase('case-014', { path: ['father', 'mother', 'older-brother'], subjectGender: 'unspecified' }, ['舅公'], ['paternal']),

  // ---------- 母系 ----------
  makeCase('case-015', { path: ['mother'], subjectGender: 'unspecified' }, ['妈妈'], ['maternal']),
  makeCase('case-016', { path: ['mother', 'father'], subjectGender: 'unspecified' }, ['外公'], ['maternal']),
  makeCase('case-017', { path: ['mother', 'mother'], subjectGender: 'unspecified' }, ['外婆'], ['maternal']),
  makeCase('case-018', { path: ['mother', 'older-brother'], subjectGender: 'unspecified' }, ['舅舅'], ['maternal']),
  makeCase('case-019', { path: ['mother', 'younger-brother'], subjectGender: 'unspecified' }, ['舅舅'], ['maternal']),
  makeCase('case-020', { path: ['mother', 'older-sister'], subjectGender: 'unspecified' }, ['姨妈'], ['maternal']),
  makeCase('case-021', { path: ['mother', 'older-brother', 'wife'], subjectGender: 'unspecified' }, ['舅妈'], ['maternal']),
  makeCase('case-022', { path: ['mother', 'younger-sister', 'husband'], subjectGender: 'unspecified' }, ['姨父'], ['maternal']),
  makeCase('case-023', { path: ['mother', 'mother', 'father'], subjectGender: 'unspecified' }, ['外曾祖父'], ['maternal']),
  makeCase('case-024', { path: ['mother', 'father', 'older-brother'], subjectGender: 'unspecified' }, ['舅姥爷'], ['maternal']),
  makeCase('case-025', { path: ['mother', 'mother', 'younger-sister'], subjectGender: 'unspecified' }, ['姨婆'], ['maternal']),

  // ---------- 姻亲 ----------
  makeCase('case-026', { path: ['husband'], subjectGender: 'unspecified' }, ['丈夫'], ['spousal']),
  makeCase('case-027', { path: ['wife'], subjectGender: 'unspecified' }, ['妻子'], ['spousal']),
  makeCase('case-028', { path: ['older-brother', 'wife'], subjectGender: 'unspecified' }, ['嫂子'], ['spousal']),
  makeCase('case-029', { path: ['younger-brother', 'wife'], subjectGender: 'unspecified' }, ['弟媳'], ['spousal']),
  makeCase('case-030', { path: ['older-sister', 'husband'], subjectGender: 'unspecified' }, ['姐夫'], ['spousal']),
  makeCase('case-031', { path: ['younger-sister', 'husband'], subjectGender: 'unspecified' }, ['妹夫'], ['spousal']),
  makeCase('case-032', { path: ['husband', 'father'], subjectGender: 'female' }, ['公公'], ['spousal']),
  makeCase('case-033', { path: ['husband', 'mother'], subjectGender: 'female' }, ['婆婆'], ['spousal']),
  makeCase('case-034', { path: ['wife', 'father'], subjectGender: 'male' }, ['岳父'], ['spousal']),
  makeCase('case-035', { path: ['wife', 'mother'], subjectGender: 'male' }, ['岳母'], ['spousal']),
  makeCase('case-036', { path: ['son', 'wife'], subjectGender: 'unspecified' }, ['儿媳'], ['spousal']),
  makeCase('case-037', { path: ['daughter', 'husband'], subjectGender: 'unspecified' }, ['女婿'], ['spousal']),
  makeCase('case-038', { path: ['wife', 'younger-brother'], subjectGender: 'male' }, ['小舅子'], ['spousal']),
  makeCase('case-039', { path: ['husband', 'younger-sister'], subjectGender: 'female' }, ['小姑子'], ['spousal']),
  makeCase('case-040', { path: ['husband', 'younger-brother', 'wife'], subjectGender: 'female' }, ['妯娌'], ['spousal']),
  makeCase('case-041', { path: ['wife', 'older-sister', 'husband'], subjectGender: 'male' }, ['连襟'], ['spousal']),
  makeCase('case-042', { path: ['son', 'wife', 'father'], subjectGender: 'unspecified' }, ['亲家公'], ['spousal']),

  // ---------- 堂 / 表（含多答案） ----------
  makeCase('case-043', { path: ['father', 'older-brother', 'son'], subjectGender: 'unspecified' }, ['堂哥', '堂弟'], ['paternal', 'cousin', 'multi']),
  makeCase('case-044', { path: ['father', 'younger-brother', 'daughter'], subjectGender: 'unspecified' }, ['堂姐', '堂妹'], ['paternal', 'cousin', 'multi']),
  makeCase('case-045', { path: ['father', 'older-sister', 'son'], subjectGender: 'unspecified' }, ['表哥', '表弟'], ['cousin', 'multi']),
  makeCase('case-046', { path: ['father', 'younger-sister', 'daughter'], subjectGender: 'unspecified' }, ['表姐', '表妹'], ['cousin', 'multi']),
  makeCase('case-047', { path: ['mother', 'older-brother', 'son'], subjectGender: 'unspecified' }, ['表哥', '表弟'], ['maternal', 'cousin', 'multi']),
  makeCase('case-048', { path: ['mother', 'older-brother', 'daughter'], subjectGender: 'unspecified' }, ['表姐', '表妹'], ['maternal', 'cousin', 'multi']),
  makeCase('case-049', { path: ['mother', 'younger-sister', 'son'], subjectGender: 'unspecified' }, ['表哥', '表弟'], ['maternal', 'cousin', 'multi']),
  makeCase('case-050', { path: ['mother', 'older-sister', 'daughter'], subjectGender: 'unspecified' }, ['表姐', '表妹'], ['maternal', 'cousin', 'multi']),

  // ---------- 兄弟姐妹 / 晚辈 / 其他 ----------
  makeCase('case-051', { path: ['older-brother'], subjectGender: 'unspecified' }, ['哥哥'], ['other']),
  makeCase('case-052', { path: ['younger-sister'], subjectGender: 'unspecified' }, ['妹妹'], ['other']),
  makeCase('case-053', { path: ['older-sister', 'son'], subjectGender: 'unspecified' }, ['外甥'], ['other']),
  makeCase('case-054', { path: ['younger-brother', 'daughter'], subjectGender: 'unspecified' }, ['侄女'], ['other']),
  makeCase('case-055', { path: ['son'], subjectGender: 'unspecified' }, ['儿子'], ['other']),
  makeCase('case-056', { path: ['son', 'son'], subjectGender: 'unspecified' }, ['孙子'], ['other']),
  makeCase('case-057', { path: ['daughter', 'daughter'], subjectGender: 'unspecified' }, ['外孙女'], ['other']),

  // ---------- 负样例：未覆盖与追问 ----------
  makeCase(
    'case-058',
    { path: ['father', 'father', 'older-brother', 'son'], subjectGender: 'unspecified' },
    [],
    ['other'],
    'unresolved',
  ),
  makeCase(
    'case-059',
    { path: ['wife', 'older-sister', 'husband'], subjectGender: 'unspecified' },
    [],
    ['spousal'],
    'needs-gender',
  ),
  makeCase(
    'case-060',
    { path: ['wife', 'older-sister', 'husband'], subjectGender: 'female' },
    [],
    ['spousal'],
    'unresolved',
  ),
]
