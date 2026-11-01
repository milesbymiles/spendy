/** A built-in category id ('food', 'bills', …) or a custom one ('c_…'). */
export type CategoryId = string

export type PaymentMethod = 'upi' | 'card' | 'cash'

export interface Category {
  id: CategoryId
  label: string
  emoji: string
}

export interface Expense {
  id: string
  /** Paise, always an integer. */
  amount: number
  category: CategoryId
  /** Missing on expenses recorded before payment methods existed. */
  method?: PaymentMethod
  note: string
  /** Local calendar date, YYYY-MM-DD. */
  date: string
  createdAt: number
}

export interface Settings {
  /** Monthly budget in paise, or null when unset. */
  budget: number | null
  /** User-created categories, shown after the built-in ones. */
  categories: Category[]
  /** Ids of categories hidden from the picker (existing expenses keep them). */
  hidden: CategoryId[]
}

export type ExpenseDraft = Omit<Expense, 'id' | 'createdAt'>
