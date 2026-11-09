import { redirect } from 'next/navigation'

export default function AdminDashboardRoute() {
  redirect('/?adminTab=dashboard')
}
