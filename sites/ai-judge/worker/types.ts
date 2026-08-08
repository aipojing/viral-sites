export interface Verdict {
  /** 罪名，≤8 code points */
  crime: string
  /** 判词正文，60～90 code points */
  verdict: string
  /** 刑期梗，≤24 code points */
  sentence: string
  /** 印章小字，≤16 code points */
  seal: string
}

export interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

export interface VerdictResponse {
  verdict: Verdict
  source: 'model' | 'cache' | 'fallback'
}
