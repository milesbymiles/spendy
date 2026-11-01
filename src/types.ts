export type CategoryId =
  | 'food'
  | 'groceries'
  | 'transport'
  | 'shopping'
  | 'bills'
  | 'fun'
  | 'health'
  | 'travel'
  | 'home'
  | 'other'

export interface Expense {
  id: string
  /** Paise, always an integer. */
  amount: number
  category: CategoryId
  note: string
  /** Local calendar date, YYYY-MM-DD. */
  date: string
  createdAt: number
}

export interface Settings {
  /** Monthly budget in paise, or null when unset. */
  budget: number | null
}

export type ExpenseDraft = Omit<Expense, 'id' | 'createdAt'>
