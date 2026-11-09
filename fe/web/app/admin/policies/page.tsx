import { redirect } from 'next/navigation'

export default function AdminPoliciesRoute() {
  redirect('/?adminTab=policies')
}
