interface LongPressOverlayProps {
  dataUrl: string
  alt: string
  onClose: () => void
}

/** 微信等无法触发下载的浏览器：展示图片让用户长按保存 */
export function LongPressOverlay({ dataUrl, alt, onClose }: LongPressOverlayProps) {
  return (
    <div className="yr-overlay" onClick={onClose}>
      <img src={dataUrl} alt={alt} className="yr-overlay__image" />
      <p className="yr-overlay__hint">长按图片保存</p>
      <p className="yr-overlay__close-hint">点击空白处关闭</p>
    </div>
  )
}
