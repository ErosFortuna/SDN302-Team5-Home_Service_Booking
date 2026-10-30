'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  RefreshCw,
  Sliders,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAvailability } from '@/hooks/use-availability'
import { AvailabilityHeader } from './availability-header'
import { WeeklyScheduleTab } from './weekly-schedule-tab'
import { ExceptionsTab } from './exceptions-tab'
import { SettingsTab } from './settings-tab'
import { SlotPreviewTab } from './slot-preview-tab'

type TabType = 'weekly' | 'exceptions' | 'settings' | 'preview'

export function AvailabilityMainView() {
  const {
    data,
    draftSchedule,
    draftSettings,
    loading,
    saving,
    error,
    successMessage,
    validationErrors,
    hasErrors,
    isDirty,
    updateDay,
    addBreak,
    removeBreak,
    updateBreak,
    copyDayToAllWorkDays,
    applyTemplate,
    updateSettingsField,
    toggleAcceptingQuick,
    addException,
    removeException,
    saveAll,
    reset,
    reload,
    clearError,
  } = useAvailability()

  const [activeTab, setActiveTab] = useState<TabType>('weekly')

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Loader2 className="size-10 animate-spin text-teal-600" />
        <p className="mt-4 font-bold text-slate-700 dark:text-slate-300">
          Đang tải cấu hình lịch làm việc của bạn...
        </p>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
          <AlertTriangle className="size-6" />
        </div>
        <h3 className="mt-4 font-black text-lg text-slate-900 dark:text-white">
          Không thể tải dữ liệu lịch rảnh
        </h3>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{error}</p>
        <button
          type="button"
          onClick={reload}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
        >
          <RefreshCw className="size-3.5" /> Thử lại
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header Banner */}
      <AvailabilityHeader
        settings={draftSettings}
        weeklySchedule={draftSchedule}
        daysOff={data?.daysOff || []}
        isDirty={isDirty}
        saving={saving}
        hasErrors={hasErrors}
        onSave={saveAll}
        onReset={reset}
        onToggleAccepting={toggleAcceptingQuick}
      />

      {/* Floating Alerts */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-500 text-white p-4 shadow-lg animate-fade-in">
          <CheckCircle2 className="size-5 shrink-0" />
          <span className="text-sm font-bold">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-rose-600 text-white p-4 shadow-lg animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-5 shrink-0" />
            <span className="text-sm font-bold">{error}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="text-xs underline font-semibold text-rose-100 hover:text-white"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('weekly')}
          className={cn(
            'inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all',
            activeTab === 'weekly'
              ? 'bg-slate-900 text-white shadow dark:bg-white dark:text-slate-900'
              : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
          )}
        >
          <CalendarDays className="size-4" />
          <span>Lịch định kỳ trong tuần</span>
          {hasErrors && (
            <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('exceptions')}
          className={cn(
            'inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all',
            activeTab === 'exceptions'
              ? 'bg-slate-900 text-white shadow dark:bg-white dark:text-slate-900'
              : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
          )}
        >
          <CalendarOff className="size-4" />
          <span>Ngày nghỉ & Ngoại lệ</span>
          {data?.daysOff && data.daysOff.length > 0 && (
            <span className="rounded-full bg-slate-200 px-2 py-0.2 text-[10px] font-black text-slate-800 dark:bg-slate-800 dark:text-slate-300">
              {data.daysOff.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={cn(
            'inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all',
            activeTab === 'settings'
              ? 'bg-slate-900 text-white shadow dark:bg-white dark:text-slate-900'
              : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
          )}
        >
          <Sliders className="size-4" />
          <span>Cấu hình ca & Di chuyển</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={cn(
            'inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all',
            activeTab === 'preview'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 dark:bg-teal-500 dark:text-slate-950'
              : 'bg-white text-teal-700 hover:bg-teal-50 dark:bg-slate-900 dark:text-teal-400 dark:hover:bg-slate-800'
          )}
        >
          <Eye className="size-4" />
          <span>Xem trước giờ trống thực tế</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'weekly' && (
          <WeeklyScheduleTab
            schedule={draftSchedule}
            validationErrors={validationErrors}
            onUpdateDay={updateDay}
            onAddBreak={addBreak}
            onRemoveBreak={removeBreak}
            onUpdateBreak={updateBreak}
            onCopyDayToAll={copyDayToAllWorkDays}
            onApplyTemplate={applyTemplate}
          />
        )}

        {activeTab === 'exceptions' && (
          <ExceptionsTab
            exceptions={data?.daysOff || []}
            onAddException={addException}
            onRemoveException={removeException}
            saving={saving}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            settings={draftSettings}
            onUpdateSettings={updateSettingsField}
          />
        )}

        {activeTab === 'preview' && (
          <SlotPreviewTab
            defaultDuration={draftSettings?.slotDurationMinutes ?? 60}
          />
        )}
      </div>
    </div>
  )
}

