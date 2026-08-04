import { useState } from 'react'
import { track } from '@viral/shared'
import { copyText } from '../lib/copy-link'

interface Props {
  url: string
}

export function CopyLinkButton({ url }: Props) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  const handleCopy = async () => {
    const ok = await copyText(url)
    setStatus(ok ? 'copied' : 'failed')
    if (ok) track('copy_link')
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="doodle-border tilt-r bg-[#2b59c3] py-3 font-medium text-[#fdfbf4]"
      >
        {status === 'copied' ? '已复制，去粘贴给对方吧' : '复制挑战链接'}
      </button>
      {status === 'failed' && (
        <>
          <input
            readOnly
            value={url}
            aria-label="挑战链接"
            onFocus={(e) => e.target.select()}
            className="sketch-dash bg-transparent px-3 py-2 text-xs text-[#33302b]"
          />
          <p className="text-xs text-[#9b948a]">自动复制被拦下了，长按上面这行手动复制</p>
        </>
      )}
    </div>
  )
}
