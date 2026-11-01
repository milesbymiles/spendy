import { useCallback, useState } from 'react'
import { ExpenseSheet } from './components/ExpenseSheet'
import { Icon } from './components/Icon'
import { TabBar, type Tab } from './components/TabBar'
import { Toast, type ToastData } from './components/Toast'
import { monthOf, todayISO } from './format'
import { Home } from './screens/Home'
import { Settings } from './screens/Settings'
import { Stats } from './screens/Stats'
import { useStore } from './store'
import type { Expense, ExpenseDraft } from './types'

type SheetState = { mode: 'add' } | { mode: 'edit'; expense: Expense } | null

export default function App() {
  const store = useStore()
  const [tab, setTab] = useState<Tab>('home')
  const [month, setMonth] = useState(() => monthOf(todayISO()))
  const [sheet, setSheet] = useState<SheetState>(null)
  const [toast, setToast] = useState<ToastData | null>(null)

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
    }
    // Jump to the month the expense landed in so it's visible straight away.
    setMonth(monthOf(draft.date))
    setSheet(null)
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
         
          onSave={save}
          onDelete={sheet.mode === 'edit' ? () => remove(sheet.expense) : undefined}
          onClose={closeSheet}
        />
      )}
    </div>
  )
}
