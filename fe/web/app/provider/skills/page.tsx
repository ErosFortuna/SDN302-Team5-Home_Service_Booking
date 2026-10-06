import type { Metadata } from 'next'
import { MySkillsPage } from '@/components/provider-skills/my-skills-page'

export const metadata: Metadata = {
  title: 'Kỹ năng của tôi — Provider Workspace',
  description: 'Chọn các dịch vụ bạn có thể thực hiện để nhận yêu cầu phù hợp.',
}

export default function ProviderSkillsRoute() {
  return <MySkillsPage />
}
