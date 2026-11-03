'use client'

import { Search, MapPin, ChevronRight, ArrowRight } from 'lucide-react'
import { useApp } from '../app-store'
import { CATEGORIES, PROVIDERS } from '@/lib/data'
import {
  Avatar,
  CategoryIcon,
  CtaButton,
  Stars,
} from '../shared'

export function HomeScreen() {
  const { openBookingFlow, setCustomerTab } = useApp()
  const topRated = [...PROVIDERS].sort((a, b) => b.rating - a.rating)

  return (
    <div className="flex flex-col gap-5 px-4 pb-6 pt-4">
      {/* Greeting */}
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <p className="text-sm text-muted-foreground">Good morning,</p>
          <h1 className="text-xl font-extrabold tracking-tight">Alex Tran</h1>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          <MapPin className="size-3.5 text-brand" />
          District 1
        </span>
      </div>

      {/* Search */}
      <button
        onClick={() => openBookingFlow()}
        className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left shadow-sm transition-shadow hover:shadow-md animate-fade-up"
      >
        <Search className="size-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Find cleaning, plumbing, AC repair...
        </span>
      </button>

      {/* Categories */}
      <div className="animate-fade-up">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Categories</h2>
        </div>
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.name}
              onClick={() => openBookingFlow(c.name)}
              className="flex min-w-[76px] flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <CategoryIcon category={c.name} className="size-11" />
              <span className="text-xs font-semibold">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Promo banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-teal-500 to-teal-600 p-5 text-white shadow-lg animate-fade-up">
        <div className="absolute -right-8 -top-10 size-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 -right-2 size-28 rounded-full bg-white/10" />
        <div className="relative">
          <span className="inline-block rounded-full bg-cta px-2.5 py-1 text-[11px] font-extrabold text-cta-foreground">
            LIMITED OFFER
          </span>
          <h3 className="mt-3 text-lg font-extrabold leading-tight">
            30% off your first
            <br />
            home cleaning
          </h3>
          <p className="mt-1 text-sm text-white/80">
            Trusted pros, transparent pricing.
          </p>
          <CtaButton
            onClick={() => openBookingFlow('Cleaning')}
            className="mt-4"
          >
            Book Now
            <ArrowRight className="size-4" />
          </CtaButton>
        </div>
      </div>

      {/* Top rated */}
      <div className="animate-fade-up">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Top-rated nearby</h2>
          <button
            onClick={() => setCustomerTab('bookings')}
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand"
          >
            See all
            <ChevronRight className="size-3.5" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {topRated.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
            >
              <Avatar
                initials={p.avatar}
                className="size-12 shrink-0"
                color="bg-secondary text-secondary-foreground"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-bold">{p.name}</p>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {p.tagline}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Stars rating={p.rating} className="text-foreground" />
                  <span>({p.reviews})</span>
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin className="size-3" />
                    {p.distanceKm} km
                  </span>
                </div>
              </div>
              <button
                onClick={() => openBookingFlow(p.category)}
                className="shrink-0 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-brand-foreground transition-transform active:scale-95"
              >
                Book
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
