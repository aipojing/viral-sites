import QRCode from 'qrcode/lib/core/qrcode'
import errorCorrectionLevel from 'qrcode/lib/core/error-correction-level'

export interface QrMatrix {
  size: number
  darkModules: ReadonlyArray<readonly [row: number, col: number]>
}

export function createQrMatrix(value: string): QrMatrix {
  const qr = QRCode.create(value, { errorCorrectionLevel: errorCorrectionLevel.M })
  const darkModules: Array<readonly [number, number]> = []
  for (let row = 0; row < qr.modules.size; row += 1) {
    for (let col = 0; col < qr.modules.size; col += 1) {
      if (qr.modules.get(row, col)) darkModules.push([row, col])
    }
  }
  return { size: qr.modules.size, darkModules }
}
