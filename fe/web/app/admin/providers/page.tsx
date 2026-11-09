import { redirect } from 'next/navigation'

export default function AdminProvidersRoute() {
  redirect('/?adminTab=providers')
}
