import { useMemo, useState } from 'react'
import { codePoints } from '../lib/verdict'

export const NICKNAME_MAX = 12
export const INTRO_MAX = 40

interface Props {
  onSubmit: (nickname: string, intro: string) => void
}

export function LandingScreen({ onSubmit }: Props) {
  const [nickname, setNickname] = useState('')
  const [intro, setIntro] = useState('')

  const nicknameCount = useMemo(() => codePoints(nickname.trim()), [nickname])
  const introCount = useMemo(() => codePoints(intro.trim()), [intro])
  const canSubmit = nicknameCount > 0 && nicknameCount <= NICKNAME_MAX && introCount <= INTRO_MAX

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit(nickname.trim(), intro.trim())
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="aj-card relative p-6">
        <p className="text-xs font-bold tracking-[0.4em] text-[var(--aj-ink-soft)]">赛博衙门 · 卷宗第〇三号</p>
        <h1 className="mt-3 text-4xl font-black leading-tight">AI 赛博判官</h1>
        <p className="mt-3 text-base leading-relaxed">
          报上名号与一句自白，判官当庭宣判——罪名、判词、刑期，一样不少。
        </p>
        <span className="aj-seal absolute -right-2 -top-3 text-xs" aria-hidden="true">
          升堂
        </span>
      </header>

      <form
        className="aj-card flex flex-col gap-4 p-5"
        onSubmit={(event) => {
          event.preventDefault()
          handleSubmit()
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm font-bold">
          <span>
            你的名号 <span aria-hidden="true">*</span>
            <span className="ml-2 font-normal text-[var(--aj-ink-soft)]">
              {nicknameCount}/{NICKNAME_MAX}
            </span>
          </span>
          <input
            className="aj-input"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="如：拖延十级学者"
            autoComplete="off"
            required
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-bold">
          <span>
            一句话自白（选填）
            <span className="ml-2 font-normal text-[var(--aj-ink-soft)]">
              {introCount}/{INTRO_MAX}
            </span>
          </span>
          <input
            className="aj-input"
            value={intro}
            onChange={(event) => setIntro(event.target.value)}
            placeholder="如：计划表写了八版，完成度为零"
            autoComplete="off"
          />
        </label>

        {nicknameCount > NICKNAME_MAX && <p className="text-sm font-bold text-[var(--aj-seal)]">名号太长了，本官记不下。</p>}
        {introCount > INTRO_MAX && <p className="text-sm font-bold text-[var(--aj-seal)]">自白太长了，挑一句说。</p>}

        <button type="submit" className="aj-btn text-lg" disabled={!canSubmit}>
          升 堂
        </button>
      </form>

      <p className="px-1 text-center text-xs leading-relaxed text-[var(--aj-ink-soft)]">
        判词由 AI 生成，纯属玩梗，不构成对任何人的评价。
        <br />
        提交内容会发送至模型提供方，相同判词缓存 24 小时。每人每日限审 3 次。
      </p>
    </section>
  )
}
