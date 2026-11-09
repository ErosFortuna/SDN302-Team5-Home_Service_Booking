import {
  Bug,
  Droplets,
  Hammer,
  House,
  KeyRound,
  Leaf,
  Paintbrush,
  Plug,
  Shield,
  Snowflake,
  Sparkles,
  Truck,
  Tv,
  WashingMachine,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CategoryIcon as CategoryIconKey, PricingMode } from '@/lib/api/categories'

export const CATEGORY_ICON_MAP: Record<CategoryIconKey, LucideIcon> = {
  wrench: Wrench,
  droplets: Droplets,
  zap: Zap,
  snowflake: Snowflake,
  sparkles: Sparkles,
  paintbrush: Paintbrush,
  key: KeyRound,
  hammer: Hammer,
  plug: Plug,
  'washing-machine': WashingMachine,
  truck: Truck,
  leaf: Leaf,
  bug: Bug,
  shield: Shield,
  home: House,
  tv: Tv,
}

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICON_MAP) as CategoryIconKey[]

export const PRICING_MODE_META: Record<PricingMode, { label: string; short: string; hint: string; badge: string; accent: string }> = {
  FIXED: {
    label: 'Giá cố định',
    short: 'Cố định',
    hint: 'Khách thấy giá ngay và đặt lịch tức thì.',
    badge: 'bg-sky-500/10 text-sky-700 ring-sky-500/30 dark:text-sky-300',
    accent: 'from-sky-500 to-indigo-500',
  },
}

export function CategoryIcon({ icon, className }: { icon?: CategoryIconKey; className?: string }) {
  const Icon = (icon && CATEGORY_ICON_MAP[icon]) || Wrench
  return <Icon className={cn('size-5', className)} />
}

export function PricingModeBadge({ mode, className }: { mode: PricingMode; className?: string }) {
  const meta = PRICING_MODE_META[mode]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset', meta.badge, className)}>
      {meta.short}
    </span>
  )
}
