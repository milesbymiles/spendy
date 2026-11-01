import { useMemo, useState } from 'react'
import { isBuiltinCategory, newCategoryId } from '../categories'
import { useStore } from '../store'
import { Icon } from './Icon'
import { Sheet } from './Sheet'

const MAX_CUSTOM = 40

/** The first user-perceived character, so a typed "🍕🍕" or "pizza" becomes one icon. */
function firstGlyph(s: string) {
  const t = s.trim()
  if (!t) return ''
  if ('Segmenter' in Intl) return new Intl.Segmenter().segment(t)[Symbol.iterator]().next().value?.segment ?? ''
  return [...t][0]
}

export function CategoriesSheet({ onClose }: { onClose: () => void }) {
  const { categories, settings, expenses, updateSettings } = useStore()
  const [editing, setEditing] = useState<string | null>(null)
  const [emoji, setEmoji] = useState('')
  const [label, setLabel] = useState('')

  const used = useMemo(() => new Set(expenses.map((e) => e.category)), [expenses])
  const visibleCount = categories.filter((c) => !settings.hidden.includes(c.id)).length
  const atLimit = !editing && settings.categories.length >= MAX_CUSTOM

  const reset = () => {
    setEditing(null)
    setEmoji('')
    setLabel('')
  }

  const submit = () => {
    const name = label.trim()
    if (!name || atLimit) return
    const icon = firstGlyph(emoji) || '🏷️'
    updateSettings({
      categories: editing
        ? settings.categories.map((c) => (c.id === editing ? { ...c, label: name, emoji: icon } : c))
        : [...settings.categories, { id: newCategoryId(), label: name, emoji: icon }],
    })
    reset()
  }

  const toggleHidden = (id: string) => {
    const hidden = settings.hidden.includes(id)
    if (!hidden && visibleCount <= 1) return // always keep one to pick from
    updateSettings({ hidden: hidden ? settings.hidden.filter((h) => h !== id) : [...settings.hidden, id] })
  }

  const remove = (id: string) => {
    updateSettings({
      categories: settings.categories.filter((c) => c.id !== id),
      hidden: settings.hidden.filter((h) => h !== id),
    })
    if (editing === id) reset()
  }

  return (
    <Sheet title="Categories" onClose={onClose} onSubmit={submit}>
      <div className="category-form">
        <input
          className="text-input category-form__emoji"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          placeholder="🏷️"
          maxLength={16}
          aria-label="Emoji"
        />
        <input
          className="text-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={editing ? 'Category name' : 'New category, e.g. Petrol'}
          maxLength={20}
          enterKeyHint="done"
          aria-label="Category name"
        />
        <button type="submit" className="btn btn--primary category-form__btn" disabled={!label.trim() || atLimit}>
          {editing ? 'Save' : 'Add'}
        </button>
      </div>
      {editing && (
        <button type="button" className="link-btn" onClick={reset}>
          Cancel editing
        </button>
      )}

      <ul className="card category-list">
        {categories.map((c) => {
          const hidden = settings.hidden.includes(c.id)
          const custom = !isBuiltinCategory(c.id)
          return (
            <li key={c.id} className="category-list__row" data-hidden={hidden || undefined}>
              <span className="emoji-badge" aria-hidden="true">
                {c.emoji}
              </span>
              <span className="category-list__name">
                {c.label}
                {hidden && <span className="category-list__tag">Hidden</span>}
              </span>
              {custom && (
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setEditing(c.id)
                    setEmoji(c.emoji)
                    setLabel(c.label)
                  }}
                >
                  Edit
                </button>
              )}
              {custom && !used.has(c.id) && (
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  onClick={() => remove(c.id)}
                  aria-label={`Delete ${c.label}`}
                >
                  <Icon name="trash" size={18} />
                </button>
              )}
              <button
                type="button"
                className="icon-btn"
                onClick={() => toggleHidden(c.id)}
                disabled={!hidden && visibleCount <= 1}
                aria-label={hidden ? `Show ${c.label}` : `Hide ${c.label}`}
                aria-pressed={!hidden}
              >
                <Icon name={hidden ? 'eyeOff' : 'eye'} size={20} />
              </button>
            </li>
          )
        })}
      </ul>
      <p className="footnote">
        Hidden categories disappear from the picker but keep their past expenses. Custom categories can be deleted
        once no expense uses them.
      </p>
    </Sheet>
  )
}
