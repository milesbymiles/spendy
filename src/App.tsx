import { useCallback, useEffect, useState } from 'react'
import { ExpenseSheet } from './components/ExpenseSheet'
import { Icon } from './components/Icon'
import { TabBar, type Tab } from './components/TabBar'
import { Toast, type ToastData } from './components/Toast'
import { isCategoryId, isPaymentMethod } from './categories'
import { monthOf, parseAmount, todayISO } from './format'
import { setPrefs } from './prefs'
import { Home } from './screens/Home'
import { Settings } from './screens/Settings'
import { Stats } from './screens/Stats'
import { useStore } from './store'
import type { Expense, ExpenseDraft } from './types'

type SheetState = { mode: 'add'; prefill?: Partial<ExpenseDraft> } | { mode: 'edit'; expense: Expense } | null

/**
 * Reads an "add expense" deep link: ?add, optionally with amount, note, category and method,
 * e.g. ./?add&amount=250&note=Zomato&method=upi. Used by the Android home-screen shortcut and
 * by automations such as iOS Shortcuts.
 */
function readAddLink(): Partial<ExpenseDraft> | null {
  const params = new URLSearchParams(window.location.search)
  if (!params.has('add')) return null
  const prefill: Partial<ExpenseDraft> = {}
  const amount = parseAmount(params.get('amount') ?? '')
  if (amount) prefill.amount = amount
  const note = params.get('note')?.trim()
  if (note) prefill.note = note.slice(0, 80)
  const category = params.get('category')
  if (isCategoryId(category)) prefill.category = category
  const method = params.get('method')
  if (isPaymentMethod(method)) prefill.method = method
  return prefill
}

export default function App() {
  const store = useStore()
  const [tab, setTab] = useState<Tab>('home')
  const [month, setMonth] = useState(() => monthOf(todayISO()))
  const [sheet, setSheet] = useState<SheetState>(null)
  const [toast, setToast] = useState<ToastData | null>(null)

  useEffect(() => {
    const prefill = readAddLink()
    if (!prefill) return
    setSheet({ mode: 'add', prefill })
    // Drop the parameters so a reload doesn't open the sheet again.
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  const notify = useCallback((message: string, action?: ToastData['action']) => {
    setToast({ id: Date.now(), message, action })
  }, [])
  const closeSheet = useCallback(() => setSheet(null), [])
  const dismissToast = useCallback(() => setToast(null), [])

  const changeTab = (t: Tab) => {
    setTab(t)
    window.scrollTo(0, 0)
  }

  const save = (draft: ExpenseDraft) => {
    if (sheet?.mode === 'edit') {
      store.updateExpense(sheet.expense.id, draft)
    } else {
      store.addExpense(draft)
      setPrefs({ lastCategory: draft.category, lastMethod: draft.method })
    }
    // Jump to the month the expense landed in so it's visible straight away.
    setMonth(monthOf(draft.date))
    setSheet(null)
  }

  const repeat = (draft: ExpenseDraft) => {
    store.addExpense(draft)
    setMonth(monthOf(draft.date))
    setSheet(null)
    notify('Added again for today')
  }

  const remove = (expense: Expense) => {
    store.removeExpense(expense.id)
    setSheet(null)
    notify('Expense deleted', { label: 'Undo', run: () => store.restoreExpense(expense) })
  }

  return (
    <div className="app">
      {tab === 'home' && (
        <Home
          month={month}
          onMonthChange={setMonth}
          onSelect={(expense) => setSheet({ mode: 'edit', expense })}
          onAdd={() => setSheet({ mode: 'add' })}
          onOpenSettings={() => changeTab('settings')}
        />
      )}
      {tab === 'stats' && <Stats month={month} onMonthChange={setMonth} />}
      {tab === 'settings' && <Settings notify={notify} />}

      {tab !== 'settings' && (
        <button className="fab" onClick={() => setSheet({ mode: 'add' })} aria-label="Add expense">
          <Icon name="plus" size={28} />
        </button>
      )}

      <TabBar tab={tab} onChange={changeTab} />

      {toast && <Toast key={toast.id} toast={toast} onDone={dismissToast} />}

      {sheet && (
        <ExpenseSheet
          key={sheet.mode === 'edit' ? sheet.expense.id : 'new'}
          expense={sheet.mode === 'edit' ? sheet.expense : undefined}
          prefill={sheet.mode === 'add' ? sheet.prefill : undefined}
          onSave={save}
          onRepeat={sheet.mode === 'edit' ? repeat : undefined}
          onDelete={sheet.mode === 'edit' ? () => remove(sheet.expense) : undefined}
          onClose={closeSheet}
        />
      )}
    </div>
  )
}
