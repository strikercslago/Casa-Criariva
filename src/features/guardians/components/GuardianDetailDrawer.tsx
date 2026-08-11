import { zodResolver } from '@hookform/resolvers/zod'
import { ArchiveX, Copy, Link as LinkIcon, MessageCircle, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { useToast } from '@/shared/components/feedback/Toast'
import { Button } from '@/shared/components/ui/Button'
import { Overlay } from '@/shared/components/ui/Overlay'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { TabButton, Tabs } from '@/shared/components/ui/Tabs'
import { GuardianContactFields } from '@/features/guardians/components/GuardianContactFields'
import { GuardianRelationshipForm } from '@/features/guardians/components/GuardianRelationshipForm'
import { GuardianRoleBadges } from '@/features/guardians/components/GuardianRoleBadges'
import {
  guardianContactSchema,
  type GuardianContactValues,
} from '@/features/guardians/schemas/guardianSchema'
import type { GuardianStudentLink } from '@/features/guardians/types/guardianTypes'
import {
  useGuardianDetail,
  useUnlinkGuardianStudent,
  useUpdateGuardianContact,
} from '@/features/guardians/hooks/useGuardians'
import {
  getGuardianContactLabel,
  normalizePhoneForWhatsApp,
} from '@/features/guardians/utils/guardianFormat'
import { formatStudentDate } from '@/features/students/utils/studentDates'

type GuardianDetailDrawerProps = {
  guardianId: string | null
  onClose: () => void
}

export function GuardianDetailDrawer({ guardianId, onClose }: GuardianDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isEditingContact, setIsEditingContact] = useState(false)
  const [isLinkingStudent, setIsLinkingStudent] = useState(false)
  const [editingLink, setEditingLink] = useState<GuardianStudentLink | null>(null)
  const [unlinkingLink, setUnlinkingLink] = useState<GuardianStudentLink | null>(null)
  const guardianQuery = useGuardianDetail(guardianId)
  const unlinkMutation = useUnlinkGuardianStudent(guardianId ?? '')
  const navigate = useNavigate()
  const { notify } = useToast()
  const guardian = guardianQuery.data
  const whatsapp = normalizePhoneForWhatsApp(guardian?.phone ?? null)

  function handleClose() {
    setIsEditingContact(false)
    setIsLinkingStudent(false)
    setEditingLink(null)
    setUnlinkingLink(null)
    onClose()
  }

  function copyPhone() {
    if (!guardian?.phone) {
      return
    }

    void navigator.clipboard?.writeText(guardian.phone)
    notify({ title: 'Telefone copiado.', tone: 'success' })
  }

  async function confirmUnlink() {
    if (!unlinkingLink) {
      return
    }

    try {
      await unlinkMutation.mutateAsync(unlinkingLink.student_id)
      notify({ title: 'Responsavel desvinculado.', tone: 'success' })
      setUnlinkingLink(null)
    } catch (error) {
      notify({
        title: 'Nao foi possivel salvar as alteracoes.',
        description: getUserSafeErrorMessage(error),
        tone: 'error',
      })
    }
  }

  return (
    <>
      <Overlay isOpen={Boolean(guardianId)} onClose={handleClose} side="right" title="Ficha do responsavel">
        {guardianQuery.isLoading ? (
          <div className="grid gap-4">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : null}

        {guardianQuery.isError ? (
          <ErrorState
            title="Nao foi possivel carregar o responsavel."
            description={getUserSafeErrorMessage(guardianQuery.error)}
            onRetry={() => void guardianQuery.refetch()}
          />
        ) : null}

        {guardian && !isEditingContact ? (
          <div className="grid gap-5">
            <header className="grid gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">{guardian.full_name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getGuardianContactLabel(guardian.phone, guardian.email)}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  leftIcon={<Pencil className="h-4 w-4" aria-hidden />}
                  onClick={() => setIsEditingContact(true)}
                  variant="secondary"
                >
                  Editar
                </Button>
                <Button
                  disabled={!guardian.phone}
                  leftIcon={<Copy className="h-4 w-4" aria-hidden />}
                  onClick={copyPhone}
                  variant="secondary"
                >
                  Copiar telefone
                </Button>
                <Button
                  disabled={!whatsapp}
                  leftIcon={<MessageCircle className="h-4 w-4" aria-hidden />}
                  onClick={() => whatsapp && window.open(`https://wa.me/${whatsapp}`, '_blank', 'noopener,noreferrer')}
                  variant="secondary"
                >
                  WhatsApp
                </Button>
                <Button
                  leftIcon={<LinkIcon className="h-4 w-4" aria-hidden />}
                  onClick={() => setIsLinkingStudent(true)}
                >
                  Vincular aluno
                </Button>
              </div>
            </header>

            <div className="overflow-x-auto">
              <Tabs>
                {[
                  { label: 'Visao geral', value: 'overview' },
                  { label: 'Alunos vinculados', value: 'students' },
                  { label: 'Historico', value: 'history' },
                ].map((tab) => (
                  <TabButton
                    isActive={activeTab === tab.value}
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                  >
                    {tab.label}
                  </TabButton>
                ))}
              </Tabs>
            </div>

            {activeTab === 'overview' ? (
              <GuardianOverview guardian={guardian} onOpenStudent={(studentId) => navigate(`/alunos?aluno=${studentId}`)} />
            ) : null}
            {activeTab === 'students' ? (
              <GuardianStudentsTab
                links={guardian.links}
                onEditLink={setEditingLink}
                onOpenStudent={(studentId) => navigate(`/alunos?aluno=${studentId}`)}
                onUnlink={setUnlinkingLink}
              />
            ) : null}
            {activeTab === 'history' ? <GuardianHistoryTab events={guardian.auditEvents} /> : null}
          </div>
        ) : null}

        {guardian && isEditingContact ? (
          <GuardianContactForm
            guardianId={guardian.id}
            initialValues={{
              email: guardian.email,
              full_name: guardian.full_name,
              notes: guardian.notes,
              phone: guardian.phone,
            }}
            onCancel={() => setIsEditingContact(false)}
            onSaved={() => setIsEditingContact(false)}
          />
        ) : null}
      </Overlay>

      <Overlay
        isOpen={isLinkingStudent || Boolean(editingLink)}
        onClose={() => {
          setIsLinkingStudent(false)
          setEditingLink(null)
        }}
        title={editingLink ? 'Alterar vinculo' : 'Vincular aluno'}
      >
        {guardianId ? (
          <GuardianRelationshipForm
            guardianId={guardianId}
            initialLink={editingLink}
            onCancel={() => {
              setIsLinkingStudent(false)
              setEditingLink(null)
            }}
            onSaved={() => {
              setIsLinkingStudent(false)
              setEditingLink(null)
            }}
          />
        ) : null}
      </Overlay>

      <Overlay
        isOpen={Boolean(unlinkingLink)}
        onClose={() => setUnlinkingLink(null)}
        title="Desvincular responsavel"
      >
        <div className="grid gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Desvincular {guardian?.full_name ?? 'responsavel'} de {unlinkingLink?.student?.full_name ?? 'aluno'}?
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Os dados do responsavel continuarao cadastrados e outros vinculos nao serao afetados.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={() => setUnlinkingLink(null)} variant="secondary">
              Cancelar
            </Button>
            <Button
              isLoading={unlinkMutation.isPending}
              leftIcon={<ArchiveX className="h-4 w-4" aria-hidden />}
              onClick={() => void confirmUnlink()}
              variant="danger"
            >
              Desvincular
            </Button>
          </div>
        </div>
      </Overlay>
    </>
  )
}

function GuardianContactForm({
  guardianId,
  initialValues,
  onCancel,
  onSaved,
}: {
  guardianId: string
  initialValues: GuardianContactValues
  onCancel: () => void
  onSaved: () => void
}) {
  const mutation = useUpdateGuardianContact(guardianId)
  const { notify } = useToast()
  const form = useForm<GuardianContactValues>({
    defaultValues: initialValues,
    resolver: zodResolver(guardianContactSchema),
  })

  async function handleSubmit(values: GuardianContactValues) {
    try {
      await mutation.mutateAsync(values)
      notify({ title: 'Responsavel atualizado.', tone: 'success' })
      onSaved()
    } catch (error) {
      notify({
        title: 'Nao foi possivel salvar as alteracoes.',
        description: getUserSafeErrorMessage(error),
        tone: 'error',
      })
    }
  }

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(handleSubmit)}>
      <GuardianContactFields form={form} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={onCancel} type="button" variant="secondary">
          Cancelar
        </Button>
        <Button isLoading={mutation.isPending} type="submit">
          Salvar
        </Button>
      </div>
    </form>
  )
}

function GuardianOverview({
  guardian,
  onOpenStudent,
}: {
  guardian: NonNullable<ReturnType<typeof useGuardianDetail>['data']>
  onOpenStudent: (studentId: string) => void
}) {
  const primaryLinks = guardian.links.slice(0, 3)

  return (
    <section className="grid gap-4 rounded-md border border-border bg-background p-4 text-sm">
      <InfoRow label="Telefone" value={guardian.phone ?? 'Nao informado'} />
      <InfoRow label="E-mail" value={guardian.email ?? 'Nao informado'} />
      <div>
        <p className="font-medium text-foreground">Observacoes</p>
        <p className="mt-1 leading-6 text-muted-foreground">{guardian.notes ?? 'Nenhuma observacao registrada.'}</p>
      </div>
      <div>
        <p className="font-medium text-foreground">Alunos vinculados</p>
        {primaryLinks.length === 0 ? (
          <p className="mt-1 text-muted-foreground">Nenhum aluno vinculado.</p>
        ) : (
          <div className="mt-2 grid gap-2">
            {primaryLinks.map((link) => (
              <button
                className="rounded border border-border bg-surface p-3 text-left hover:bg-muted"
                key={link.student_id}
                onClick={() => onOpenStudent(link.student_id)}
                type="button"
              >
                <span className="font-semibold text-foreground">{link.student?.full_name ?? 'Aluno'}</span>
                <span className="ml-2 text-muted-foreground">{link.relationship}</span>
                <span className="mt-2 block">
                  <GuardianRoleBadges source={link} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function GuardianStudentsTab({
  links,
  onEditLink,
  onOpenStudent,
  onUnlink,
}: {
  links: GuardianStudentLink[]
  onEditLink: (link: GuardianStudentLink) => void
  onOpenStudent: (studentId: string) => void
  onUnlink: (link: GuardianStudentLink) => void
}) {
  if (links.length === 0) {
    return <EmptyPanel title="Nenhum aluno vinculado" description="Este responsavel ainda nao possui vinculo com aluno." />
  }

  return (
    <div className="grid gap-3">
      {links.map((link) => (
        <article className="rounded-md border border-border bg-background p-4" key={link.student_id}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-semibold text-foreground">{link.student?.full_name ?? 'Aluno'}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{link.relationship}</p>
            </div>
            <GuardianRoleBadges source={link} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => onOpenStudent(link.student_id)} size="sm" variant="secondary">
              Abrir aluno
            </Button>
            <Button onClick={() => onEditLink(link)} size="sm" variant="secondary">
              Alterar vinculo
            </Button>
            <Button onClick={() => onUnlink(link)} size="sm" variant="danger">
              Desvincular
            </Button>
          </div>
        </article>
      ))}
    </div>
  )
}

function GuardianHistoryTab({
  events,
}: {
  events: NonNullable<ReturnType<typeof useGuardianDetail>['data']>['auditEvents']
}) {
  const labels = useMemo(
    () => ({
      'guardian.created': 'Responsavel cadastrado',
      'guardian.updated': 'Contato atualizado',
      'guardian.linked_to_student': 'Aluno vinculado',
      'guardian.relationship_updated': 'Vinculo atualizado',
      'guardian.unlinked_from_student': 'Aluno desvinculado',
    }),
    [],
  )

  if (events.length === 0) {
    return <EmptyPanel title="Historico vazio" description="Nenhum evento administrativo registrado para este responsavel." />
  }

  return (
    <ol className="grid gap-3">
      {events.map((event) => (
        <li className="rounded-md border border-border bg-background p-4" key={event.id}>
          <p className="text-sm font-semibold text-foreground">
            {labels[event.action as keyof typeof labels] ?? event.action}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{formatStudentDate(event.created_at.slice(0, 10))}</p>
        </li>
      ))}
    </ol>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-medium text-foreground">{label}</p>
      <p className="mt-1 text-muted-foreground">{value}</p>
    </div>
  )
}

function EmptyPanel({ description, title }: { description: string; title: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-background p-6 text-sm">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-muted-foreground">{description}</p>
    </div>
  )
}
