import { PolicyManagementPage } from '@/components/admin-policies/policy-management-page';

export const metadata = {
  title: 'Quản lý Chính sách & Điều khoản (UC-59) — HomeHero Admin',
  description: 'Quản trị các phiên bản chính sách bảo mật, điều khoản sử dụng và hợp đồng đối tác.',
};

export default function AdminPoliciesPage() {
  return <PolicyManagementPage />;
}
