import { redirect } from 'next/navigation'

export default function AdminRoute() {
  redirect('/?adminTab=dashboard')
}
