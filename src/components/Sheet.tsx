import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Icon } from './Icon'

/** Keeps the sheet above the on-screen keyboard on iOS, where fixed elements don't move. */
function useKeyboardInset() {
  const [inset, setInset] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
  return inset
}

interface Props {
  title: string
  onClose: () => void
  onSubmit: (e: FormEvent) => void
  /** Optional button on the right of the header (e.g. delete). */
  action?: ReactNode
  children: ReactNode
}

/** A bottom sheet holding a form, with backdrop, close button and Escape handling. */
export function Sheet({ title, onClose, onSubmit, action, children }: Props) {
  const keyboardInset = useKeyboardInset()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [onClose])

  return (
    <div className="sheet-layer">
      <div className="sheet-backdrop" onClick={onClose} />
      <form
        className="sheet"
        style={{ marginBottom: keyboardInset }}
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit(e)
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
      >
        <div className="sheet__handle" aria-hidden="true" />
        <header className="sheet__header">
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={22} />
          </button>
          <h2 id="sheet-title">{title}</h2>
          {action ?? <span className="icon-btn" aria-hidden="true" />}
        </header>
        {children}
      </form>
    </div>
  )
}
