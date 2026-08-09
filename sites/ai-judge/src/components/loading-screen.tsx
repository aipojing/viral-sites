export function LoadingScreen() {
  return (
    <section
      className="flex flex-col items-center justify-center gap-6 py-24 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="aj-gavel text-6xl" aria-hidden="true">
        ⚖️
      </div>
      <p className="aj-court-text text-2xl font-black">升 堂 ——</p>
      <p className="text-sm text-[var(--aj-ink-soft)]">判官正在翻阅你的卷宗，约需几秒……</p>
    </section>
  )
}
