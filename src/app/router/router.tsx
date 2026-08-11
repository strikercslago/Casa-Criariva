import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from '@/app/layouts/RootLayout'
import { allowedRolesForModule } from '@/app/auth/permissions'
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from '@/app/router/AuthGuards'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { ForbiddenPage } from '@/shared/components/feedback/ForbiddenPage'
import { NotFoundPage } from '@/shared/components/feedback/NotFoundPage'
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

function guarded(module: Parameters<typeof allowedRolesForModule>[0], element: JSX.Element) {
  return <RoleRoute allowedRoles={allowedRolesForModule(module)}>{element}</RoleRoute>
}

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
              { path: 'agenda', element: guarded('agenda', <AgendaPage />) },
              { path: 'alunos', element: guarded('students', <StudentsPage />) },
              { path: 'responsaveis', element: guarded('guardians', <GuardiansPage />) },
              { path: 'responsaveis/:guardianId', element: guarded('guardians', <GuardiansPage />) },
              { path: 'turmas', element: guarded('classes', <ClassesPage />) },
              { path: 'turmas/:classId', element: guarded('classes', <ClassesPage />) },
              { path: 'frequencia', element: guarded('attendance', <AttendancePage />) },
              { path: 'mensalidades', element: guarded('billing', <BillingPage />) },
              { path: 'financeiro', element: guarded('finance', <FinancePage />) },
              { path: 'eventos', element: guarded('events', <EventsPage />) },
              { path: 'materiais', element: guarded('materials', <MaterialsPage />) },
              { path: 'ideias', element: <IdeasPage /> },
              { path: 'relatorios', element: guarded('reports', <ReportsPage />) },
              { path: 'configuracoes', element: guarded('settings', <SettingsPage />) },
              { path: 'configuracoes/usuarios', element: guarded('users', <SettingsPage />) },
              { path: 'configuracoes/auditoria', element: guarded('audit', <SettingsPage />) },
              { path: 'configuracoes/seguranca', element: guarded('security', <SettingsPage />) },
              { path: '403', element: <ForbiddenPage /> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
])
