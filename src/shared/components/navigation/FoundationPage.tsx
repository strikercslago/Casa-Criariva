import type { ReactNode } from 'react'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { PageHeader } from '@/shared/components/navigation/PageHeader'

type FoundationPageProps = {
  title: string
  domain: string
  action?: ReactNode
}

export function FoundationPage({ title, domain, action }: FoundationPageProps) {
  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        description={`${domain} A rota ja existe na arquitetura, mas a regra de negocio sera implementada em fase propria.`}
        actions={action}
      />
      <EmptyState
        title="Modulo aguardando fase de implementacao"
        description="A fundacao esta pronta para receber queries, formularios, validacoes, estados vazios, erros e testes sem remontar o shell principal."
      />
    </div>
  )
}
