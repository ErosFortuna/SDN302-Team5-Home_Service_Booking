'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, FileText, Calendar, RefreshCw } from 'lucide-react';
import { policyApi, type Policy, type PolicyType, POLICY_TYPE_LABELS } from '@/lib/api/policies';

const SLUG_TO_TYPE: Record<string, PolicyType> = {
  privacy: 'PRIVACY_POLICY',
  terms: 'TERMS_OF_SERVICE',
  contract: 'PROVIDER_CONTRACT',
};

export default function PublicPolicyPage({ params }: { params: Promise<{ type: string }> }) {
  const resolvedParams = use(params);
  const typeKey = resolvedParams.type.toLowerCase();
  const policyType = SLUG_TO_TYPE[typeKey] || 'PRIVACY_POLICY';

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await policyApi.getActivePolicyByType(policyType);
        setPolicy(data);
      } catch (err: any) {
        setError(err.message || 'Không tìm thấy chính sách tương ứng');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [policyType]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" /> Quay lại trang chủ
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/policies/privacy"
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                policyType === 'PRIVACY_POLICY' ? 'bg-brand/10 text-brand' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Chính sách bảo mật
            </Link>
            <Link
              href="/policies/terms"
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                policyType === 'TERMS_OF_SERVICE' ? 'bg-brand/10 text-brand' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Điều khoản sử dụng
            </Link>
            <Link
              href="/policies/contract"
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                policyType === 'PROVIDER_CONTRACT' ? 'bg-brand/10 text-brand' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Hợp đồng đối tác
            </Link>
          </div>
        </div>
      </header>

      {/* Main Document Content */}
      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-10 sm:px-6">
        {loading ? (
          <div className="py-24 text-center text-muted-foreground">
            <RefreshCw className="mx-auto size-8 animate-spin text-brand mb-3" />
            <p className="text-sm font-semibold">Đang tải văn bản chính sách...</p>
          </div>
        ) : error || !policy ? (
          <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-8 text-center max-w-md mx-auto my-12">
            <ShieldCheck className="mx-auto size-10 text-destructive mb-3" />
            <h2 className="text-lg font-bold">Chưa có bản cập nhật</h2>
            <p className="text-xs text-muted-foreground mt-2">{error}</p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-xl bg-brand px-5 py-2 text-xs font-bold text-brand-foreground"
            >
              Về trang chủ
            </Link>
          </div>
        ) : (
          <article className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-sm space-y-6">
            <div className="border-b border-border pb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold mb-3">
                <ShieldCheck className="size-4" /> {POLICY_TYPE_LABELS[policy.type]} • Phiên bản {policy.version}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {policy.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-3">
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-4 text-muted-foreground/70" />
                  Hiệu lực từ: {new Date(policy.effectiveDate).toLocaleDateString('vi-VN')}
                </span>
                <span>•</span>
                <span>Trạng thái: <strong className="text-emerald-600 dark:text-emerald-400">Đang áp dụng</strong></span>
              </div>
              {policy.summary && (
                <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  <strong className="text-foreground">Tóm tắt cập nhật:</strong> {policy.summary}
                </div>
              )}
            </div>

            {/* Document Body */}
            <div
              className="prose dark:prose-invert max-w-none text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: policy.content }}
            />
          </article>
        )}
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © 2026 HomeHero. Toàn bộ chính sách và điều khoản có giá trị pháp lý ràng buộc.
      </footer>
    </div>
  );
}
