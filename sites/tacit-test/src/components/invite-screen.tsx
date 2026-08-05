import type { ChallengePayload } from '../lib/challenge-codec'
import { QUIZZES } from '../lib/questions'
import { styleRemark } from '../lib/style-remark'
import { makeInviteCardDraw } from '../card/draw-invite-card'
import { CopyLinkButton } from './copy-link-button'
import { SaveCardButton } from './save-card-button'

interface Props {
  payload: ChallengePayload
  url: string
}

export function InviteScreen({ payload, url }: Props) {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">链接已生成，甩给 TA</h1>
      <p className="text-sm text-[#6f6a62]">
        {QUIZZES[payload.q].name} · 对方答完，你们的默契度当场揭晓
      </p>
      <CopyLinkButton url={url} />
      <div className="sketch-dash pen-blue flex flex-col gap-2 px-4 py-4">
        <p className="text-sm text-[#6f6a62]">你的答题风格</p>
        <p className="text-base text-[#33302b]">{styleRemark(payload.a)}</p>
      </div>
      <SaveCardButton
        draw={makeInviteCardDraw(payload.q, payload.n, url)}
        filename="tacit-invite.png"
        label="保存可扫码挑战卡"
        cardId="invite"
      />
    </section>
  )
}
