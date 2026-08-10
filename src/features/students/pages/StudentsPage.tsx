import { Plus } from 'lucide-react'
import { FoundationPage } from '@/shared/components/navigation/FoundationPage'
import { Button } from '@/shared/components/ui/Button'

export default function StudentsPage() {
  return (
    <FoundationPage
      title="Alunos"
      domain="Primeiro modulo real planejado para a Fase 3."
      action={
        <Button leftIcon={<Plus className="h-4 w-4" aria-hidden />} variant="secondary" disabled>
          Novo aluno
        </Button>
      }
    />
  )
}
