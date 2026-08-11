# Permissions

Casa Criativa uses three roles only: `owner`, `admin` and `teacher`.

Authorization must exist in three layers: RLS, RPC/Edge Function checks and UI route/action visibility. Sidebar hiding is convenience, not security.

| Module | Owner | Admin | Teacher |
| --- | --- | --- | --- |
| Dashboard | CRUD | READ | LIMITED |
| Alunos | CRUD | CRUD | READ |
| Responsaveis | CRUD | CRUD | - |
| Turmas | CRUD | CRUD | READ |
| Agenda | CRUD | CRUD | OPERATIONAL |
| Frequencia | CRUD | CRUD | OPERATIONAL |
| Mensalidades | CRUD | CRUD | - |
| Financeiro | CRUD | - | - |
| Eventos | CRUD | CRUD | - |
| Materiais | CRUD | CRUD | - |
| Relatorios | CRUD | - | - |
| Configuracoes | CRUD | READ | READ |
| Usuarios | OWNER | - | - |
| Auditoria | OWNER | - | - |
| Seguranca | OWNER | READ | READ |

Decision: admin can operate mensalidades and payments, but Financeiro Geral and Relatorios financeiros remain owner-only until an explicit business approval changes that boundary.

Teacher access is intentionally operational. Teachers can use agenda/class/attendance workflows and see a limited dashboard. They do not get billing, finance, users, audit, materials purchases or settings administration.

The source of truth for UI routing is `src/app/auth/permissions.ts`.
