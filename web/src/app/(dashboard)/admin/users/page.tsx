"use client"

import { UserList } from "@/modules/admin/components/user/user-list"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function UsersPage() {
  return (
    <PageContainer>
      <PageHeader title="Usuários" description="Gerencie os usuários da agência" />
      <UserList />
    </PageContainer>
  )
}
