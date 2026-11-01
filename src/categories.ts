import type { Category, CategoryId, PaymentMethod, Settings } from './types'

export const BUILTIN_CATEGORIES: Category[] = [
  { id: 'food', label: 'Food', emoji: '🍜' },
  { id: 'groceries', label: 'Groceries', emoji: '🛒' },
  { id: 'transport', label: 'Transport', emoji: '🚕' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'bills', label: 'Bills', emoji: '💡' },
  { id: 'fun', label: 'Fun', emoji: '🎬' },
  { id: 'health', label: 'Health', emoji: '💊' },
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'home', label: 'Home', emoji: '🏠' },
  { id: 'other', label: 'Other', emoji: '📦' },
]

const BUILTIN_IDS = new Set(BUILTIN_CATEGORIES.map((c) => c.id))
export const isBuiltinCategory = (id: CategoryId) => BUILTIN_IDS.has(id)

/** Shown for an expense whose custom category was deleted on another device. */
const UNKNOWN: Omit<Category, 'id'> = { label: 'Uncategorised', emoji: '❔' }

export const allCategories = (s: Settings) => [...BUILTIN_CATEGORIES, ...s.categories]

export function categoryLookup(s: Settings) {
  const byId = new Map(allCategories(s).map((c) => [c.id, c]))
  return (id: CategoryId): Category => byId.get(id) ?? { id, ...UNKNOWN }
}

export const isCategoryId = (v: unknown): v is CategoryId =>
  typeof v === 'string' && v.length > 0 && v.length <= 40

export const newCategoryId = () => 'c_' + Math.random().toString(36).slice(2, 10)

export const PAYMENT_METHODS: { id: PaymentMethod; label: string; emoji: string }[] = [
  { id: 'upi', label: 'UPI', emoji: '📱' },
  { id: 'card', label: 'Card', emoji: '💳' },
  { id: 'cash', label: 'Cash', emoji: '💵' },
]

export const isPaymentMethod = (v: unknown): v is PaymentMethod =>
  v === 'upi' || v === 'card' || v === 'cash'

export const methodLabel = (m: PaymentMethod) => PAYMENT_METHODS.find((p) => p.id === m)!.label
