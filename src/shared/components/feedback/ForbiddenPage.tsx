import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/ui/Button'

export function ForbiddenPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center">
      <div className="rounded-md border border-warning/30 bg-warning/10 p-6">
        <ShieldAlert className="h-8 w-8 text-amber-700" aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold text-foreground">Acesso nao autorizado</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Sua conta esta autenticada, mas nao possui permissao para acessar esta area.
        </p>
        <Link to="/">
          <Button className="mt-5" variant="secondary">Voltar ao inicio</Button>
        </Link>
      </div>
    </section>
  )
}
