import { redirect } from 'next/navigation'

export default function NewAdminUserRoute() {
  redirect('/?adminTab=users')
}
