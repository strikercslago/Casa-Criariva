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

export type NavigationItem = {
  label: string
  path: string
  icon: LucideIcon
}

export const navigationItems: NavigationItem[] = [
  { label: 'Inicio', path: '/', icon: Home },
  { label: 'Agenda', path: '/agenda', icon: CalendarDays },
  { label: 'Alunos', path: '/alunos', icon: GraduationCap },
  { label: 'Responsaveis', path: '/responsaveis', icon: Users },
  { label: 'Turmas', path: '/turmas', icon: Shapes },
  { label: 'Frequencia', path: '/frequencia', icon: ClipboardCheck },
  { label: 'Mensalidades', path: '/mensalidades', icon: CreditCard },
  { label: 'Financeiro', path: '/financeiro', icon: WalletCards },
  { label: 'Eventos', path: '/eventos', icon: PartyPopper },
  { label: 'Materiais', path: '/materiais', icon: Package },
  { label: 'Ideias', path: '/ideias', icon: Lightbulb },
  { label: 'Relatorios', path: '/relatorios', icon: BarChart3 },
  { label: 'Configuracoes', path: '/configuracoes', icon: Settings },
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
