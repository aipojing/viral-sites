interface Props {
  dataUrl: string
  onClose: () => void
}

export function LongPressOverlay({ dataUrl, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/85 px-8"
      onClick={onClose}
    >
      <img src={dataUrl} alt="默契度卡片" className="max-h-[70vh] w-auto rounded-lg" />
      <p className="text-sm text-white">长按图片保存</p>
      <p className="text-xs text-[#6f6a62]">点击空白处关闭</p>
    </div>
  )
}
