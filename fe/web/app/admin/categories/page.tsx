import type { Metadata } from 'next'
import { CategoryManagementPage } from '@/components/admin-categories/category-management-page'
<<<<<<< HEAD
=======
import { ToastProvider } from '@/components/provider-booking/toast'
>>>>>>> development

export const metadata: Metadata = {
  title: 'Danh mục dịch vụ — Admin Console',
  description: 'Tạo, chỉnh sửa và bật/tắt các danh mục dịch vụ của hệ thống.',
}

export default function AdminCategoriesRoute() {
<<<<<<< HEAD
  return <CategoryManagementPage />
=======
  return (
    <ToastProvider>
      <CategoryManagementPage />
    </ToastProvider>
  )
>>>>>>> development
}
