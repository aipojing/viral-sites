export type TemplateValues = Readonly<Record<string, string | undefined>>

const TOKEN = /\{([^{}]+)\}/gu
const OPTIONAL = /\[\[([^\[\]]*)\]\]/gu

function assertOptionalBlocksValid(template: string): void {
  let openIndex = template.indexOf('[[')
  while (openIndex !== -1) {
    const closeIndex = template.indexOf(']]', openIndex + 2)
    if (closeIndex === -1) throw new Error('unterminated optional block')
    const inner = template.slice(openIndex + 2, closeIndex)
    if (inner.includes('[[') || inner.includes(']]')) {
      throw new Error('nested optional blocks are not allowed')
    }
    openIndex = template.indexOf('[[', closeIndex + 2)
  }
}

function hasValue(values: TemplateValues, key: string): boolean {
  return (values[key] ?? '').trim() !== ''
}

function expandOptionalBlocks(text: string, values: TemplateValues): string {
  return text.replace(OPTIONAL, (_, inner: string) => {
    const complete = [...inner.matchAll(TOKEN)].every((match) => hasValue(values, match[1]))
    return complete ? inner : ''
  })
}

function replaceTokens(text: string, values: TemplateValues): string {
  return text.replace(TOKEN, (_, key: string) => {
    const value = values[key]?.trim()
    if (!value) throw new Error(`missing template value: ${key}`)
    return value
  })
}

// 只清理可选块删除产生的痕迹：重复标点与标点旁的空格。
function cleanRemovedBlocks(text: string): string {
  return text
    .replace(/\s+(?=[，。])/gu, '')
    .replace(/(?<=[，。])\s+/gu, '')
    .replace(/[，。]{2,}/gu, (run) => run.charAt(0))
    .trim()
}

/**
 * [[...]] 表示可选块：块中任一 {变量} 缺失则整块移除。
 * 必选变量缺失或为空白时抛出带变量名的错误；结果始终为纯文本。
 */
export function renderOptionalTemplate(template: string, values: TemplateValues): string {
  assertOptionalBlocksValid(template)
  const expanded = expandOptionalBlocks(template, values)
  const rendered = replaceTokens(expanded, values)
  return cleanRemovedBlocks(rendered)
}

export function listTemplateVariables(template: string): readonly string[] {
  const seen = new Set<string>()
  for (const match of template.matchAll(TOKEN)) seen.add(match[1])
  return [...seen]
}
