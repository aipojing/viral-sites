import { useState } from 'react'
import type { Question } from '../lib/questions'

interface Props {
  questions: readonly Question[]
  pen: 'blue' | 'red'
  onAnswered: (qIndex: number) => void
  onComplete: (answers: number[]) => void
}

export function QuizScreen({ questions, pen, onAnswered, onComplete }: Props) {
  const [answers, setAnswers] = useState<readonly number[]>([])
  const current = answers.length
  const question = questions[current]
  const penClass = pen === 'blue' ? 'pen-blue' : 'pen-red'

  const handlePick = (choice: number) => {
    const next = [...answers, choice]
    onAnswered(current)
    if (next.length === questions.length) {
      onComplete([...next])
    } else {
      setAnswers(next)
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <p className={`${penClass} text-sm font-bold`}>
        {current + 1} / {questions.length}
      </p>
      <h2 className="min-h-16 text-2xl font-bold leading-snug">{question.text}</h2>
      <div className="flex flex-col gap-3">
        {question.options.map((opt, i) => (
          <button
            key={opt}
            type="button"
            onClick={() => handlePick(i)}
            className={`doodle-border ${penClass} ${i % 2 === 0 ? 'tilt-l' : 'tilt-r'} px-4 py-3 text-left text-base`}
          >
            {opt}
          </button>
        ))}
      </div>
    </section>
  )
}
