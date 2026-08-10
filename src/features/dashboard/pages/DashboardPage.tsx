import { useEffect } from 'react'
import { CalendarDays, CreditCard, GraduationCap, PartyPopper } from 'lucide-react'
import { logAuthDiagnostic } from '@/lib/monitoring/authDiagnostics'
import { PageHeader } from '@/shared/components/navigation/PageHeader'
import { Badge } from '@/shared/components/ui/Badge'
import { Card } from '@/shared/components/ui/Card'
import { moduleGroups } from '@/shared/constants/navigation'

const foundationStats = [
  { label: 'Rotas preparadas', value: '13', icon: CalendarDays },
  { label: 'Dominios mapeados', value: '12', icon: GraduationCap },
  { label: 'Estados base', value: '4', icon: CreditCard },
  { label: 'Docs iniciais', value: '5', icon: PartyPopper },
]

export default function DashboardPage() {
  useEffect(() => {
    logAuthDiagnostic('F.dashboard', 'render')
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inicio"
        description="Painel base da V2 com app shell persistente, navegacao por dominio e fundacao preparada para Auth, Supabase e cache."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo da fundacao">
        {foundationStats.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-primary">
                <stat.icon className="h-5 w-5" aria-hidden />
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border border-border bg-surface p-4 shadow-subtle">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Mapa de modulos</h2>
            <Badge tone="success">Fase 1</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {moduleGroups.map((group) => (
              <div className="rounded border border-border bg-background p-3" key={group.title}>
                <h3 className="text-sm font-semibold">{group.title}</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {group.modules.map((module) => (
                    <li className="flex items-center gap-2" key={module}>
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      {module}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface p-4 shadow-subtle">
          <h2 className="text-base font-semibold">Orcamento de performance</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Rotas ja carregadas</dt>
              <dd className="font-semibold">&lt; 100 ms visual</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Feedback de clique</dt>
              <dd className="font-semibold">&lt; 100 ms</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Bundle inicial</dt>
              <dd className="font-semibold">&lt; 250 KB gzip</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  )
}
