import type { CategoryId } from './types'

export interface Category {
  id: CategoryId
  label: string
  emoji: string
}

export const CATEGORIES: Category[] = [
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

export const CATEGORY = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  CategoryId,
  Category
>

export const isCategoryId = (v: unknown): v is CategoryId =>
  typeof v === 'string' && v in CATEGORY
