import { useState } from 'react'
import type { TestConfig } from '@viral/shared'

interface Props {
  config: TestConfig
  onAnswer: (questionIndex: number) => void
  onFinish: (answers: number[]) => void
}

export function QuizScreen({ config, onAnswer, onFinish }: Props) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<readonly number[]>([])
  const questions = config.questions
  const question = questions[index]

  const handlePick = (optionIndex: number) => {
    const next = [...answers, optionIndex]
    onAnswer(index)
    if (next.length === questions.length) {
      onFinish([...next])
    } else {
      setAnswers(next)
      setIndex(index + 1)
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="h-3 border-2 border-[#111111] bg-white" aria-hidden="true">
        <div
          className="h-full bg-[#111111]"
          style={{ width: `${(index / questions.length) * 100}%` }}
        />
      </div>
      <p className="text-xs font-bold">第 {index + 1} / {questions.length} 题</p>
      <div key={index} className="pop-in flex flex-col gap-4">
        <h2 className="nb-card p-5 text-xl font-black leading-snug">{question.text}</h2>
        <ul className="flex flex-col gap-3">
          {question.options.map((option, i) => (
            <li key={option.text}>
              <button
                type="button"
                onClick={() => handlePick(i)}
                className="nb-btn w-full px-4 py-3 text-left text-base leading-snug"
              >
                {option.text}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
