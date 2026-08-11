import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { KeyRound, Plus, Save, ShieldCheck, UserX } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { permissionMatrix, roleLabels } from '@/app/auth/permissions'
import { appLocalization } from '@/app/config/localization'
import type { AppRole } from '@/lib/supabase/types'
import { getSupabaseClient } from '@/lib/supabase/client'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { RouteSkeleton } from '@/shared/components/feedback/RouteSkeleton'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Table, Td, Th } from '@/shared/components/ui/Table'
import {
  deactivateAdminUser,
  getApplicationSettings,
  inviteAdminUser,
  listAdminUsers,
  listAuditEvents,
  updateAdminUserRole,
  updateApplicationSettings,
  type ApplicationSettings,
} from '../api/settingsApi'
import { settingsKeys } from '../hooks/settingsKeys'

const settingsTabs = [
  { label: 'Geral', path: '/configuracoes' },
  { label: 'Seguranca', path: '/configuracoes/seguranca' },
  { label: 'Usuarios', path: '/configuracoes/usuarios', ownerOnly: true },
  { label: 'Auditoria', path: '/configuracoes/auditoria', ownerOnly: true },
]

const roles: AppRole[] = ['owner', 'admin', 'teacher']

export default function SettingsPage() {
  const location = useLocation()
  const auth = useAuth()
  const activePath = location.pathname
  const isOwner = auth.roles.includes('owner')
  const visibleTabs = settingsTabs.filter((tab) => !tab.ownerOnly || isOwner)

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Administracao</p>
        <h1 className="text-2xl font-semibold text-foreground">Configuracoes</h1>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Configuracoes">
        {visibleTabs.map((tab) => (
          <Link
            className={[
              'rounded border px-3 py-2 text-sm font-medium transition-colors',
              activePath === tab.path
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-surface text-muted-foreground hover:bg-muted',
            ].join(' ')}
            key={tab.path}
            to={tab.path}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activePath === '/configuracoes/usuarios' ? <UsersSettings /> : null}
      {activePath === '/configuracoes/auditoria' ? <AuditSettings /> : null}
      {activePath === '/configuracoes/seguranca' ? <SecuritySettings /> : null}
      {activePath === '/configuracoes' ? <GeneralSettings isOwner={isOwner} /> : null}
    </div>
  )
}

function GeneralSettings({ isOwner }: { isOwner: boolean }) {
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({
    queryKey: settingsKeys.application(),
    queryFn: getApplicationSettings,
  })
  const [draft, setDraft] = useState<Partial<ApplicationSettings>>({})
  const settings = settingsQuery.data
  const updateMutation = useMutation({
    mutationFn: updateApplicationSettings,
    onSuccess: (data) => {
      setDraft({})
      queryClient.setQueryData(settingsKeys.application(), data)
    },
  })
  const values = { ...settings, ...draft } as ApplicationSettings

  if (settingsQuery.isLoading) {
    return <RouteSkeleton />
  }

  if (settingsQuery.error || !settings) {
    return <ErrorState title="Nao foi possivel carregar configuracoes." />
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-md border border-border bg-surface p-4 shadow-subtle">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Organizacao</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Timezone, locale e moeda sao centralizados e consumidos pela aplicacao.
            </p>
          </div>
          <Badge tone={isOwner ? 'primary' : 'neutral'}>{isOwner ? 'Editavel' : 'Leitura'}</Badge>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Input
            disabled={!isOwner}
            label="Nome"
            value={values.organization_name}
            onChange={(event) => setDraft((current) => ({ ...current, organization_name: event.target.value }))}
          />
          <Input
            disabled={!isOwner}
            label="Nome de exibicao"
            value={values.display_name}
            onChange={(event) => setDraft((current) => ({ ...current, display_name: event.target.value }))}
          />
          <Input
            disabled={!isOwner}
            label="Telefone"
            value={values.phone ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
          />
          <Input
            disabled={!isOwner}
            label="Email"
            type="email"
            value={values.email ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
          />
          <Input disabled label="Timezone" value={values.timezone} />
          <Input disabled label="Locale" value={values.locale} />
          <Input disabled label="Moeda" value={values.currency_code} />
          <Input
            disabled={!isOwner}
            label="Tamanho de pagina"
            min={5}
            max={100}
            type="number"
            value={values.default_page_size}
            onChange={(event) =>
              setDraft((current) => ({ ...current, default_page_size: Number(event.target.value) }))
            }
          />
        </div>

        {updateMutation.error ? (
          <p className="mt-4 text-sm font-medium text-danger">Nao foi possivel salvar as configuracoes.</p>
        ) : null}

        {isOwner ? (
          <Button
            className="mt-5"
            isLoading={updateMutation.isPending}
            leftIcon={<Save className="h-4 w-4" aria-hidden />}
            onClick={() => updateMutation.mutate(draft)}
          >
            Salvar
          </Button>
        ) : null}
      </div>

      <PermissionMatrix />
    </section>
  )
}

function PermissionMatrix() {
  return (
    <section className="rounded-md border border-border bg-surface p-4 shadow-subtle">
      <h2 className="text-lg font-semibold">Matriz de permissoes</h2>
      <Table className="mt-4">
        <thead>
          <tr>
            <Th>Modulo</Th>
            <Th>Owner</Th>
            <Th>Admin</Th>
            <Th>Teacher</Th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(permissionMatrix).map(([module, levels]) => (
            <tr key={module}>
              <Td className="font-medium text-foreground">{module}</Td>
              <Td>{levels.owner}</Td>
              <Td>{levels.admin}</Td>
              <Td>{levels.teacher}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </section>
  )
}

function UsersSettings() {
  const queryClient = useQueryClient()
  const usersQuery = useQuery({
    queryKey: settingsKeys.users(),
    queryFn: listAdminUsers,
  })
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<AppRole>('teacher')
  const inviteMutation = useMutation({
    mutationFn: inviteAdminUser,
    onSuccess: () => {
      setEmail('')
      setFullName('')
      setRole('teacher')
      void queryClient.invalidateQueries({ queryKey: settingsKeys.users() })
    },
  })
  const roleMutation = useMutation({
    mutationFn: updateAdminUserRole,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: settingsKeys.users() }),
  })
  const deactivateMutation = useMutation({
    mutationFn: deactivateAdminUser,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: settingsKeys.users() }),
  })
  const users = usersQuery.data?.users ?? []

  return (
    <section className="grid gap-5">
      <div className="rounded-md border border-border bg-surface p-4 shadow-subtle">
        <h2 className="text-lg font-semibold">Adicionar usuario</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_180px_auto]">
          <Input label="Nome" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          <Input
            autoComplete="email"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            <span>Papel</span>
            <select
              className="h-10 rounded border border-border bg-surface px-3 text-sm shadow-subtle"
              value={role}
              onChange={(event) => setRole(event.target.value as AppRole)}
            >
              {roles.map((item) => (
                <option key={item} value={item}>{roleLabels[item]}</option>
              ))}
            </select>
          </label>
          <Button
            className="self-end"
            disabled={!email || !fullName}
            isLoading={inviteMutation.isPending}
            leftIcon={<Plus className="h-4 w-4" aria-hidden />}
            onClick={() => inviteMutation.mutate({ email, fullName, role })}
          >
            Convidar
          </Button>
        </div>
        {inviteMutation.error ? (
          <p className="mt-3 text-sm font-medium text-danger">Nao foi possivel enviar o convite.</p>
        ) : null}
      </div>

      <div className="rounded-md border border-border bg-surface p-4 shadow-subtle">
        <h2 className="text-lg font-semibold">Usuarios</h2>
        {usersQuery.isLoading ? <RouteSkeleton /> : null}
        {usersQuery.error ? <ErrorState title="Nao foi possivel listar usuarios." /> : null}
        {!usersQuery.isLoading && !usersQuery.error ? (
          <Table className="mt-4">
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>Email</Th>
                <Th>Papel</Th>
                <Th>Status</Th>
                <Th>Ultimo acesso</Th>
                <Th>Acoes</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <Td className="font-medium text-foreground">{user.full_name || '-'}</Td>
                  <Td>{user.email}</Td>
                  <Td>
                    <select
                      className="h-9 rounded border border-border bg-surface px-2 text-sm text-foreground"
                      value={user.roles[0] ?? 'teacher'}
                      onChange={(event) =>
                        roleMutation.mutate({ userId: user.id, role: event.target.value as AppRole })
                      }
                    >
                      {roles.map((item) => (
                        <option key={item} value={item}>{roleLabels[item]}</option>
                      ))}
                    </select>
                  </Td>
                  <Td>
                    <Badge tone={user.is_active ? 'success' : 'warning'}>
                      {user.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </Td>
                  <Td>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString(appLocalization.locale) : '-'}</Td>
                  <Td>
                    <Button
                      disabled={!user.is_active}
                      isLoading={deactivateMutation.isPending}
                      leftIcon={<UserX className="h-4 w-4" aria-hidden />}
                      size="sm"
                      variant="danger"
                      onClick={() => deactivateMutation.mutate(user.id)}
                    >
                      Desativar
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </div>
    </section>
  )
}

function AuditSettings() {
  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const filters = useMemo(() => ({ action, entityType, page: 1 }), [action, entityType])
  const auditQuery = useQuery({
    queryKey: settingsKeys.audit(filters),
    queryFn: () => listAuditEvents(filters),
  })

  return (
    <section className="rounded-md border border-border bg-surface p-4 shadow-subtle">
      <h2 className="text-lg font-semibold">Auditoria administrativa</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Input label="Acao" value={action} onChange={(event) => setAction(event.target.value)} />
        <Input label="Entidade" value={entityType} onChange={(event) => setEntityType(event.target.value)} />
      </div>
      {auditQuery.isLoading ? <RouteSkeleton /> : null}
      {auditQuery.error ? <ErrorState title="Nao foi possivel carregar auditoria." /> : null}
      {auditQuery.data ? (
        <Table className="mt-4">
          <thead>
            <tr>
              <Th>Data</Th>
              <Th>Usuario</Th>
              <Th>Acao</Th>
              <Th>Entidade</Th>
              <Th>Resumo</Th>
            </tr>
          </thead>
          <tbody>
            {auditQuery.data.map((event) => (
              <tr key={event.id}>
                <Td>{new Date(event.created_at).toLocaleString(appLocalization.locale)}</Td>
                <Td>{event.actor_name}</Td>
                <Td>{event.action}</Td>
                <Td>{event.entity_type}</Td>
                <Td>{event.summary}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}
    </section>
  )
}

function SecuritySettings() {
  const supabase = getSupabaseClient()
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const factorsQuery = useQuery({
    queryKey: ['mfa', 'factors'],
    queryFn: async () => {
      if (!supabase) {
        throw new Error('Supabase nao configurado.')
      }

      const { data, error } = await supabase.auth.mfa.listFactors()

      if (error) {
        throw error
      }

      return data
    },
  })
  const aalQuery = useQuery({
    queryKey: ['mfa', 'aal'],
    queryFn: async () => {
      if (!supabase) {
        throw new Error('Supabase nao configurado.')
      }

      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

      if (error) {
        throw error
      }

      return data
    },
  })
  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!supabase) {
        throw new Error('Supabase nao configurado.')
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Casa Criativa',
      })

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: (data) => {
      setFactorId(data.id)
      setQrCode(`data:image/svg+xml;utf-8,${encodeURIComponent(data.totp.qr_code)}`)
    },
  })
  const verifyMutation = useMutation({
    mutationFn: async () => {
      if (!supabase || !factorId) {
        throw new Error('Fator MFA nao iniciado.')
      }

      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      setCode('')
      setQrCode(null)
      setFactorId(null)
      void factorsQuery.refetch()
      void aalQuery.refetch()
    },
  })
  const hasVerifiedTotp = Boolean(factorsQuery.data?.totp.length)

  return (
    <section className="rounded-md border border-border bg-surface p-4 shadow-subtle">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Autenticacao em duas etapas</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Use um aplicativo autenticador para elevar a sessao quando uma conta possuir fator verificado.
          </p>
        </div>
        <Badge tone={hasVerifiedTotp ? 'success' : 'warning'}>
          {hasVerifiedTotp ? 'Ativa' : 'Nao configurada'}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
        <p>AAL atual: {aalQuery.data?.currentLevel ?? '-'}</p>
        <p>Proximo AAL: {aalQuery.data?.nextLevel ?? '-'}</p>
      </div>

      {!qrCode ? (
        <Button
          className="mt-5"
          isLoading={enrollMutation.isPending}
          leftIcon={<ShieldCheck className="h-4 w-4" aria-hidden />}
          onClick={() => enrollMutation.mutate()}
        >
          Ativar
        </Button>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr]">
          <img alt="QR Code MFA" className="h-52 w-52 rounded border border-border bg-white p-2" src={qrCode} />
          <div className="grid content-start gap-4">
            <Input
              autoComplete="one-time-code"
              inputMode="numeric"
              label="Codigo autenticador"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <Button
              disabled={code.length < 6}
              isLoading={verifyMutation.isPending}
              leftIcon={<KeyRound className="h-4 w-4" aria-hidden />}
              onClick={() => verifyMutation.mutate()}
            >
              Verificar
            </Button>
          </div>
        </div>
      )}

      {enrollMutation.error || verifyMutation.error ? (
        <p className="mt-4 text-sm font-medium text-danger">Nao foi possivel concluir o fluxo MFA.</p>
      ) : null}
    </section>
  )
}
