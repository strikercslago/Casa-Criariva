import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Brush, LockKeyhole, Palette, ShieldCheck, Sparkles } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas/loginSchema'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import casaCriativaLogo from '@/assets/brand/casa-criativa-logo.png'

type LocationState = {
  from?: {
    pathname?: string
  }
}

export default function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)
  const from = (location.state as LocationState | null)?.from?.pathname ?? '/'
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(values: LoginFormValues) {
    setFormError(null)
    const result = await auth.signInWithPassword(values)

    if (result.errorMessage) {
      setFormError(result.errorMessage)
      return
    }

    navigate(from, { replace: true })
  }

  return (
    <main className="grid min-h-screen bg-[#f8faf8] text-foreground lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden border-r border-[#d9e4df] bg-[#fffdf8] px-10 py-10 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#19b7c7]/18 blur-3xl" />
          <div className="absolute right-10 top-16 h-56 w-56 rounded-full bg-[#ffb01f]/22 blur-3xl" />
          <div className="absolute bottom-20 left-14 h-52 w-52 rounded-full bg-[#ef4f7a]/14 blur-3xl" />
          <div className="absolute -bottom-20 right-1/4 h-64 w-64 rounded-full bg-[#39c991]/16 blur-3xl" />
          <span className="absolute left-[12%] top-[31%] h-3 w-3 rounded-full bg-[#ef4f7a]/70" />
          <span className="absolute right-[18%] top-[28%] h-2.5 w-2.5 rounded-full bg-[#1aa0b5]/70" />
          <span className="absolute bottom-[28%] right-[14%] h-3.5 w-3.5 rounded-full bg-[#ffb01f]/75" />
          <span className="absolute bottom-[17%] left-[21%] h-2 w-2 rounded-full bg-[#2f7ee6]/70" />
          <svg
            className="absolute bottom-16 right-12 h-44 w-72 text-[#10245a]/10"
            fill="none"
            viewBox="0 0 288 176"
          >
            <path
              d="M15 118C49 64 84 151 129 98C166 55 189 89 221 59C242 39 255 27 274 35"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="16"
            />
            <path
              d="M23 145C75 103 100 166 151 128C184 103 209 123 258 92"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="10"
            />
          </svg>
        </div>

        <div className="relative flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-md border border-white/70 bg-white/80 shadow-subtle">
            <img
              alt="Casa Criativa"
              className="h-14 w-14 object-contain"
              height="56"
              src={casaCriativaLogo}
              width="56"
            />
          </div>
          <div>
            <p className="text-base font-semibold text-[#07194f]">Casa Criativa Gestao</p>
            <p className="text-sm text-[#4d6075]">Rotina segura para um atelie vivo</p>
          </div>
        </div>

        <div className="relative max-w-xl">
          <div className="mb-8 flex h-44 w-44 items-center justify-center rounded-full bg-white/80 shadow-elevated ring-1 ring-white">
            <img
              alt=""
              className="h-36 w-36 object-contain"
              height="144"
              src={casaCriativaLogo}
              width="144"
            />
          </div>
          <p className="text-sm font-semibold uppercase tracking-normal text-[#237f77]">Acesso administrativo</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight text-[#07194f]">
            Gestao leve para uma rotina criativa, organizada e acolhedora.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-[#40536a]">
            Acompanhe aulas, alunos, mensalidades e materiais com carinho pela rotina e seguranca para os dados da escola.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {[
              { icon: Brush, label: 'Arte na rotina' },
              { icon: ShieldCheck, label: 'Dados protegidos' },
              { icon: Sparkles, label: 'Gestao clara' },
            ].map((item) => (
              <span
                className="inline-flex h-9 items-center gap-2 rounded border border-white/70 bg-white/75 px-3 text-sm font-medium text-[#173a55] shadow-subtle"
                key={item.label}
              >
                <item.icon className="h-4 w-4 text-[#248c83]" aria-hidden />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <p className="relative max-w-md text-sm leading-6 text-[#5a6d82]">
          Casa Criativa une cuidado, criatividade e organizacao para que a equipe possa focar no que importa: as criancas e suas descobertas.
        </p>
      </section>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:min-h-0 lg:px-10">
        <div className="pointer-events-none absolute inset-0 lg:hidden" aria-hidden>
          <div className="absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[#19b7c7]/16 blur-3xl" />
          <div className="absolute -right-14 top-12 h-48 w-48 rounded-full bg-[#ffb01f]/20 blur-3xl" />
          <div className="absolute bottom-8 left-10 h-36 w-36 rounded-full bg-[#ef4f7a]/10 blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-md border border-border bg-white shadow-subtle">
              <img
                alt="Casa Criativa"
                className="h-12 w-12 object-contain"
                height="48"
                src={casaCriativaLogo}
                width="48"
              />
            </div>
            <div>
              <p className="font-semibold text-[#07194f]">Casa Criativa Gestao</p>
              <p className="text-sm text-muted-foreground">Acesso administrativo</p>
            </div>
          </div>

          <div className="rounded-md border border-[#d7e1dc] bg-white/95 p-6 shadow-elevated backdrop-blur sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#248c83]/10 text-[#248c83]">
                <LockKeyhole className="h-5 w-5" aria-hidden />
              </div>
              <div className="hidden h-11 w-11 items-center justify-center rounded-md bg-[#fff6dc] text-[#a45b00] sm:flex">
                <Palette className="h-5 w-5" aria-hidden />
              </div>
            </div>
            <h2 className="mt-5 text-2xl font-semibold">Entrar</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use seu e-mail e senha administrativos para acessar a rotina da Casa Criativa. Cadastro publico nao esta disponivel.
            </p>

            <form className="mt-6 grid gap-4" onSubmit={handleSubmit(onSubmit)}>
              <Input
                autoComplete="email"
                className="h-11 bg-white"
                error={errors.email?.message}
                label="Email"
                type="email"
                {...register('email')}
              />
              <Input
                autoComplete="current-password"
                className="h-11 bg-white"
                error={errors.password?.message}
                label="Senha"
                type="password"
                {...register('password')}
              />

              {formError ? (
                <div className="rounded border border-danger/30 bg-danger/5 px-3 py-2 text-sm font-medium text-danger">
                  {formError}
                </div>
              ) : null}

              <Button
                className="mt-1 h-11 w-full border-[#248c83] bg-[#248c83] hover:bg-[#1d776f] active:bg-[#1b6d66]"
                isLoading={isSubmitting}
                rightIcon={<ArrowRight className="h-4 w-4" aria-hidden />}
                type="submit"
              >
                Entrar
              </Button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            Plataforma administrativa para equipe autorizada.
          </p>
        </div>
      </section>
    </main>
  )
}
