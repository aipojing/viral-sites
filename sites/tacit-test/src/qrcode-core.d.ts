declare module 'qrcode/lib/core/qrcode' {
  interface QRData {
    modules: { size: number; get(row: number, col: number): boolean }
  }
  const QRCode: { create(text: string, opts?: { errorCorrectionLevel?: string }): QRData }
  export default QRCode
}

declare module 'qrcode/lib/core/error-correction-level' {
  const L = 'L'
  const M = 'M'
  const Q = 'Q'
  const H = 'H'
  export default { L, M, Q, H }
}
