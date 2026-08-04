import type { Phrase } from './schema'

export interface PhraseLintConfig {
  sceneIds: readonly string[]
  toneIds: readonly string[]
  minPerGroup: number
  maxTextLength: number
  allowedPlaceholders: readonly string[]
}

export interface PhraseLintIssue {
  code: 'unknown-scene' | 'unknown-tone' | 'group-too-small' | 'text-too-long' | 'illegal-placeholder'
  message: string
}

function lintPlaceholders(text: string, allowed: readonly string[]): PhraseLintIssue[] {
  const issues: PhraseLintIssue[] = []
  const matches = [...text.matchAll(/\{([^{}]*)\}/g)]
  for (const match of matches) {
    if (!allowed.includes(match[1])) {
      issues.push({ code: 'illegal-placeholder', message: `非法占位符 {${match[1]}}：${text}` })
    }
  }
  const count = (ch: string) => text.split(ch).length - 1
  if (count('{') !== matches.length || count('}') !== matches.length) {
    issues.push({ code: 'illegal-placeholder', message: `花括号不配对：${text}` })
  }
  return issues
}

function lintEntry(phrase: Phrase, config: PhraseLintConfig): PhraseLintIssue[] {
  const issues: PhraseLintIssue[] = []
  if (!config.sceneIds.includes(phrase.scene)) {
    issues.push({ code: 'unknown-scene', message: `未知场景 ${phrase.scene}：${phrase.text}` })
  }
  if (!config.toneIds.includes(phrase.tone)) {
    issues.push({ code: 'unknown-tone', message: `未知语气 ${phrase.tone}：${phrase.text}` })
  }
  if ([...phrase.text].length > config.maxTextLength) {
    issues.push({ code: 'text-too-long', message: `超过 ${config.maxTextLength} 字：${phrase.text}` })
  }
  return [...issues, ...lintPlaceholders(phrase.text, config.allowedPlaceholders)]
}

function lintMatrix(phrases: readonly Phrase[], config: PhraseLintConfig): PhraseLintIssue[] {
  const issues: PhraseLintIssue[] = []
  for (const scene of config.sceneIds) {
    for (const tone of config.toneIds) {
      const count = phrases.filter((p) => p.scene === scene && p.tone === tone).length
      if (count < config.minPerGroup) {
        issues.push({
          code: 'group-too-small',
          message: `${scene}×${tone} 只有 ${count} 条（需 ≥${config.minPerGroup}）`,
        })
      }
    }
  }
  return issues
}

export function lintPhraseLibrary(
  phrases: readonly Phrase[],
  config: PhraseLintConfig,
): PhraseLintIssue[] {
  return [...phrases.flatMap((p) => lintEntry(p, config)), ...lintMatrix(phrases, config)]
}
