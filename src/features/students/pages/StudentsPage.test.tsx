import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/shared/components/feedback/Toast'
import StudentsPage from './StudentsPage'

const useStudentsList = vi.hoisted(() => vi.fn())
const useCreateStudent = vi.hoisted(() => vi.fn())
const useStudentDetail = vi.hoisted(() => vi.fn())
const useUpdateStudent = vi.hoisted(() => vi.fn())
const useArchiveStudent = vi.hoisted(() => vi.fn())
const useRestoreStudent = vi.hoisted(() => vi.fn())

vi.mock('@/features/students/hooks/useStudents', () => ({
  useArchiveStudent,
  useCreateStudent,
  useRestoreStudent,
  useStudentDetail,
  useStudentsList,
  useUpdateStudent,
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <StudentsPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('StudentsPage', () => {
  beforeEach(() => {
    useCreateStudent.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useStudentDetail.mockReturnValue({ data: null, isError: false, isLoading: false })
    useUpdateStudent.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useArchiveStudent.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useRestoreStudent.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
  })

  it('shows the empty state for first use', () => {
    useStudentsList.mockReturnValue({
      data: { students: [], totalCount: 0, totalPages: 1 },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    })

    renderPage()

    expect(screen.getByText('Nenhum aluno cadastrado ainda.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cadastrar primeiro aluno' })).toBeInTheDocument()
  })

  it('renders students and opens the creation drawer', async () => {
    const user = userEvent.setup()
    useStudentsList.mockReturnValue({
      data: {
        students: [
          {
            birth_date: null,
            enrollment_date: '2026-03-05',
            full_name: 'Ana Beatriz',
            id: 'student-1',
            preferred_name: null,
            status: 'active',
          },
        ],
        totalCount: 1,
        totalPages: 1,
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    })

    renderPage()

    expect(screen.getAllByText('Ana Beatriz')[0]).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Novo aluno' }))

    expect(screen.getByRole('dialog', { name: 'Novo aluno' })).toBeInTheDocument()
  })
})
