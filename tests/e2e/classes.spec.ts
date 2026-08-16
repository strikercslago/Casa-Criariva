import { expect, test } from '@playwright/test'

test.use({ viewport: { height: 844, width: 390 } })

type Student = {
  archived_at: string | null
  birth_date: string | null
  created_at: string
  created_by: string | null
  enrollment_date: string
  full_name: string
  id: string
  notes: string | null
  photo_path: string | null
  preferred_name: string | null
  status: 'active' | 'inactive' | 'archived'
  updated_at: string
}

type ClassRecord = {
  capacity: number | null
  created_at: string
  description: string | null
  id: string
  name: string
  status: 'active' | 'inactive' | 'archived'
  updated_at: string
}

type ClassSchedule = {
  class_id: string
  created_at: string
  end_time: string
  id: string
  start_time: string
  weekday: number
}

type Enrollment = {
  class_id: string
  created_at: string
  end_date: string | null
  id: string
  start_date: string
  status: 'active' | 'ended' | 'cancelled'
  student_id: string
  updated_at: string
}

type AuditEvent = {
  action: string
  actor_user_id: string
  created_at: string
  entity_id: string
  entity_type: 'class' | 'student'
  id: string
  metadata: Record<string, string>
}

test('manages classes, enrollments and Student 360 sync with mocked Supabase requests', async ({ page }) => {
  const consoleErrors: string[] = []
  const restRequests: string[] = []
  const rpcRequests: string[] = []
  const authRequests: string[] = []
  const now = '2026-08-11T12:00:00.000Z'
  const userId = '11111111-1111-4111-8111-111111111111'
  await page.clock.setFixedTime(new Date(now))
  const students: Student[] = [
    {
      archived_at: null,
      birth_date: '2018-08-12',
      created_at: now,
      created_by: userId,
      enrollment_date: '2026-03-05',
      full_name: 'Ana Carolina',
      id: 'student-1',
      notes: null,
      photo_path: null,
      preferred_name: 'Ana',
      status: 'active',
      updated_at: now,
    },
  ]
  let classes: ClassRecord[] = [
    {
      capacity: 6,
      created_at: now,
      description: 'Turma de destino para transferencia',
      id: 'class-target',
      name: 'Teatro 1',
      status: 'active',
      updated_at: now,
    },
  ]
  let schedules: ClassSchedule[] = [
    {
      class_id: 'class-target',
      created_at: now,
      end_time: '16:00:00',
      id: 'schedule-target',
      start_time: '15:00:00',
      weekday: 3,
    },
  ]
  let enrollments: Enrollment[] = []
  let auditEvents: AuditEvent[] = []

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  await page.route('https://baugbpqdgslfogggaqen.supabase.co/auth/v1/**', async (route) => {
    authRequests.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`)

    await route.fulfill({
      contentType: 'application/json',
      json: {
        access_token: 'mock-access-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        token_type: 'bearer',
        user: {
          app_metadata: {},
          aud: 'authenticated',
          confirmed_at: now,
          created_at: now,
          email: 'owner@example.com',
          id: userId,
          role: 'authenticated',
          updated_at: now,
          user_metadata: {},
        },
      },
      status: 200,
    })
  })

  await page.route('https://baugbpqdgslfogggaqen.supabase.co/rest/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    restRequests.push(`${request.method()} ${url.pathname}`)

    if (url.pathname.endsWith('/profiles')) {
      await route.fulfill({
        contentType: 'application/json',
        json: {
          avatar_url: null,
          created_at: now,
          full_name: 'Owner',
          id: userId,
          is_active: true,
          updated_at: now,
        },
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/user_roles')) {
      await route.fulfill({ contentType: 'application/json', json: [{ role: 'owner' }], status: 200 })
      return
    }

    if (url.pathname.includes('/rpc/get_dashboard_')) {
      await route.fulfill({ contentType: 'application/json', json: dashboardRows(url.pathname), status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/list_classes')) {
      rpcRequests.push('POST list_classes')
      const body = request.postDataJSON() as {
        p_capacity_filter?: string
        p_page?: number
        p_page_size?: number
        p_search?: string
        p_status_filter?: string
      }
      const search = (body.p_search ?? '').toLowerCase()
      const status = body.p_status_filter ?? 'all'
      const capacity = body.p_capacity_filter ?? 'all'
      const filtered = classes.filter((classItem) => {
        const activeCount = activeEnrollmentsForClass(classItem.id).length
        const full = classItem.capacity !== null && activeCount >= classItem.capacity

        return (
          (!search || classItem.name.toLowerCase().includes(search)) &&
          (status === 'all' || classItem.status === status) &&
          (capacity === 'all' || (capacity === 'full' ? full : !full))
        )
      })

      await route.fulfill({
        contentType: 'application/json',
        json: filtered.map((classItem) => {
          const activeCount = activeEnrollmentsForClass(classItem.id).length

          return {
            active_enrollments: activeCount,
            available_spots: classItem.capacity === null ? null : Math.max(classItem.capacity - activeCount, 0),
            capacity: classItem.capacity,
            class_id: classItem.id,
            created_at: classItem.created_at,
            description: classItem.description,
            is_full: classItem.capacity !== null && activeCount >= classItem.capacity,
            name: classItem.name,
            schedules: schedules.filter((schedule) => schedule.class_id === classItem.id),
            status: classItem.status,
            total_count: filtered.length,
            updated_at: classItem.updated_at,
          }
        }),
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/rpc/create_class_with_schedules')) {
      rpcRequests.push('POST create_class_with_schedules')
      const body = request.postDataJSON() as {
        payload: {
          class: Pick<ClassRecord, 'capacity' | 'description' | 'name' | 'status'>
          schedules: Array<Pick<ClassSchedule, 'end_time' | 'start_time' | 'weekday'>>
        }
      }
      const classId = 'class-created'
      classes = [
        {
          capacity: body.payload.class.capacity,
          created_at: now,
          description: body.payload.class.description,
          id: classId,
          name: body.payload.class.name,
          status: body.payload.class.status,
          updated_at: now,
        },
        ...classes,
      ]
      schedules = [
        ...schedules,
        ...body.payload.schedules.map((schedule, index) => ({
          class_id: classId,
          created_at: now,
          end_time: withSeconds(schedule.end_time),
          id: `schedule-created-${index + 1}`,
          start_time: withSeconds(schedule.start_time),
          weekday: schedule.weekday,
        })),
      ]
      addAudit('class.created', 'class', classId)
      await route.fulfill({ contentType: 'application/json', json: classId, status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/update_class_with_schedules')) {
      rpcRequests.push('POST update_class_with_schedules')
      const body = request.postDataJSON() as {
        payload: {
          class: Pick<ClassRecord, 'capacity' | 'description' | 'name' | 'status'>
          class_id: string
          schedules: Array<Pick<ClassSchedule, 'end_time' | 'start_time' | 'weekday'>>
        }
      }
      classes = classes.map((classItem) =>
        classItem.id === body.payload.class_id
          ? { ...classItem, ...body.payload.class, updated_at: now }
          : classItem,
      )
      schedules = [
        ...schedules.filter((schedule) => schedule.class_id !== body.payload.class_id),
        ...body.payload.schedules.map((schedule, index) => ({
          class_id: body.payload.class_id,
          created_at: now,
          end_time: withSeconds(schedule.end_time),
          id: `schedule-updated-${index + 1}`,
          start_time: withSeconds(schedule.start_time),
          weekday: schedule.weekday,
        })),
      ]
      addAudit('class.updated', 'class', body.payload.class_id)
      addAudit('class.schedule_changed', 'class', body.payload.class_id)
      await route.fulfill({ contentType: 'application/json', json: body.payload.class_id, status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/add_student_to_class')) {
      rpcRequests.push('POST add_student_to_class')
      const body = request.postDataJSON() as {
        payload: { class_id: string; start_date: string; student_id: string }
      }
      const duplicate = enrollments.some(
        (enrollment) =>
          enrollment.class_id === body.payload.class_id &&
          enrollment.student_id === body.payload.student_id &&
          enrollment.status === 'active',
      )
      if (duplicate) {
        await route.fulfill({ contentType: 'application/json', json: { message: 'duplicate' }, status: 409 })
        return
      }
      const enrollmentId = 'enrollment-source'
      enrollments = [
        ...enrollments,
        {
          class_id: body.payload.class_id,
          created_at: now,
          end_date: null,
          id: enrollmentId,
          start_date: body.payload.start_date,
          status: 'active',
          student_id: body.payload.student_id,
          updated_at: now,
        },
      ]
      addAudit('enrollment.created', 'class', body.payload.class_id)
      addAudit('enrollment.created', 'student', body.payload.student_id)
      await route.fulfill({ contentType: 'application/json', json: enrollmentId, status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/transfer_student_class')) {
      rpcRequests.push('POST transfer_student_class')
      const body = request.postDataJSON() as {
        payload: { enrollment_id: string; target_class_id: string; transfer_date: string }
      }
      const sourceEnrollment = enrollments.find((enrollment) => enrollment.id === body.payload.enrollment_id)
      if (!sourceEnrollment) {
        await route.fulfill({ contentType: 'application/json', json: { message: 'not found' }, status: 404 })
        return
      }
      enrollments = enrollments.map((enrollment) =>
        enrollment.id === sourceEnrollment.id
          ? { ...enrollment, end_date: body.payload.transfer_date, status: 'ended', updated_at: now }
          : enrollment,
      )
      const newEnrollmentId = 'enrollment-target'
      enrollments = [
        ...enrollments,
        {
          class_id: body.payload.target_class_id,
          created_at: now,
          end_date: null,
          id: newEnrollmentId,
          start_date: body.payload.transfer_date,
          status: 'active',
          student_id: sourceEnrollment.student_id,
          updated_at: now,
        },
      ]
      addAudit('enrollment.transferred', 'class', sourceEnrollment.class_id)
      addAudit('enrollment.transferred', 'class', body.payload.target_class_id)
      addAudit('enrollment.transferred', 'student', sourceEnrollment.student_id)
      await route.fulfill({ contentType: 'application/json', json: newEnrollmentId, status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/end_class_enrollment')) {
      rpcRequests.push('POST end_class_enrollment')
      const body = request.postDataJSON() as { payload: { end_date: string; enrollment_id: string } }
      const enrollment = enrollments.find((item) => item.id === body.payload.enrollment_id)
      enrollments = enrollments.map((item) =>
        item.id === body.payload.enrollment_id
          ? { ...item, end_date: body.payload.end_date, status: 'ended', updated_at: now }
          : item,
      )
      if (enrollment) {
        addAudit('enrollment.ended', 'class', enrollment.class_id)
        addAudit('enrollment.ended', 'student', enrollment.student_id)
      }
      await route.fulfill({ contentType: 'application/json', json: body.payload.enrollment_id, status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/update_class_status')) {
      rpcRequests.push('POST update_class_status')
      const body = request.postDataJSON() as {
        payload: { class_id: string; status: 'active' | 'inactive' | 'archived' }
      }
      classes = classes.map((classItem) =>
        classItem.id === body.payload.class_id
          ? { ...classItem, status: body.payload.status, updated_at: now }
          : classItem,
      )
      addAudit(body.payload.status === 'archived' ? 'class.archived' : 'class.restored', 'class', body.payload.class_id)
      await route.fulfill({ contentType: 'application/json', json: body.payload.class_id, status: 200 })
      return
    }

    if (url.pathname.endsWith('/classes')) {
      const idFilter = url.searchParams.get('id')?.replace('eq.', '')
      if (idFilter) {
        await route.fulfill({ contentType: 'application/json', json: classDetail(idFilter), status: 200 })
        return
      }

      const statusFilter = url.searchParams.get('status')?.replace('eq.', '')
      await route.fulfill({
        contentType: 'application/json',
        json: classes
          .filter((classItem) => !statusFilter || classItem.status === statusFilter)
          .map((classItem) => ({
            ...classItem,
            class_schedules: schedules.filter((schedule) => schedule.class_id === classItem.id),
          })),
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/students')) {
      const idFilter = url.searchParams.get('id')?.replace('eq.', '')
      const nameFilter = url.searchParams.get('full_name')?.replace('ilike.', '').replaceAll('%', '').toLowerCase()
      const rawStatusFilter = url.searchParams.get('status')
      const statusNot = rawStatusFilter?.startsWith('neq.') ? rawStatusFilter.replace('neq.', '') : null
      const statusFilter = rawStatusFilter?.startsWith('eq.') ? rawStatusFilter.replace('eq.', '') : null

      if (idFilter) {
        await route.fulfill({
          contentType: 'application/json',
          json: students.find((student) => student.id === idFilter) ?? null,
          status: 200,
        })
        return
      }

      const filtered = students.filter((student) => {
        const matchesName = !nameFilter || student.full_name.toLowerCase().includes(nameFilter)
        const matchesStatus = !statusFilter || student.status === statusFilter
        const matchesNotStatus = !statusNot || student.status !== statusNot

        return matchesName && matchesStatus && matchesNotStatus
      })

      await route.fulfill({
        contentType: 'application/json',
        headers: { 'content-range': `0-${Math.max(filtered.length - 1, 0)}/${filtered.length}` },
        json: filtered,
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/enrollments')) {
      const studentId = url.searchParams.get('student_id')?.replace('eq.', '')
      await route.fulfill({
        contentType: 'application/json',
        json: enrollments
          .filter((enrollment) => !studentId || enrollment.student_id === studentId)
          .map((enrollment) => ({
            ...enrollment,
            class: classDetail(enrollment.class_id),
          })),
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/audit_events')) {
      const entityType = url.searchParams.get('entity_type')?.replace('eq.', '') as 'class' | 'student' | undefined
      const entityId = url.searchParams.get('entity_id')?.replace('eq.', '')
      await route.fulfill({
        contentType: 'application/json',
        json: auditEvents.filter(
          (event) => (!entityType || event.entity_type === entityType) && (!entityId || event.entity_id === entityId),
        ),
        status: 200,
      })
      return
    }

    if (
      url.pathname.endsWith('/student_guardians') ||
      url.pathname.endsWith('/student_billing_plans') ||
      url.pathname.endsWith('/attendance_records')
    ) {
      await route.fulfill({ contentType: 'application/json', json: [], status: 200 })
      return
    }

    await route.fulfill({ contentType: 'application/json', json: {}, status: 404 })
  })

  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Senha').fill('senha-segura')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible()
  await page.goto('/turmas')
  await expect(page.getByRole('heading', { name: 'Turmas' })).toBeVisible()
  await expect(page.getByText('Teatro 1').first()).toBeVisible()

  await page.getByRole('button', { name: 'Nova turma' }).click()
  await page.getByLabel('Nome da turma *').fill('Artes E2E')
  await page.getByLabel('Capacidade').fill('2')
  await page.getByRole('button', { name: 'Criar turma' }).click()
  await expect(page.getByText('Turma criada.')).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Ficha da turma' }).getByRole('heading', { name: 'Artes E2E' })).toBeVisible()

  await page.getByRole('button', { name: 'Adicionar aluno' }).click()
  await page.getByPlaceholder('Nome do aluno').fill('Ana')
  await page.getByRole('button', { name: /Ana Carolina/ }).click()
  await page.getByRole('dialog', { name: 'Adicionar aluno' }).getByRole('button', { name: 'Adicionar aluno' }).click()
  await expect(page.getByText('Aluno adicionado a turma.')).toBeVisible()
  await page.getByRole('button', { name: 'Alunos matriculados' }).click()
  await expect(page.getByText('Ana Carolina').first()).toBeVisible()

  await page.getByRole('button', { name: 'Transferir' }).click()
  await page.getByLabel('Nova turma').selectOption('class-target')
  await page.getByRole('button', { name: 'Transferir aluno' }).click()
  await expect(page.getByText('Aluno transferido.')).toBeVisible()
  await expect(page.getByText('Encerramento: 11/08/2026')).toBeVisible()

  await page
    .getByRole('button', { name: 'Fechar aviso' })
    .evaluateAll((buttons) => buttons.forEach((button) => (button as HTMLButtonElement).click()))
  await page.getByRole('button', { name: 'Abrir aluno' }).click()
  await expect(page.getByRole('heading', { name: 'Ana Carolina' })).toBeVisible()
  await page.getByRole('button', { name: 'Matriculas' }).click()
  await expect(page.getByText('Teatro 1')).toBeVisible()
  await page.getByRole('button', { name: 'Historico' }).click()
  await expect(page.getByText('Matricula transferida')).toBeVisible()

  await page.getByRole('dialog', { name: 'Aluno' }).getByRole('button', { name: 'Fechar' }).click()
  await page.goto('/turmas')
  await page.locator('article').filter({ hasText: 'Teatro 1' }).getByRole('button', { name: 'Ver turma' }).click()
  await page.getByRole('button', { name: 'Alunos matriculados' }).click()
  await page.getByRole('button', { name: 'Encerrar' }).click()
  await page.getByRole('dialog', { name: 'Encerrar matricula' }).getByRole('button', { name: 'Encerrar' }).click()
  await expect(page.getByText('Matricula encerrada.')).toBeVisible()

  await page.getByRole('button', { name: 'Arquivar turma' }).click()
  await page.getByRole('dialog', { name: 'Arquivar turma' }).getByRole('button', { name: 'Arquivar' }).click()
  await expect(page.getByText('Turma arquivada.')).toBeVisible()
  await expect(page.getByText('Arquivada').first()).toBeVisible()
  await page.getByRole('button', { name: 'Restaurar turma' }).click()
  await expect(page.getByText('Turma restaurada.')).toBeVisible()
  await expect(page.getByText('Ativa').first()).toBeVisible()

  expect(authRequests.filter((request) => request.includes('/token'))).toHaveLength(1)
  expect(rpcRequests).toEqual(expect.arrayContaining([
    'POST list_classes',
    'POST create_class_with_schedules',
    'POST add_student_to_class',
    'POST transfer_student_class',
    'POST end_class_enrollment',
    'POST update_class_status',
  ]))
  expect(restRequests.filter((request) => request.includes('/classes')).length).toBeGreaterThan(0)
  expect(consoleErrors).toEqual([])

  function activeEnrollmentsForClass(classId: string) {
    return enrollments.filter((enrollment) => enrollment.class_id === classId && enrollment.status === 'active')
  }

  function classDetail(classId: string) {
    const classItem = classes.find((item) => item.id === classId)

    if (!classItem) {
      return null
    }

    return {
      ...classItem,
      auditEvents: auditEvents.filter((event) => event.entity_type === 'class' && event.entity_id === classId),
      class_schedules: schedules.filter((schedule) => schedule.class_id === classId),
      enrollments: enrollments
        .filter((enrollment) => enrollment.class_id === classId)
        .map((enrollment) => ({
          ...enrollment,
          student: students.find((student) => student.id === enrollment.student_id) ?? null,
        })),
    }
  }

  function addAudit(action: string, entityType: 'class' | 'student', entityId: string) {
    auditEvents = [
      {
        action,
        actor_user_id: userId,
        created_at: now,
        entity_id: entityId,
        entity_type: entityType,
        id: `audit-${auditEvents.length + 1}`,
        metadata: {},
      },
      ...auditEvents,
    ]
  }

  function withSeconds(value: string) {
    return value.length === 5 ? `${value}:00` : value
  }
})

function dashboardRows(pathname: string) {
  if (pathname.endsWith('/rpc/get_dashboard_today')) return [{ day_date: '2026-08-11', events_today_count: 0, expected_students: 0, next_event_id: '', next_event_name: '', next_event_start: '', next_session_class_name: '', next_session_expected_students: 0, next_session_id: '', next_session_start: '', pending_sessions_count: 0, sessions_count: 0 }]
  if (pathname.endsWith('/rpc/get_dashboard_attention')) return []
  return [{ active_classes_count: 0, active_students_count: 0, archived_students_count: 0, attendance_absent_count: 0, attendance_excused_count: 0, attendance_pending_sessions: 0, attendance_present_count: 0, attendance_rate: 0, available_spots: 0, cash_in: 0, cash_out: 0, class_active_enrollments: 0, class_occupancy_rate: 0, class_total_capacity: 0, full_classes_count: 0, low_stock_count: 0, net_students_change: 0, new_students_count: 0, next_event_date: '', next_event_id: '', next_event_name: '', out_of_stock_count: 0, overdue_billing_amount: 0, overdue_billing_count: 0, payable_amount: 0, receivable_amount: 0, reference_month: '2026-08-01', result_amount: 0, upcoming_events_count: 0 }]
}
