export type CopyMethod = 'clipboard-api' | 'exec-command'

export function copyViaExecCommand(text: string, doc: Document): boolean {
  const textarea = doc.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  doc.body.appendChild(textarea)
  textarea.select()
  let ok = false
  try {
    ok = doc.execCommand('copy')
  } catch {
    ok = false
  } finally {
    doc.body.removeChild(textarea)
  }
  return ok
}

export async function copyText(text: string): Promise<CopyMethod> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return 'clipboard-api'
    } catch {
      // 微信内置浏览器等环境可能拒绝 clipboard API，走 execCommand 降级
    }
  }
  if (copyViaExecCommand(text, document)) return 'exec-command'
  throw new Error('copy failed')
}
