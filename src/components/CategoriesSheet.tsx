import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [emoji, setEmoji] = useState('')
  const [label, setLabel] = useState('')
  // Editing happens inline in the category's own row.
  const [editing, setEditing] = useState<string | null>(null)
  const [editEmoji, setEditEmoji] = useState('')
  const [editLabel, setEditLabel] = useState('')
  const editRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) editRef.current?.focus()
  }, [editing])

  const used = useMemo(() => new Set(expenses.map((e) => e.category)), [expenses])
  const visibleCount = categories.filter((c) => !settings.hidden.includes(c.id)).length
  const atLimit = settings.categories.length >= MAX_CUSTOM

  const add = () => {
    const name = label.trim()
    if (!name || atLimit) return
    updateSettings({
      categories: [...settings.categories, { id: newCategoryId(), label: name, emoji: firstGlyph(emoji) || '🏷️' }],
    })
    setEmoji('')
    setLabel('')
  }

  const startEdit = (id: string, current: { emoji: string; label: string }) => {
    setEditing(id)
    setEditEmoji(current.emoji)
    setEditLabel(current.label)
  }

  const saveEdit = () => {
    const name = editLabel.trim()
    if (!editing || !name) return
    updateSettings({
      categories: settings.categories.map((c) =>
        c.id === editing ? { ...c, label: name, emoji: firstGlyph(editEmoji) || c.emoji } : c,
      ),
    })
    setEditing(null)
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
    if (editing === id) setEditing(null)
  }

  return (
    // Enter submits the sheet's form: save the row being edited, otherwise add a new category.
    <Sheet title="Categories" onClose={onClose} onSubmit={editing ? saveEdit : add}>
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
          placeholder="New category, e.g. Petrol"
          maxLength={20}
          enterKeyHint="done"
          aria-label="Category name"
        />
        {/* The form's submit button is the one Enter presses, so it follows whichever field is in use. */}
        <button
          type={editing ? 'button' : 'submit'}
          className="btn btn--primary category-form__btn"
          onClick={editing ? add : undefined}
          disabled={!label.trim() || atLimit}
        >
          Add
        </button>
      </div>

      <ul className="card category-list">
        {categories.map((c) => {
          const hidden = settings.hidden.includes(c.id)
          const custom = !isBuiltinCategory(c.id)

          if (editing === c.id) {
            return (
              <li key={c.id} className="category-list__row category-list__row--editing">
                <input
                  className="text-input category-form__emoji"
                  value={editEmoji}
                  onChange={(e) => setEditEmoji(e.target.value)}
                  maxLength={16}
                  aria-label="Emoji"
                />
                <input
                  ref={editRef}
                  className="text-input"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  maxLength={20}
                  enterKeyHint="done"
                  aria-label="Category name"
                />
                <button type="submit" className="link-btn" disabled={!editLabel.trim()}>
                  Save
                </button>
                <button type="button" className="icon-btn" onClick={() => setEditing(null)} aria-label="Cancel editing">
                  <Icon name="close" size={18} />
                </button>
              </li>
            )
          }

          const main = (
            <>
              <span className="emoji-badge" aria-hidden="true">
                {c.emoji}
              </span>
              <span className="category-list__name">
                {c.label}
                {hidden && <span className="category-list__tag">Hidden</span>}
              </span>
            </>
          )

          return (
            <li key={c.id} className="category-list__row" data-hidden={hidden || undefined}>
              {/* Custom categories: tapping anywhere on the name starts editing too. */}
              {custom ? (
                <button type="button" className="category-list__main" onClick={() => startEdit(c.id, c)}>
                  {main}
                </button>
              ) : (
                <span className="category-list__main">{main}</span>
              )}
              {custom && (
                <button type="button" className="link-btn" onClick={() => startEdit(c.id, c)}>
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
