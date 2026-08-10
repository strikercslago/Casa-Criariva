import { Suspense, useMemo, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Menu, Palette, Search, ShieldCheck } from 'lucide-react'
import { routePreloaders } from '@/app/router/routePreloaders'
import { useAuth } from '@/app/providers/AuthProvider'
import { Badge } from '@/shared/components/ui/Badge'
import { IconButton } from '@/shared/components/ui/IconButton'
import { RouteSkeleton } from '@/shared/components/feedback/RouteSkeleton'
import { navigationItems } from '@/shared/constants/navigation'
import { cn } from '@/shared/utils/cn'

const preloadByPath = new Map([
  ['/', routePreloaders.dashboard],
  ['/agenda', routePreloaders.agenda],
  ['/alunos', routePreloaders.students],
  ['/responsaveis', routePreloaders.guardians],
  ['/turmas', routePreloaders.classes],
  ['/frequencia', routePreloaders.attendance],
  ['/mensalidades', routePreloaders.billing],
  ['/financeiro', routePreloaders.finance],
  ['/eventos', routePreloaders.events],
  ['/materiais', routePreloaders.materials],
  ['/ideias', routePreloaders.ideas],
  ['/relatorios', routePreloaders.reports],
  ['/configuracoes', routePreloaders.settings],
])

export function RootLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const auth = useAuth()
  const statusLabel = useMemo(() => {
    if (auth.status === 'unconfigured') {
      return 'Supabase pendente'
    }

    if (auth.status === 'authenticated') {
      return 'Sessao ativa'
    }

    if (auth.status === 'checking') {
      return 'Validando'
    }

    return 'Acesso local'
  }, [auth.status])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
          <IconButton
            className="lg:hidden"
            label="Abrir menu"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </IconButton>

          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Palette className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Casa Criativa Gestao</p>
              <p className="truncate text-xs text-muted-foreground">Fundacao operacional V2</p>
            </div>
          </div>

          <div className="ml-auto hidden min-w-72 items-center rounded border border-border bg-background px-3 py-2 text-sm text-muted-foreground shadow-subtle md:flex">
            <Search className="mr-2 h-4 w-4" aria-hidden />
            Busca global preparada
          </div>

          <Badge tone={auth.status === 'error' ? 'danger' : 'primary'}>{statusLabel}</Badge>
          <ShieldCheck className="hidden h-5 w-5 text-primary sm:block" aria-hidden />
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-border bg-surface lg:block">
          <SidebarContent />
        </aside>

        {isMobileMenuOpen ? (
          <div
            className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden"
            role="presentation"
            onMouseDown={() => setIsMobileMenuOpen(false)}
          >
            <aside
              className="h-full w-72 max-w-[85vw] border-r border-border bg-surface shadow-elevated"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <SidebarContent onNavigate={() => setIsMobileMenuOpen(false)} />
            </aside>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 px-4 py-5 md:px-6 lg:px-8">
          <Suspense fallback={<RouteSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto p-3" aria-label="Navegacao principal">
      {navigationItems.map((item) => (
        <NavLink
          className={({ isActive }) =>
            cn(
              'flex min-h-10 items-center gap-3 rounded px-3 py-2 text-sm font-medium text-muted-foreground transition-colors',
              'hover:bg-muted hover:text-foreground',
              isActive && 'bg-primary/10 text-primary',
            )
          }
          end={item.path === '/'}
          key={item.path}
          onClick={onNavigate}
          onFocus={() => void preloadByPath.get(item.path)?.()}
          onMouseEnter={() => void preloadByPath.get(item.path)?.()}
          to={item.path}
        >
          <item.icon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
