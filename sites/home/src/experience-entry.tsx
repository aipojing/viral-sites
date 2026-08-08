import { startAnalytics } from '@viral/shared'
import { House } from '@phosphor-icons/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { experienceLoaders, resolveExperienceSlug } from './experience-loaders'

startAnalytics()

async function mountExperience() {
  const slug = resolveExperienceSlug(window.location.pathname)
  const root = document.getElementById('root')

  if (!slug || !root) {
    window.location.replace('/')
    return
  }

  const Experience = await experienceLoaders[slug]()
  await import('./experience-shell.css')

  createRoot(root).render(
    <StrictMode>
      <a className="portal-home-link" href="/" aria-label="返回怪好玩首页">
        <House aria-hidden="true" weight="fill" />
        <span>怪好玩</span>
      </a>
      <Experience />
    </StrictMode>,
  )
}

void mountExperience()
