import { redirect } from 'next/navigation'

export default async function AdminUserDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  await params
  redirect('/?adminTab=users')
}
