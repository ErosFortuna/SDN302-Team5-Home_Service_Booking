'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  availabilityApi,
  type AvailabilityData,
  type DaySchedule,
  type BreakItem,
  type AvailabilitySettings,
  type ExceptionItem,
} from '@/lib/api/availability'
import { getErrorMessage } from '@/lib/api/client'

export const VIETNAMESE_DAYS: Record<number, string> = {
  0: 'Chủ nhật',
  1: 'Thứ hai',
  2: 'Thứ ba',
  3: 'Thứ tư',
  4: 'Thứ năm',
  5: 'Thứ sáu',
  6: 'Thứ bảy',
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

function timeToMins(t: string): number {
  if (!TIME_REGEX.test(t)) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function validateScheduleLocally(schedule: DaySchedule[]): Record<string, string> {
  const errors: Record<string, string> = {}

  schedule.forEach((day) => {
    const dayLabel = VIETNAMESE_DAYS[day.dayOfWeek] || `Thứ ${day.dayOfWeek}`
    if (day.isOff) return

    if (!TIME_REGEX.test(day.startTime) || !TIME_REGEX.test(day.endTime)) {
      errors[`day_${day.dayOfWeek}`] = `${dayLabel}: Định dạng giờ làm việc không hợp lệ (HH:mm)`
      return
    }

    const startM = timeToMins(day.startTime)
    const endM = timeToMins(day.endTime)

    if (startM >= endM) {
      errors[`day_${day.dayOfWeek}`] = `${dayLabel}: Giờ bắt đầu (${day.startTime}) phải sớm hơn giờ kết thúc (${day.endTime})`
      return
    }

    if (Array.isArray(day.breaks)) {
      for (let i = 0; i < day.breaks.length; i++) {
        const b = day.breaks[i]
        if (!TIME_REGEX.test(b.startTime) || !TIME_REGEX.test(b.endTime)) {
          errors[`day_${day.dayOfWeek}_break_${i}`] = `${dayLabel}: Khoảng nghỉ ${i + 1} có giờ không hợp lệ`
          return
        }
        const bStart = timeToMins(b.startTime)
        const bEnd = timeToMins(b.endTime)
        if (bStart >= bEnd) {
          errors[`day_${day.dayOfWeek}_break_${i}`] = `${dayLabel}: Giờ bắt đầu nghỉ (${b.startTime}) phải trước giờ kết thúc (${b.endTime})`
          return
        }
        if (bStart < startM || bEnd > endM) {
          errors[`day_${day.dayOfWeek}_break_${i}`] = `${dayLabel}: Khoảng nghỉ (${b.startTime}-${b.endTime}) phải nằm trong giờ làm việc (${day.startTime}-${day.endTime})`
          return
        }
      }

      // Check breaks overlapping
      const sorted = [...day.breaks].sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime))
      for (let i = 0; i < sorted.length - 1; i++) {
        if (timeToMins(sorted[i].endTime) > timeToMins(sorted[i + 1].startTime)) {
          errors[`day_${day.dayOfWeek}_breaks_overlap`] = `${dayLabel}: Các khoảng nghỉ (${sorted[i].startTime}-${sorted[i].endTime} và ${sorted[i + 1].startTime}-${sorted[i + 1].endTime}) bị chồng lấn nhau`
          return
        }
      }
    }
  })

  return errors
}

export function useAvailability() {
  const [data, setData] = useState<AvailabilityData | null>(null)
  const [draftSchedule, setDraftSchedule] = useState<DaySchedule[]>([])
  const [draftSettings, setDraftSettings] = useState<AvailabilitySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fetchAvailability = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const res = await availabilityApi.getMine(signal)
      setData(res.data)
      setDraftSchedule(res.data.weeklySchedule)
      setDraftSettings(res.data.settings)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(getErrorMessage(err))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchAvailability(controller.signal)
    return () => controller.abort()
  }, [fetchAvailability])

  // Validation
  const validationErrors = useMemo(
    () => validateScheduleLocally(draftSchedule),
    [draftSchedule]
  )

  const hasErrors = Object.keys(validationErrors).length > 0

  // Dirty state calculation
  const isDirty = useMemo(() => {
    if (!data || !draftSettings) return false
    const scheduleChanged = JSON.stringify(data.weeklySchedule) !== JSON.stringify(draftSchedule)
    const settingsChanged = JSON.stringify(data.settings) !== JSON.stringify(draftSettings)
    return scheduleChanged || settingsChanged
  }, [data, draftSchedule, draftSettings])

  // Actions
  const updateDay = useCallback((dayOfWeek: number, patch: Partial<DaySchedule>) => {
    setDraftSchedule((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d))
    )
  }, [])

  const addBreak = useCallback((dayOfWeek: number) => {
    setDraftSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d
        const newBreak: BreakItem = {
          startTime: '12:00',
          endTime: '13:00',
          note: 'Nghỉ giải lao',
        }
        return {
          ...d,
          breaks: [...(d.breaks || []), newBreak],
        }
      })
    )
  }, [])

  const removeBreak = useCallback((dayOfWeek: number, breakIndex: number) => {
    setDraftSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d
        const nextBreaks = [...d.breaks]
        nextBreaks.splice(breakIndex, 1)
        return { ...d, breaks: nextBreaks }
      })
    )
  }, [])

  const updateBreak = useCallback(
    (dayOfWeek: number, breakIndex: number, field: keyof BreakItem, value: string) => {
      setDraftSchedule((prev) =>
        prev.map((d) => {
          if (d.dayOfWeek !== dayOfWeek) return d
          const nextBreaks = [...d.breaks]
          nextBreaks[breakIndex] = {
            ...nextBreaks[breakIndex],
            [field]: value,
          }
          return { ...d, breaks: nextBreaks }
        })
      )
    },
    []
  )

  const copyDayToAllWorkDays = useCallback((sourceDayOfWeek: number) => {
    setDraftSchedule((prev) => {
      const source = prev.find((d) => d.dayOfWeek === sourceDayOfWeek)
      if (!source) return prev
      return prev.map((d) => {
        // Áp dụng cho các ngày T2 -> T7 (dayOfWeek 1 -> 6)
        if (d.dayOfWeek === 0 || d.dayOfWeek === sourceDayOfWeek) return d
        return {
          ...d,
          isOff: source.isOff,
          startTime: source.startTime,
          endTime: source.endTime,
          breaks: source.breaks.map((b) => ({ ...b })),
        }
      })
    })
  }, [])

  const applyTemplate = useCallback((template: 'office' | 'fullDay' | 'morningOnly') => {
    setDraftSchedule((prev) =>
      prev.map((d) => {
        if (template === 'office') {
          return {
            ...d,
            isOff: d.dayOfWeek === 0, // CN nghỉ
            startTime: '08:00',
            endTime: '17:00',
            breaks: d.dayOfWeek === 0 ? [] : [{ startTime: '12:00', endTime: '13:00', note: 'Nghỉ trưa' }],
          }
        }
        if (template === 'fullDay') {
          return {
            ...d,
            isOff: false,
            startTime: '07:00',
            endTime: '21:00',
            breaks: [
              { startTime: '12:00', endTime: '13:00', note: 'Nghỉ trưa' },
              { startTime: '18:00', endTime: '19:00', note: 'Nghỉ tối' },
            ],
          }
        }
        if (template === 'morningOnly') {
          return {
            ...d,
            isOff: d.dayOfWeek === 0,
            startTime: '08:00',
            endTime: '12:00',
            breaks: [],
          }
        }
        return d
      })
    )
  }, [])

  const updateSettingsField = useCallback((patch: Partial<AvailabilitySettings>) => {
    setDraftSettings((prev) => (prev ? { ...prev, ...patch } : null))
  }, [])

  const toggleAcceptingQuick = useCallback(async () => {
    try {
      const res = await availabilityApi.toggleAccepting()
      setData(res.data)
      setDraftSettings(res.data.settings)
      setSuccessMessage(
        res.data.settings.isAcceptingBookings
          ? 'Đã bật chế độ nhận việc nhanh!'
          : 'Đã tạm ngưng nhận việc.'
      )
      setTimeout(() => setSuccessMessage(null), 3500)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [])

  const addException = useCallback(
    async (payload: {
      date: string
      isFullDayOff: boolean
      customStartTime?: string
      customEndTime?: string
      reason?: string
    }) => {
      setSaving(true)
      setError(null)
      try {
        const res = await availabilityApi.addException(payload)
        setData(res.data)
        setSuccessMessage(`Đã thêm ngày ngoại lệ ${payload.date}`)
        setTimeout(() => setSuccessMessage(null), 3500)
      } catch (err) {
        setError(getErrorMessage(err))
        throw err
      } finally {
        setSaving(false)
      }
    },
    []
  )

  const removeException = useCallback(async (identifier: string) => {
    setSaving(true)
    setError(null)
    try {
      const res = await availabilityApi.removeException(identifier)
      setData(res.data)
      setSuccessMessage('Đã xóa ngày ngoại lệ')
      setTimeout(() => setSuccessMessage(null), 3500)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }, [])

  const saveAll = useCallback(async () => {
    if (hasErrors) {
      const firstError = Object.values(validationErrors)[0]
      setError(firstError || 'Vui lòng kiểm tra lại giờ làm việc và các khoảng nghỉ')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await availabilityApi.updateMine({
        weeklySchedule: draftSchedule,
        settings: draftSettings ?? undefined,
      })
      setData(res.data)
      setDraftSchedule(res.data.weeklySchedule)
      setDraftSettings(res.data.settings)
      setSuccessMessage('Lưu cài đặt lịch làm việc thành công!')
      setTimeout(() => setSuccessMessage(null), 3500)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }, [draftSchedule, draftSettings, hasErrors, validationErrors])

  const reset = useCallback(() => {
    if (data) {
      setDraftSchedule(data.weeklySchedule)
      setDraftSettings(data.settings)
      setError(null)
    }
  }, [data])

  return {
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
    reload: () => fetchAvailability(),
    clearError: () => setError(null),
  }
}

