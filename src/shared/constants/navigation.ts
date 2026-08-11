import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileText,
  GraduationCap,
  Home,
  Lightbulb,
  Package,
  PartyPopper,
  Settings,
  Shapes,
  Users,
  WalletCards,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PermissionModule } from '@/app/auth/permissions'

export type NavigationItem = {
  label: string
  path: string
  icon: LucideIcon
  module: PermissionModule
}

export const navigationItems: NavigationItem[] = [
  { label: 'Inicio', path: '/', icon: Home, module: 'dashboard' },
  { label: 'Agenda', path: '/agenda', icon: CalendarDays, module: 'agenda' },
  { label: 'Alunos', path: '/alunos', icon: GraduationCap, module: 'students' },
  { label: 'Responsaveis', path: '/responsaveis', icon: Users, module: 'guardians' },
  { label: 'Turmas', path: '/turmas', icon: Shapes, module: 'classes' },
  { label: 'Frequencia', path: '/frequencia', icon: ClipboardCheck, module: 'attendance' },
  { label: 'Mensalidades', path: '/mensalidades', icon: CreditCard, module: 'billing' },
  { label: 'Financeiro', path: '/financeiro', icon: WalletCards, module: 'finance' },
  { label: 'Eventos', path: '/eventos', icon: PartyPopper, module: 'events' },
  { label: 'Materiais', path: '/materiais', icon: Package, module: 'materials' },
  { label: 'Ideias', path: '/ideias', icon: Lightbulb, module: 'settings' },
  { label: 'Relatorios', path: '/relatorios', icon: BarChart3, module: 'reports' },
  { label: 'Configuracoes', path: '/configuracoes', icon: Settings, module: 'settings' },
]

export const moduleGroups = [
  {
    title: 'Operacao',
    modules: ['Agenda', 'Alunos', 'Responsaveis', 'Turmas', 'Frequencia'],
  },
  {
    title: 'Gestao',
    modules: ['Mensalidades', 'Financeiro', 'Eventos', 'Materiais'],
  },
  {
    title: 'Planejamento',
    modules: ['Ideias', 'Relatorios', 'Configuracoes'],
  },
]

export const documentationLinks = [
  { label: 'Arquitetura', path: 'docs/ARCHITECTURE.md', icon: FileText },
]
