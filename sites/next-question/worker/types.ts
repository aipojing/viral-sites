export type ChainStatus =
  | 'waiting'
  | 'returned'
  | 'completed'
  | 'expired'
  | 'deleted'
  | 'cancelled'

export type Slot = 1 | 2 | 3 | 4 | 5 | 6

export interface ChainEntry {
  slot: Slot
  nickname: string
  answer: string | null
  question: string
  submittedAt: number
  redacted: boolean
}

export interface PublicChain {
  slug: string
  status: ChainStatus
  nextSlot: Slot | null
  entries: readonly ChainEntry[]
  createdAt: number
  updatedAt: number
  expiresAt: number
}

export interface CreateChainInput {
  requestId: string
  installationId: string
  nickname: string
  question: string
}

export interface SubmitBatonInput {
  requestId: string
  nickname: string
  answer: string
  question: string
}

export interface CloseChainInput {
  requestId: string
  answer: string
}

export interface CreateChainResult {
  chain: PublicChain
  ownerToken: string
  batonToken: string
}

export interface SubmitBatonResult {
  chain: PublicChain
  participantToken: string
  nextBatonToken: string | null
}
