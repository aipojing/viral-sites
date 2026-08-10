import {
  ArrowRight,
  Browser,
  CaretLeft,
  CaretRight,
  ChatCircleDots,
  ChatsCircle,
  Coffee,
  CursorClick,
  Fire,
  Flask,
  GlobeHemisphereEast,
  GridFour,
  Heart,
  HourglassHigh,
  Lightning,
  PuzzlePiece,
  Scroll,
  Shuffle,
  Sparkle,
  X,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { pickRandomProject, projects, type Project } from './projects'

export interface AppProps {
  random?: () => number
}

const SHUFFLE_DELAYS = [180, 220, 280, 360, 480] as const
const DEFAULT_PROJECT_SLUG = 'cyber-fortune'

const navItems = [
  { label: '热门精选', slug: 'life-grid', Icon: Fire },
  { label: '整活专区', slug: 'mental-state', Icon: PuzzlePiece },
  { label: '社交破冰', slug: 'tacit-test', Icon: ChatCircleDots },
  { label: '心理趣测', slug: 'internet-age', Icon: Heart },
  { label: '脑洞实验室', slug: 'refusal-generator', Icon: Flask },
  { label: '网络万花筒', slug: 'cyber-fortune', Icon: GlobeHemisphereEast },
]

const cardHues: Record<string, string> = {
  'life-grid': '0deg',
  'mental-state': '108deg',
  'tacit-test': '54deg',
  'cyber-fortune': '0deg',
  'refusal-generator': '132deg',
  'internet-age': '216deg',
}

const energyHues: Record<string, string> = {
  'life-grid': '10deg',
  'mental-state': '129deg',
  'tacit-test': '42deg',
  'cyber-fortune': '0deg',
  'refusal-generator': '154deg',
  'internet-age': '217deg',
}

function CartridgeGlyph({ slug }: { slug: string }) {
  const iconProps = { 'aria-hidden': true, weight: 'duotone' as const }

  switch (slug) {
    case 'life-grid':
      return <HourglassHigh {...iconProps} />
    case 'mental-state':
      return <Coffee {...iconProps} />
    case 'tacit-test':
      return <Heart {...iconProps} />
    case 'cyber-fortune':
      return <Scroll {...iconProps} />
    case 'refusal-generator':
      return <ChatsCircle {...iconProps} />
    default:
      return <Browser {...iconProps} />
  }
}

function Cartridge({
  index,
  project,
  selected,
  onSelect,
}: {
  index: number
  project: Project
  selected: boolean
  onSelect: () => void
}) {
  return (
    <li className="cartridge-slot">
      <button
        className="cartridge"
        type="button"
        aria-label={`选择${project.title}`}
        aria-pressed={selected}
        data-selected={selected}
        data-project-slug={project.slug}
        onClick={onSelect}
        style={
          {
            '--card-accent': project.accent,
            '--card-hue': cardHues[project.slug] ?? `${index * 48}deg`,
          } as CSSProperties
        }
      >
        <span className="cartridge__shell" aria-hidden="true" />
        <span className="cartridge__number">{String(index + 1).padStart(2, '0')}</span>
        <strong className="cartridge__title">{project.shortTitle}</strong>
        <span className="cartridge__screen" data-hero-art={Boolean(project.hero)} aria-hidden="true">
          <img
            src={project.hero ?? project.preview}
            alt=""
            width={project.hero ? '1280' : '390'}
            height={project.hero ? '768' : '844'}
            loading="lazy"
          />
          {project.hero ? null : <CartridgeGlyph slug={project.slug} />}
        </span>
        <span className="cartridge__status" aria-hidden="true">
          {selected ? 'NOW PLAYING' : 'INSERT COIN'}
        </span>
      </button>
    </li>
  )
}

function AllProjects({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="all-projects-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="all-projects"
        role="dialog"
        aria-modal="true"
        aria-labelledby="all-projects-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="all-projects__header">
          <div>
            <p>PLAY LIBRARY</p>
            <h2 id="all-projects-title">全部玩法</h2>
          </div>
          <button type="button" aria-label="关闭全部玩法" onClick={onClose}>
            <X aria-hidden="true" weight="bold" />
          </button>
        </header>

        <div className="all-projects__grid">
          {projects.map((project, index) => (
            <a
              key={project.slug}
              className="library-card"
              href={project.href}
              aria-label={`进入${project.title}`}
              style={{ '--card-accent': project.accent } as CSSProperties}
            >
              <span className="library-card__number">{String(index + 1).padStart(2, '0')}</span>
              <span className="library-card__icon" aria-hidden="true">
                {project.hero ? <img src={project.hero} alt="" loading="lazy" /> : <CartridgeGlyph slug={project.slug} />}
              </span>
              <span className="library-card__copy">
                <small>{project.flavor}</small>
                <strong>{project.title}</strong>
                <span>{project.description}</span>
              </span>
              <ArrowRight aria-hidden="true" weight="bold" />
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}

export function App({ random = Math.random }: AppProps) {
  const [selectedSlug, setSelectedSlug] = useState(DEFAULT_PROJECT_SLUG)
  const [shuffleSlug, setShuffleSlug] = useState<string | null>(null)
  const [isShuffling, setIsShuffling] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const railRef = useRef<HTMLUListElement>(null)
  const shuffleTimerRef = useRef<number | null>(null)

  const selectedIndex = Math.max(
    projects.findIndex((project) => project.slug === selectedSlug),
    0,
  )
  const selected = projects[selectedIndex]
  const highlightedSlug = shuffleSlug ?? selectedSlug
  const highlightedIndex = Math.max(
    projects.findIndex((project) => project.slug === highlightedSlug),
    0,
  )
  const highlighted = projects[highlightedIndex]

  const selectedStyle = useMemo(
    () =>
      ({
        '--accent': highlighted.accent,
        '--selected-index': highlightedIndex,
        '--energy-hue': energyHues[highlighted.slug] ?? '0deg',
      }) as CSSProperties,
    [highlighted.accent, highlighted.slug, highlightedIndex],
  )

  useEffect(
    () => () => {
      if (shuffleTimerRef.current !== null) window.clearTimeout(shuffleTimerRef.current)
    },
    [],
  )

  useEffect(() => {
    const rail = railRef.current
    const selectedCard = rail?.querySelector<HTMLElement>(
      `[data-project-slug="${highlightedSlug}"]`,
    )
    const selectedSlot = selectedCard?.closest<HTMLElement>('.cartridge-slot')
    if (rail && selectedSlot && typeof rail.scrollTo === 'function') {
      const centeredLeft = selectedSlot.offsetLeft - (rail.clientWidth - selectedSlot.offsetWidth) / 2
      const maxLeft = Math.max(0, rail.scrollWidth - rail.clientWidth)
      rail.scrollTo({
        left: Math.max(0, Math.min(centeredLeft, maxLeft)),
        behavior: isShuffling ? 'auto' : 'smooth',
      })
    }
  }, [highlightedSlug, isShuffling])

  const selectProject = (project: Project) => {
    if (!isShuffling) setSelectedSlug(project.slug)
  }

  const selectFromNav = (slug: string) => {
    const project = projects.find((item) => item.slug === slug)
    if (project) selectProject(project)
  }

  const handleRandom = () => {
    if (isShuffling) return
    const target = pickRandomProject(projects, random)
    if (!target) return

    setIsShuffling(true)
    let step = 0
    const startingIndex = selectedIndex

    const runNextStep = () => {
      shuffleTimerRef.current = window.setTimeout(() => {
        step += 1

        if (step >= SHUFFLE_DELAYS.length) {
          if (shuffleTimerRef.current !== null) window.clearTimeout(shuffleTimerRef.current)
          shuffleTimerRef.current = null
          setSelectedSlug(target.slug)
          setShuffleSlug(null)
          setIsShuffling(false)
          return
        }

        setShuffleSlug(projects[(startingIndex + step) % projects.length].slug)
        runNextStep()
      }, SHUFFLE_DELAYS[step])
    }

    runNextStep()
  }

  const scrollRail = (direction: -1 | 1) => {
    railRef.current?.scrollBy({ left: direction * 520, behavior: 'smooth' })
  }

  return (
    <div className="site-shell" style={selectedStyle} data-shuffling={isShuffling}>
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="怪好玩首页">
          <span className="wordmark__mark" aria-hidden="true">
            <Sparkle weight="fill" />
          </span>
          <span>怪好玩</span>
        </a>

        <nav className="site-nav" aria-label="玩法分类">
          {navItems.map(({ label, slug, Icon }) => (
            <button key={label} type="button" onClick={() => selectFromNav(slug)}>
              <Icon aria-hidden="true" weight="fill" />
              {label}
            </button>
          ))}
        </nav>

        <div className="site-header__actions">
          <span className="play-count">
            <strong>{projects.length}</strong> 个玩法
          </span>
          <button
            className="header-shuffle"
            type="button"
            aria-label={isShuffling ? '顶部抽取中' : '顶部随机选择'}
            disabled={isShuffling}
            onClick={handleRandom}
          >
            <Shuffle aria-hidden="true" weight="bold" />
            {isShuffling ? '抽取中' : '随机选择'}
          </button>
        </div>
      </header>

      <main>
        <section className="launcher" aria-labelledby="page-title">
          <div className="hero-row">
            <div className="launcher__poster">
              <Heart className="poster-heart" aria-hidden="true" weight="fill" />
              <h1 id="page-title" aria-label="今天玩哪个？">
                <span className="title-chrome">今天</span>
                <span className="title-pop">玩</span>
                <span className="title-acid">哪个?</span>
              </h1>
              <CursorClick className="poster-cursor" aria-hidden="true" weight="fill" />
              <p>
                <Sparkle aria-hidden="true" weight="fill" />
                每一次点击，都是新的快乐
                <Lightning aria-hidden="true" weight="fill" />
              </p>
            </div>

            <article
              className="stage"
              key={selected.slug}
              aria-live="polite"
              data-long-title={selected.title.length >= 6}
            >
              <div className="stage__topbar" aria-hidden="true">
                <span>今日主推</span>
                <span>−　□　×</span>
              </div>
              <div className="stage__copy">
                <p className="stage__label">PLAY_{String(selectedIndex + 1).padStart(2, '0')}.EXE</p>
                <h2>{selected.title}</h2>
                <p>{selected.description}</p>
                <a className="start-button" href={selected.href} aria-label="开始玩">
                  开始玩
                  <ArrowRight aria-hidden="true" weight="fill" />
                </a>
              </div>

              <div className="stage__visual" data-generated-art={Boolean(selected.hero)}>
                <img
                  className={selected.hero ? 'stage__hero-art' : 'stage__fallback-art'}
                  src={selected.hero ?? selected.preview}
                  alt=""
                  width={selected.hero ? '1280' : '390'}
                  height={selected.hero ? '768' : '844'}
                />
                <Sparkle className="stage__spark stage__spark--one" aria-hidden="true" weight="fill" />
                <Sparkle className="stage__spark stage__spark--two" aria-hidden="true" weight="fill" />
              </div>
            </article>
          </div>

          <section className="selector" id="play-deck" aria-labelledby="selector-title">
            <h2 className="sr-only" id="selector-title">选择一张玩法卡带</h2>
            {selected.hero ? (
              <img
                className="selection-energy"
                src="/assets/selection-energy-transparent-v2.png"
                alt=""
                width="1024"
                height="512"
                aria-hidden="true"
              />
            ) : null}
            <button
              className="deck-arrow deck-arrow--left"
              type="button"
              aria-label="向左浏览"
              onClick={() => scrollRail(-1)}
            >
              <CaretLeft aria-hidden="true" weight="bold" />
            </button>

            <ul className="cartridge-rail" ref={railRef}>
              {projects.map((project, index) => (
                <Cartridge
                  key={project.slug}
                  index={index}
                  project={project}
                  selected={project.slug === highlightedSlug}
                  onSelect={() => selectProject(project)}
                />
              ))}
            </ul>

            <button
              className="deck-arrow deck-arrow--right"
              type="button"
              aria-label="向右浏览"
              onClick={() => scrollRail(1)}
            >
              <CaretRight aria-hidden="true" weight="bold" />
            </button>

            <div className="launcher__actions">
              <button
                className="shuffle-button"
                type="button"
                aria-label={isShuffling ? '抽取中' : '随机选择'}
                disabled={isShuffling}
                onClick={handleRandom}
              >
                <Shuffle aria-hidden="true" weight="bold" />
                {isShuffling ? '抽取中…' : '随机选择'}
              </button>
              <button className="all-button" type="button" onClick={() => setShowAll(true)}>
                <GridFour aria-hidden="true" weight="fill" />
                全部玩法
              </button>
            </div>
          </section>
        </section>
      </main>

      {showAll ? <AllProjects onClose={() => setShowAll(false)} /> : null}
    </div>
  )
}
