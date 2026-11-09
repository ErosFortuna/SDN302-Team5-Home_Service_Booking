import { redirect } from 'next/navigation'

export default function AdminReportsRoute() {
  redirect('/?adminTab=reports')
}
