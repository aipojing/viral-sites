export interface IntroScreenProps {
  elapsedMs: number
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** 首屏：明确「只计算你看着页面的时间」，并给出向下进入叙事的入口 */
export function IntroScreen({ elapsedMs }: IntroScreenProps) {
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000))

  const start = () => {
    document.getElementById('osw-chapter-self')?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  return (
    <header className="osw-screen osw-intro">
      <p className="osw-kicker">一秒钟世界 · 数据来源公开 · 实时换算</p>
      <h1 className="osw-title">从你打开页面的这一秒起</h1>
      <p className="osw-lede">
        世界在持续发生：有人出生、列车出发、地球带着你前进。
        你停留多久，数字就陪你走多久。
      </p>
      <p className="osw-number osw-intro__clock" data-testid="intro-clock">
        你看着这个页面 {seconds} 秒
      </p>
      <p className="osw-note">只计算你看着这个页面的时间——切到后台会暂停，不冒充真实经过的时间。</p>
      <button type="button" className="osw-intro__start" onClick={start}>
        开始看世界发生
      </button>
    </header>
  )
}
