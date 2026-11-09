'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  Eye,
  History,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  policyApi,
  type Policy,
  type PolicyType,
  type UserConsent,
  type PolicyStats,
  type Pagination,
  POLICY_TYPE_LABELS,
} from '@/lib/api/policies';
import { useToast } from '@/components/provider-booking/toast';
import { cn } from '@/lib/utils';

export function PolicyManagementPage() {
  const toast = useToast();

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [stats, setStats] = useState<PolicyStats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [previewPolicy, setPreviewPolicy] = useState<Policy | null>(null);
  const [auditPolicy, setAuditPolicy] = useState<Policy | null>(null);
  const [auditConsents, setAuditConsents] = useState<UserConsent[]>([]);
  const [auditPagination, setAuditPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [auditLoading, setAuditLoading] = useState(false);

  // Form State for Create/New Version
  const [formData, setFormData] = useState({
    title: '',
    type: 'PRIVACY_POLICY' as PolicyType,
    version: 'v1.0',
    summary: '',
    content: '',
    isMandatory: true,
    isActive: true,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [activeTabPreview, setActiveTabPreview] = useState<'edit' | 'preview'>('edit');

  const fetchPolicies = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const res = await policyApi.getAdminPolicies({
        type: selectedType === 'ALL' ? undefined : selectedType,
        isActive: selectedStatus === 'ALL' ? undefined : selectedStatus === 'ACTIVE',
        search: searchQuery.trim() || undefined,
        page,
        limit: 10,
      });
      setPolicies(res.policies);
      setPagination(res.pagination);
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải danh sách chính sách');
    } finally {
      setLoading(false);
    }
  }, [selectedType, selectedStatus, searchQuery, toast]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await policyApi.getAdminPolicyStats();
      setStats(res);
    } catch (err) {
      console.error('Failed to load policy stats', err);
    }
  }, []);

  useEffect(() => {
    fetchPolicies(1);
    fetchStats();
  }, [fetchPolicies, fetchStats]);

  const handleOpenAudit = async (policy: Policy, page = 1) => {
    setAuditPolicy(policy);
    setAuditLoading(true);
    try {
      const res = await policyApi.getAdminPolicyConsents(policy._id, page, 10);
      setAuditConsents(res.consents);
      setAuditPagination(res.pagination);
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải lịch sử xác nhận');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleToggleActive = async (policy: Policy) => {
    const nextStatus = !policy.isActive;
    const confirmMsg = nextStatus
      ? `Kích hoạt phiên bản ${policy.version} sẽ tự động hủy kích hoạt các phiên bản khác cùng loại. Tiếp tục?`
      : `Hủy kích hoạt phiên bản ${policy.version}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await policyApi.updateAdminPolicy(policy._id, { isActive: nextStatus });
      toast.success(`Đã ${nextStatus ? 'kích hoạt' : 'ngừng kích hoạt'} chính sách`);
      fetchPolicies(pagination.page);
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || 'Thao tác thất bại');
    }
  };

  const handleDeletePolicy = async (policy: Policy) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa văn bản "${policy.title}" (phiên bản ${policy.version}) không?`)) {
      return;
    }

    try {
      await policyApi.deleteAdminPolicy(policy._id);
      toast.success(`Đã xóa văn bản ${policy.version} thành công`);
      fetchPolicies(pagination.page);
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa chính sách này');
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.version.trim() || !formData.content.trim()) {
      toast.error('Vui lòng điền đầy đủ tiêu đề, phiên bản và nội dung');
      return;
    }

    try {
      setFormSubmitting(true);
      await policyApi.createAdminPolicy(formData);
      toast.success('Đã tạo văn bản chính sách thành công!');
      setCreateModalOpen(false);
      setFormData({
        title: '',
        type: 'PRIVACY_POLICY',
        version: 'v1.0',
        summary: '',
        content: '',
        isMandatory: true,
        isActive: true,
      });
      fetchPolicies(1);
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi tạo chính sách');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold mb-2">
            <ShieldCheck className="size-4" /> UC-59 & Legal Compliance
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Quản lý Chính sách & Điều khoản
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản trị các phiên bản chính sách bảo mật, điều khoản sử dụng và theo dõi lịch sử người dùng đồng ý (User Consent).
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-brand-foreground shadow hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus className="size-4" /> Soạn văn bản mới
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Tổng số văn bản</span>
            <span className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <FileText className="size-5" />
            </span>
          </div>
          <div className="mt-4 text-3xl font-black">{stats?.totalPolicies ?? 0}</div>
          <p className="mt-1 text-xs text-muted-foreground">Các bản thảo và phiên bản đã tạo</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Đang áp dụng (Active)</span>
            <span className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
            </span>
          </div>
          <div className="mt-4 text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {stats?.activePolicies ?? 0}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Phiên bản có hiệu lực bắt buộc người dùng tuân thủ</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Lượt người dùng đồng ý</span>
            <span className="rounded-xl bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400">
              <History className="size-5" />
            </span>
          </div>
          <div className="mt-4 text-3xl font-black text-purple-600 dark:text-purple-400">
            {stats?.totalConsents ?? 0}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Được lưu kèm địa chỉ IP và dấu thời gian pháp lý</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, phiên bản..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            <option value="ALL">Tất cả loại chính sách</option>
            <option value="PRIVACY_POLICY">Chính sách bảo mật</option>
            <option value="TERMS_OF_SERVICE">Điều khoản sử dụng</option>
            <option value="PROVIDER_CONTRACT">Hợp đồng đối tác</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang kích hoạt</option>
            <option value="INACTIVE">Bản nháp / Cũ</option>
          </select>
        </div>

        <button
          onClick={() => { fetchPolicies(1); fetchStats(); }}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground self-end md:self-center"
        >
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} /> Làm mới
        </button>
      </div>

      {/* Policies Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Tên văn bản & Loại</th>
                <th className="px-4 py-4 text-center">Phiên bản</th>
                <th className="px-4 py-4 text-center">Bắt buộc</th>
                <th className="px-4 py-4 text-center">Trạng thái</th>
                <th className="px-4 py-4">Ngày hiệu lực</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto size-6 animate-spin text-brand mb-2" />
                    Đang tải dữ liệu chính sách...
                  </td>
                </tr>
              ) : policies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <FileText className="mx-auto size-8 text-muted-foreground/50 mb-2" />
                    Chưa có chính sách nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                policies.map((p) => (
                  <tr key={p._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">{p.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {POLICY_TYPE_LABELS[p.type] || p.type}
                        </span>
                        {p.summary && (
                          <span className="text-xs text-muted-foreground line-clamp-1 max-w-sm">
                            — {p.summary}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-center font-mono font-bold">
                      <span className="rounded-md bg-brand/10 text-brand px-2 py-1 text-xs">
                        {p.version}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      {p.isMandatory ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 text-xs font-semibold">
                          Bắt buộc
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                          Tùy chọn
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleToggleActive(p)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all',
                          p.isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-neutral-500/10 text-neutral-500 hover:bg-neutral-500/20'
                        )}
                        title="Bấm để bật/tắt kích hoạt"
                      >
                        <span className={cn('size-2 rounded-full', p.isActive ? 'bg-emerald-500' : 'bg-neutral-400')} />
                        {p.isActive ? 'Đang áp dụng' : 'Bản nháp / Cũ'}
                      </button>
                    </td>

                    <td className="px-4 py-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(p.effectiveDate || p.createdAt).toLocaleDateString('vi-VN')}
                    </td>

                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setPreviewPolicy(p)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted transition-colors"
                        title="Xem nội dung văn bản"
                      >
                        <Eye className="size-3.5" /> Xem
                      </button>
                      <button
                        onClick={() => handleOpenAudit(p)}
                        className="inline-flex items-center gap-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2.5 py-1.5 text-xs font-semibold hover:bg-purple-500/20 transition-colors"
                        title="Lịch sử người dùng đã đồng ý"
                      >
                        <History className="size-3.5" /> Lịch sử ({p.version})
                      </button>
                      <button
                        onClick={() => handleDeletePolicy(p)}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 px-2.5 py-1.5 text-xs font-semibold hover:bg-red-500/20 transition-colors"
                        title="Xóa văn bản này"
                      >
                        <Trash2 className="size-3.5" /> Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-3 bg-muted/20">
            <span className="text-xs text-muted-foreground">
              Trang {pagination.page} / {pagination.totalPages} ({pagination.total} bản ghi)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchPolicies(pagination.page - 1)}
                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchPolicies(pagination.page + 1)}
                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create Policy / New Version */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-black">Soạn thảo Chính sách / Phiên bản mới</h3>
                <p className="text-xs text-muted-foreground">
                  Tạo văn bản pháp lý mới hoặc nâng cấp phiên bản để yêu cầu người dùng xác nhận lại.
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="rounded-xl p-2 hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="flex-1 overflow-y-auto py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Tiêu đề chính sách *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Chính sách bảo mật thông tin người dùng"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Phiên bản *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: v1.1 hoặc v2.0"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Loại văn bản pháp lý *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as PolicyType })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  >
                    <option value="PRIVACY_POLICY">Chính sách bảo mật</option>
                    <option value="TERMS_OF_SERVICE">Điều khoản sử dụng</option>
                    <option value="PROVIDER_CONTRACT">Hợp đồng đối tác</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Bắt buộc đồng ý?</label>
                  <div className="flex items-center h-10 gap-2">
                    <input
                      type="checkbox"
                      id="isMandatory"
                      checked={formData.isMandatory}
                      onChange={(e) => setFormData({ ...formData, isMandatory: e.target.checked })}
                      className="size-4 rounded accent-brand"
                    />
                    <label htmlFor="isMandatory" className="text-xs text-muted-foreground">
                      Bắt buộc xác nhận để tiếp tục
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Kích hoạt ngay?</label>
                  <div className="flex items-center h-10 gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="size-4 rounded accent-brand"
                    />
                    <label htmlFor="isActive" className="text-xs text-muted-foreground">
                      Đặt làm bản áp dụng chính
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Tóm tắt các điểm cập nhật chính</label>
                <input
                  type="text"
                  placeholder="VD: Cập nhật điều khoản bảo vệ vị trí GPS theo tiêu chuẩn mới..."
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
                />
              </div>

              {/* Editor / Preview Tabs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Nội dung văn bản (Hỗ trợ HTML) *</label>
                  <div className="flex rounded-lg border border-border bg-muted p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveTabPreview('edit')}
                      className={cn(
                        'rounded-md px-3 py-1 font-semibold transition-colors',
                        activeTabPreview === 'edit' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                      )}
                    >
                      Soạn thảo HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTabPreview('preview')}
                      className={cn(
                        'rounded-md px-3 py-1 font-semibold transition-colors',
                        activeTabPreview === 'preview' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                      )}
                    >
                      Xem trước
                    </button>
                  </div>
                </div>

                {activeTabPreview === 'edit' ? (
                  <textarea
                    rows={12}
                    required
                    placeholder="<h2>1. Điều khoản...</h2><p>Nội dung...</p>"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full rounded-2xl border border-border bg-background p-4 text-xs font-mono focus:border-brand focus:outline-none leading-relaxed"
                  />
                ) : (
                  <div
                    className="rounded-2xl border border-border bg-card p-6 text-sm max-h-72 overflow-y-auto prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: formData.content || '<p class="text-muted-foreground">Chưa có nội dung để xem trước.</p>' }}
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-xl bg-brand px-6 py-2 text-sm font-bold text-brand-foreground hover:brightness-110 disabled:opacity-50"
                >
                  {formSubmitting ? 'Đang lưu...' : 'Lưu văn bản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Policy Document */}
      {previewPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <span className="text-xs font-bold text-brand uppercase tracking-wider">
                  {POLICY_TYPE_LABELS[previewPolicy.type]} ({previewPolicy.version})
                </span>
                <h3 className="text-xl font-black mt-0.5">{previewPolicy.title}</h3>
                <p className="text-xs text-muted-foreground">
                  Hiệu lực từ: {new Date(previewPolicy.effectiveDate).toLocaleDateString('vi-VN')}
                </p>
              </div>
              <button
                onClick={() => setPreviewPolicy(null)}
                className="rounded-xl p-2 hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div
              className="flex-1 overflow-y-auto py-6 pr-2 text-sm leading-relaxed prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: previewPolicy.content }}
            />

            <div className="border-t border-border pt-4 flex justify-end">
              <button
                onClick={() => setPreviewPolicy(null)}
                className="rounded-xl bg-brand px-5 py-2 text-sm font-bold text-brand-foreground"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer / Modal: View User Consent Audit Log */}
      {auditPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400">
                  <History className="size-4" /> Bằng chứng pháp lý (Consent Audit Trail)
                </div>
                <h3 className="text-lg font-black">
                  Lịch sử đồng ý: {auditPolicy.title} ({auditPolicy.version})
                </h3>
              </div>
              <button
                onClick={() => setAuditPolicy(null)}
                className="rounded-xl p-2 hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {auditLoading ? (
                <div className="py-12 text-center text-muted-foreground">
                  <RefreshCw className="mx-auto size-6 animate-spin text-purple-500 mb-2" />
                  Đang tải nhật ký xác nhận...
                </div>
              ) : auditConsents.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  Chưa có người dùng nào ghi nhận xác nhận cho phiên bản này.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {auditConsents.map((c) => (
                    <div key={c._id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-sm text-foreground">
                          {c.user?.fullName || 'Người dùng'}
                          <span className="ml-2 text-xs font-normal text-muted-foreground font-mono">
                            ({c.user?.email || 'N/A'})
                          </span>
                        </div>
                        <div className="text-muted-foreground mt-0.5">
                          Vai trò: <span className="font-semibold text-foreground">{c.user?.role || 'N/A'}</span> — Phiên bản: <span className="font-semibold">{c.version}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono text-purple-600 dark:text-purple-400 font-semibold">
                          IP: {c.ipAddress || 'Unknown'}
                        </div>
                        <div className="text-muted-foreground text-[11px] mt-0.5">
                          {new Date(c.acceptedAt).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audit Pagination */}
            {auditPagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">
                  Trang {auditPagination.page} / {auditPagination.totalPages} ({auditPagination.total} lượt)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={auditPagination.page <= 1}
                    onClick={() => handleOpenAudit(auditPolicy, auditPagination.page - 1)}
                    className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    disabled={auditPagination.page >= auditPagination.totalPages}
                    onClick={() => handleOpenAudit(auditPolicy, auditPagination.page + 1)}
                    className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
