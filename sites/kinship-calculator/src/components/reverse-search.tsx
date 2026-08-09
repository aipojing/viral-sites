import { track } from '@viral/shared'
import { useState } from 'react'
import type { RelationEntry } from '../data/relation-types'
import { reverseLookupWithPacks } from '../lib/reverse-lookup'

export interface ReverseSearchProps {
  regionPackId?: string
  onSelect: (entry: RelationEntry) => void
}

/** 称呼反查（Beta）：只收称呼原文做本地精确匹配，不把输入内容上传埋点 */
export function ReverseSearch({ regionPackId, onSelect }: ReverseSearchProps) {
  const [input, setInput] = useState('')
  const [searched, setSearched] = useState(false)
  const [matches, setMatches] = useState(() => reverseLookupWithPacks('', regionPackId))

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const next = reverseLookupWithPacks(input, regionPackId)
    setMatches(next)
    setSearched(true)
    if (input.trim() !== '') {
      track('reverse_used', { method: next.length > 0 ? 'hit' : 'miss' })
    }
  }

  return (
    <div className="kcc-reverse">
      <form className="kcc-reverse__form" onSubmit={handleSubmit}>
        <label className="kcc-reverse__label" htmlFor="kcc-reverse-input">
          输入一个称呼，看看它可能是谁
        </label>
        <div className="kcc-reverse__row">
          <input
            id="kcc-reverse-input"
            className="kcc-reverse__input"
            value={input}
            maxLength={24}
            placeholder="例如：三舅、姥姥、妯娌"
            onChange={(event) => setInput(event.target.value)}
          />
          <button type="submit" className="kcc-button kcc-reverse__submit">
            反查
          </button>
        </div>
      </form>

      {searched && matches.length === 0 && (
        <p className="kcc-reverse__empty" role="status">
          没找到完全匹配的称呼。换个写法试试，或者直接用「关系链」逐级点出来。
        </p>
      )}

      {matches.length > 0 && (
        <ul className="kcc-reverse__list">
          {matches.map((match) => (
            <li key={match.entry.id}>
              <button
                type="button"
                className="kcc-reverse__item"
                onClick={() => onSelect(match.entry)}
              >
                <span className="kcc-reverse__maybe">可能是</span>
                <span className="kcc-reverse__title">{match.entry.labels.join(' / ')}</span>
                <span className="kcc-reverse__hint">{match.entry.explanation}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
