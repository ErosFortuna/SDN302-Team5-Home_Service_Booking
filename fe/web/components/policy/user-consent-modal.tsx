'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  FileCheck2,
  CheckCircle2,
  ArrowRight,
  Loader2,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { policyApi, type Policy, POLICY_TYPE_LABELS } from '@/lib/api/policies';
import { authStorage, AUTH_CHANGED_EVENT } from '@/lib/api/client';
import { useToast } from '@/components/provider-booking/toast';
import { cn } from '@/lib/utils';

export function UserConsentModal() {
  const toast = useToast();

  const [pendingPolicies, setPendingPolicies] = useState<Policy[]>([]);
  const [activePolicyIndex, setActivePolicyIndex] = useState(0);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const checkPendingConsents = useCallback(async () => {
    // Only check if user has a valid auth token
    const token = authStorage.getToken();
    if (!token) {
      setIsOpen(false);
      setPendingPolicies([]);
      return;
    }

    try {
      const res = await policyApi.getPendingConsents();
      if (res.required && res.policies.length > 0) {
        setPendingPolicies(res.policies);
        setActivePolicyIndex(0);
        setIsChecked(false);
        setHasScrolledToBottom(false);
        setIsOpen(true);
      } else {
        setIsOpen(false);
        setPendingPolicies([]);
      }
    } catch (err) {
      // Non-blocking error if API fails temporarily
      console.warn('Failed to verify user consents:', err);
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 25;
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  useEffect(() => {
    checkPendingConsents();

    // Re-check when login/logout happens
    window.addEventListener(AUTH_CHANGED_EVENT, checkPendingConsents);
    window.addEventListener('storage', checkPendingConsents);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, checkPendingConsents);
      window.removeEventListener('storage', checkPendingConsents);
    };
  }, [checkPendingConsents]);

  const handleSubmit = async () => {
    if (!isChecked || pendingPolicies.length === 0) return;

    try {
      setSubmitting(true);
      const policyIds = pendingPolicies.map((p) => p._id);
      await policyApi.submitConsent({ policyIds });

      toast.success('Xác nhận chính sách thành công! Cảm ơn bạn.');
      setIsOpen(false);
      setPendingPolicies([]);
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu xác nhận chính sách. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || pendingPolicies.length === 0) return null;

  const currentPolicy = pendingPolicies[activePolicyIndex] || pendingPolicies[0];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start gap-4 border-b border-border pb-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="size-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
              Yêu cầu xác nhận pháp lý bắt buộc
            </div>
            <h2 className="text-xl font-black tracking-tight sm:text-2xl text-foreground">
              Cập nhật Chính sách & Điều khoản dịch vụ
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Hệ thống đã cập nhật văn bản điều khoản mới. Vui lòng đọc kỹ và xác nhận để tiếp tục sử dụng ứng dụng.
            </p>
          </div>
        </div>

        {/* Policy Tabs */}
        {pendingPolicies.length > 1 && (
          <div className="flex border-b border-border pt-3 gap-2 overflow-x-auto">
            {pendingPolicies.map((p, idx) => (
              <button
                key={p._id}
                type="button"
                onClick={() => setActivePolicyIndex(idx)}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap',
                  activePolicyIndex === idx
                    ? 'border-brand text-brand'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <BookOpen className="size-3.5" />
                {POLICY_TYPE_LABELS[p.type] || p.title} ({p.version})
              </button>
            ))}
          </div>
        )}

        {/* Policy Content Viewer */}
        <div className="flex-1 overflow-y-auto py-5 pr-2 space-y-4">
          <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4 text-xs text-muted-foreground">
            <div className="font-bold text-brand mb-1 flex items-center gap-1.5">
              <FileCheck2 className="size-4" />
              {currentPolicy.title} — Phiên bản {currentPolicy.version}
            </div>
            {currentPolicy.summary ? (
              <p>{currentPolicy.summary}</p>
            ) : (
              <p>Phiên bản cập nhật có hiệu lực từ {new Date(currentPolicy.effectiveDate).toLocaleDateString('vi-VN')}.</p>
            )}
          </div>

          <div
            onScroll={handleScroll}
            className="rounded-2xl border border-border bg-background p-6 text-sm leading-relaxed max-h-72 overflow-y-auto prose dark:prose-invert max-w-none shadow-inner"
            dangerouslySetInnerHTML={{ __html: currentPolicy.content }}
          />
          {!hasScrolledToBottom && (
            <p className="text-center text-xs text-amber-600 dark:text-amber-400 font-medium animate-pulse">
              ↓ Vui lòng cuộn xuống cuối văn bản để mở khóa nút xác nhận
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <label
            className={cn(
              'flex items-center gap-3 select-none text-xs text-foreground transition-opacity',
              !hasScrolledToBottom ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            )}
          >
            <input
              type="checkbox"
              disabled={!hasScrolledToBottom}
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="size-5 rounded-md accent-brand cursor-pointer disabled:cursor-not-allowed"
            />
            <span>
              Tôi đã đọc, hiểu rõ và đồng ý với tất cả nội dung trong các văn bản điều khoản trên.
            </span>
          </label>

          <button
            type="button"
            disabled={!hasScrolledToBottom || !isChecked || submitting}
            onClick={handleSubmit}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-brand-foreground shadow-lg shadow-brand/20 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Đang ghi nhận...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" /> Tôi đã đọc & Đồng ý
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
