import { POPULAR_RELATIONS } from '../data/popular-relations'

export interface PopularGridProps {
  onSelect: (entryId: string) => void
}

/** 春节饭桌高频称呼的快捷入口，点击直接打开对应结果 */
export function PopularGrid({ onSelect }: PopularGridProps) {
  return (
    <div className="kcc-popular">
      <p className="kcc-popular__title">春节高频速查</p>
      <ul className="kcc-popular__grid">
        {POPULAR_RELATIONS.map((item) => (
          <li key={item.entryId}>
            <button
              type="button"
              className="kcc-popular__item"
              onClick={() => onSelect(item.entryId)}
            >
              <span className="kcc-popular__name">{item.title}</span>
              <span className="kcc-popular__hint">{item.hint}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
