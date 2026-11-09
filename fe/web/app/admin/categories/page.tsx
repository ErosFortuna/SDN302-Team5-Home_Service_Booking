import { redirect } from 'next/navigation'

export default function AdminCategoriesRoute() {
  redirect('/?adminTab=categories')
}
