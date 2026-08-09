interface Props {
  dataUrl: string
  alt: string
  onClose: () => void
}

export function LongPressOverlay({ dataUrl, alt, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/85 px-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="长按保存图片"
    >
      <img src={dataUrl} alt={alt} className="max-h-[70vh] w-auto border-[3px] border-[var(--st-receipt)]" />
      <p className="text-sm font-bold text-white">长按图片保存</p>
      <p className="text-xs text-white/60">点击空白处关闭</p>
    </div>
  )
}
