import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫'
}

export const QUICK_REPLIES = [
  'Sounds good!',
  'What time can you arrive?',
  'Is the price negotiable?',
  'Please share photos',
]
