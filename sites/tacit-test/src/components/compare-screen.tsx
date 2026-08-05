import type { ChallengePayload } from '../lib/challenge-codec'
import { buildComparison, computeScore, pickHighlightRow, tierFor } from '../lib/scoring'
import { makeCompareCardDraw } from '../card/draw-compare-card'
import { SaveCardButton } from './save-card-button'

interface Props {
  payload: ChallengePayload
  challengerName: string
  challengerAnswers: readonly number[]
  onRestart: () => void
}

export function CompareScreen({ payload, challengerName, challengerAnswers, onRestart }: Props) {
  const score = computeScore(payload.a, challengerAnswers)
  const tier = tierFor(score, payload.q)
  const rows = buildComparison(payload.q, payload.a, challengerAnswers)
  const highlight = pickHighlightRow(rows)

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col items-center gap-2 text-center">
        <p className="text-xl font-bold">
          <span className="pen-blue">{payload.n}</span>
          <span className="px-2 text-[#33302b]">×</span>
          <span className="pen-red">{challengerName}</span>
        </p>
        <p className="text-7xl font-extrabold" style={{ color: tier.accent }}>
          {score}%
        </p>
        <p className="text-2xl font-bold">{tier.title}</p>
        <p className="text-sm text-[#6f6a62]">{tier.remark}</p>
      </header>

      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li
            key={row.index}
            className={`sketch-dash flex flex-col gap-1 px-4 py-3 ${row.matched ? '' : 'opacity-90'}`}
            style={row.matched ? { color: tier.accent } : undefined}
          >
            <p className="text-sm text-[#33302b]">
              {row.index + 1}. {row.question}
            </p>
            {row.matched ? (
              <p className="text-sm font-bold">✓ 想到一起了</p>
            ) : (
              <>
                <p className="pen-blue text-sm">
                  {payload.n}：{row.initiatorOption}
                </p>
                <p className="pen-red text-sm">
                  {challengerName}：{row.challengerOption}
                </p>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3">
        <SaveCardButton
          draw={makeCompareCardDraw({
            quiz: payload.q,
            initiatorName: payload.n,
            challengerName,
            score,
            tier,
            highlight,
          })}
          filename="tacit-result.png"
          label="保存默契对比卡"
          cardId="compare"
        />
        <button type="button" onClick={onRestart} className="py-2 text-sm text-[#6f6a62]">
          我也要发起一个
        </button>
      </div>
    </section>
  )
}
