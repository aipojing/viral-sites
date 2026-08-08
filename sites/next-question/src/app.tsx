import { useCallback, useEffect, useState } from 'react'
import { track } from '@viral/shared'
import type { PublicChain, Slot } from '../worker/types'
import {
  ApiError,
  closeChain,
  createChain,
  deleteChain,
  getChain,
  submitBaton,
} from './lib/api-client'
import {
  clearCapabilityFragment,
  getInstallationId,
  ingestFragment,
  loadCapabilities,
  saveBatonToken,
  saveNextBatonToken,
  saveOwnerToken,
  saveParticipantToken,
  type ChainCapabilities,
} from './lib/token-vault'
import { BatonScreen } from './components/baton-screen'
import { ErrorScreen } from './components/error-screen'
import { HandoffScreen } from './components/handoff-screen'
import { LandingScreen } from './components/landing-screen'
import { ProgressScreen } from './components/progress-screen'
import { ResultScreen } from './components/result-screen'

export type AppState =
  | { screen: 'landing' }
  | { screen: 'loading'; slug: string }
  | { screen: 'baton'; chain: PublicChain; token: string }
  | { screen: 'handoff'; chain: PublicChain; nextToken: string; origin: 'create' | 'submit' }
  | { screen: 'progress'; chain: PublicChain; ownerToken?: string; notice?: string }
  | { screen: 'result'; chain: PublicChain; ownerToken?: string }
  | { screen: 'error'; code: string; slug?: string }

const CHAIN_PATH_PATTERN = /^\/next-question\/c\/([A-Za-z0-9_-]{16})$/

function parseLocation(): { kind: 'landing' } | { kind: 'chain'; slug: string; hash: string } {
  const path = window.location.pathname.replace(/\/+$/, '')
  const match = CHAIN_PATH_PATTERN.exec(path)
  if (match) return { kind: 'chain', slug: match[1], hash: window.location.hash }
  return { kind: 'landing' }
}

export function errorCodeOf(error: unknown): string {
  if (error instanceof ApiError) return error.code
  return 'network_error'
}

function resolveChainScreen(
  slug: string,
  chain: PublicChain,
  capabilities: ChainCapabilities,
): AppState {
  if (chain.status === 'completed') {
    return { screen: 'result', chain, ownerToken: capabilities.ownerToken }
  }
  if (chain.status === 'expired' || chain.status === 'cancelled' || chain.status === 'deleted') {
    return { screen: 'error', code: chain.status, slug }
  }
  if (chain.status === 'returned') {
    return { screen: 'progress', chain, ownerToken: capabilities.ownerToken }
  }
  // status === 'waiting'
  if (chain.nextSlot !== null) {
    const justSubmitted = capabilities.participantTokens[(chain.nextSlot - 1) as Slot]
    if (justSubmitted && capabilities.nextBatonToken) {
      return {
        screen: 'handoff',
        chain,
        nextToken: capabilities.nextBatonToken,
        origin: 'submit',
      }
    }
    if (capabilities.ownerToken && chain.nextSlot === 2 && capabilities.batonToken) {
      return { screen: 'handoff', chain, nextToken: capabilities.batonToken, origin: 'create' }
    }
  }
  if (capabilities.batonToken) {
    return { screen: 'baton', chain, token: capabilities.batonToken }
  }
  return { screen: 'progress', chain, ownerToken: capabilities.ownerToken }
}

export function App() {
  const [state, setState] = useState<AppState>({ screen: 'loading', slug: '' })

  useEffect(() => {
    const route = parseLocation()
    if (route.kind === 'landing') {
      setState({ screen: 'landing' })
      return
    }
    const capabilities = ingestFragment(route.slug, route.hash, window.localStorage)
    if (route.hash !== '') {
      clearCapabilityFragment(window.history, window.location.pathname, window.location.search)
    }
    setState({ screen: 'loading', slug: route.slug })
    void (async () => {
      try {
        const chain = await getChain(route.slug)
        setState(resolveChainScreen(route.slug, chain, capabilities))
        if (chain.status === 'waiting' && chain.nextSlot !== null) {
          track('next_question_baton_opened', { q: chain.nextSlot })
        }
      } catch (error) {
        setState({ screen: 'error', code: errorCodeOf(error), slug: route.slug })
      }
    })()
  }, [])

  const handleCreate = useCallback(async (nickname: string, question: string): Promise<string | null> => {
    try {
      const result = await createChain({
        requestId: crypto.randomUUID(),
        installationId: getInstallationId(window.localStorage),
        nickname,
        question,
      })
      const slug = result.chain.slug
      saveOwnerToken(slug, result.ownerToken, window.localStorage)
      saveBatonToken(slug, result.batonToken, window.localStorage)
      track('next_question_created')
      setState({ screen: 'handoff', chain: result.chain, nextToken: result.batonToken, origin: 'create' })
      return null
    } catch (error) {
      return errorCodeOf(error)
    }
  }, [])

  const handleSubmitBaton = useCallback(
    async (slug: string, token: string, nickname: string, answer: string, question: string): Promise<string | null> => {
      try {
        const result = await submitBaton(slug, token, {
          requestId: crypto.randomUUID(),
          nickname,
          answer,
          question,
        })
        const slot = (result.chain.status === 'returned' ? 6 : (result.chain.nextSlot ?? 7) - 1) as Slot
        saveParticipantToken(slug, slot, result.participantToken, window.localStorage)
        if (result.nextBatonToken) {
          saveNextBatonToken(slug, result.nextBatonToken, window.localStorage)
        }
        track('next_question_baton_submitted', { q: slot })
        if (result.chain.status === 'returned') {
          track('next_question_returned')
          setState({ screen: 'progress', chain: result.chain })
          return null
        }
        setState({
          screen: 'handoff',
          chain: result.chain,
          nextToken: result.nextBatonToken ?? '',
          origin: 'submit',
        })
        return null
      } catch (error) {
        const code = errorCodeOf(error)
        if (code === 'chain_advanced') {
          // 被别人抢先接走：重新拉取最新链条，展示进度而不是白屏
          try {
            const fresh = await getChain(slug)
            setState({ screen: 'progress', chain: fresh, notice: 'chain_advanced' })
          } catch {
            setState({ screen: 'error', code, slug })
          }
          return null
        }
        return code
      }
    },
    [],
  )

  const handleClose = useCallback(async (slug: string, token: string, answer: string): Promise<string | null> => {
    try {
      const chain = await closeChain(slug, token, { requestId: crypto.randomUUID(), answer })
      track('next_question_completed')
      setState({ screen: 'result', chain, ownerToken: token })
      return null
    } catch (error) {
      return errorCodeOf(error)
    }
  }, [])

  const handleDelete = useCallback(async (slug: string, token: string): Promise<void> => {
    try {
      await deleteChain(slug, token, crypto.randomUUID())
    } catch {
      // 删除失败时保持当前页面；下一问链随后会按保留期清理
    }
    setState({ screen: 'error', code: 'deleted', slug })
  }, [])

  switch (state.screen) {
    case 'landing':
      return <LandingScreen onCreate={handleCreate} />
    case 'loading':
      return (
        <main className="mx-auto flex min-h-dvh max-w-xl items-center justify-center px-6">
          <p className="text-sm text-stone-500" role="status">
            正在取回这条问题……
          </p>
        </main>
      )
    case 'baton':
      return (
        <BatonScreen
          chain={state.chain}
          onSubmit={(nickname, answer, question) =>
            handleSubmitBaton(state.chain.slug, state.token, nickname, answer, question)
          }
        />
      )
    case 'handoff':
      return <HandoffScreen chain={state.chain} nextToken={state.nextToken} origin={state.origin} />
    case 'progress':
      return (
        <ProgressScreen
          chain={state.chain}
          ownerToken={state.ownerToken}
          notice={state.notice}
          onClose={
            state.ownerToken
              ? (answer) => handleClose(state.chain.slug, state.ownerToken as string, answer)
              : undefined
          }
          onDelete={
            state.ownerToken ? () => handleDelete(state.chain.slug, state.ownerToken as string) : undefined
          }
        />
      )
    case 'result':
      return <ResultScreen chain={state.chain} />
    case 'error':
      return <ErrorScreen code={state.code} slug={state.slug} />
  }
}

export default App
