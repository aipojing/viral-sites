import { QUIZZES, type QuizId } from '../lib/questions'

interface Props {
  linkInvalid: boolean
  onPick: (quiz: QuizId) => void
}

export function HomeScreen({ linkInvalid, onPick }: Props) {
  return (
    <section className="flex flex-col gap-6">
      {linkInvalid && (
        <p className="sketch-dash pen-red px-4 py-3 text-sm">链接失效了，重新发起一个吧</p>
      )}
      <h1 className="text-4xl font-bold">默契度测试</h1>
      <p className="text-sm text-[#6f6a62]">
        答 10 道关于你们的题，生成链接甩给对方——对方答完，默契度当场揭晓
      </p>
      {(['friend', 'couple'] as const).map((id, i) => (
        <button
          key={id}
          type="button"
          onClick={() => onPick(id)}
          className={`doodle-border ${i === 0 ? 'pen-blue tilt-l' : 'pen-red tilt-r'} flex flex-col gap-1 px-5 py-4 text-left`}
        >
          <span className="text-xl font-bold">{QUIZZES[id].name}</span>
          <span className="text-sm text-[#6f6a62]">{QUIZZES[id].intro}</span>
        </button>
      ))}
    </section>
  )
}
