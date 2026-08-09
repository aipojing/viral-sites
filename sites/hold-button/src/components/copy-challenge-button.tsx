import { useState } from 'react'
import { track } from '@viral/shared'

interface Props {
  url: string
}

/** 复制挑战链接：埋点只记录渠道，不携带链接内容或 token */
export function CopyChallengeButton({ url }: Props) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setFailed(false)
      track('challenge_shared', { channel: 'copy' })
    } catch {
      setFailed(true)
    }
  }

  return (
    <>
      <button type="button" className="hb-button hb-button--ghost" onClick={handleCopy}>
        复制挑战链接
      </button>
      {copied && !failed && <p className="hb-hint">已复制，发给朋友吧</p>}
      {failed && <p className="hb-hint">复制失败，请手动长按复制链接</p>}
    </>
  )
}
