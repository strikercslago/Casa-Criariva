import { SearchX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/ui/Button'

export function NotFoundPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center">
      <div className="rounded-md border border-border bg-surface p-6 shadow-subtle">
        <SearchX className="h-8 w-8 text-muted-foreground" aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold text-foreground">Pagina nao encontrada</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          O endereco pode ter mudado ou a pagina nao existe nesta aplicacao.
        </p>
        <Link to="/">
          <Button className="mt-5" variant="secondary">Voltar ao inicio</Button>
        </Link>
      </div>
    </section>
  )
}
