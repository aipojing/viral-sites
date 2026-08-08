function trimOrigin(origin: string): string {
  return origin.replace(/\/+$/, '')
}

// public URL 永不携带 fragment：结果卡、进度卡与浏览器地址栏都只出现它。
export function buildPublicChainUrl(origin: string, slug: string): string {
  return `${trimOrigin(origin)}/next-question/c/${slug}`
}

export function buildBatonUrl(origin: string, slug: string, token: string): string {
  const base = buildPublicChainUrl(origin, slug)
  return token === '' ? base : `${base}#b=${token}`
}

export function buildOwnerUrl(origin: string, slug: string, token: string): string {
  const base = buildPublicChainUrl(origin, slug)
  return token === '' ? base : `${base}#o=${token}`
}
