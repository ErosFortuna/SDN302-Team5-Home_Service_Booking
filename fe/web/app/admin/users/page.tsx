import { redirect } from 'next/navigation'

export default function AdminUsersRoute() {
  redirect('/?adminTab=users')
}
