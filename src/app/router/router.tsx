import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from '@/app/layouts/RootLayout'
import { ProtectedRoute, PublicOnlyRoute } from '@/app/router/AuthGuards'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { routePreloaders } from './routePreloaders'

const LoginPage = lazy(routePreloaders.login)
const DashboardPage = lazy(routePreloaders.dashboard)
const AgendaPage = lazy(routePreloaders.agenda)
const StudentsPage = lazy(routePreloaders.students)
const GuardiansPage = lazy(routePreloaders.guardians)
const ClassesPage = lazy(routePreloaders.classes)
const AttendancePage = lazy(routePreloaders.attendance)
const BillingPage = lazy(routePreloaders.billing)
const FinancePage = lazy(routePreloaders.finance)
const EventsPage = lazy(routePreloaders.events)
const MaterialsPage = lazy(routePreloaders.materials)
const IdeasPage = lazy(routePreloaders.ideas)
const ReportsPage = lazy(routePreloaders.reports)
const SettingsPage = lazy(routePreloaders.settings)

export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: (
      <main className="min-h-screen bg-background p-6">
        <ErrorState title="Pagina indisponivel." />
      </main>
    ),
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [{ path: 'login', element: <LoginPage /> }],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <RootLayout />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'agenda', element: <AgendaPage /> },
              { path: 'alunos', element: <StudentsPage /> },
              { path: 'responsaveis', element: <GuardiansPage /> },
              { path: 'responsaveis/:guardianId', element: <GuardiansPage /> },
              { path: 'turmas', element: <ClassesPage /> },
              { path: 'frequencia', element: <AttendancePage /> },
              { path: 'mensalidades', element: <BillingPage /> },
              { path: 'financeiro', element: <FinancePage /> },
              { path: 'eventos', element: <EventsPage /> },
              { path: 'materiais', element: <MaterialsPage /> },
              { path: 'ideias', element: <IdeasPage /> },
              { path: 'relatorios', element: <ReportsPage /> },
              { path: 'configuracoes', element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
])
