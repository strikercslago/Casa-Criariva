import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, LockKeyhole, Palette } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas/loginSchema'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'

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
    <main className="grid min-h-screen bg-background lg:grid-cols-[1fr_0.9fr]">
      <section className="hidden border-r border-border bg-primary px-10 py-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white/15">
            <Palette className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <p className="font-semibold">Casa Criativa Gestao</p>
            <p className="text-sm text-white/75">Operacao segura e organizada</p>
          </div>
        </div>

        <div className="max-w-xl">
          <p className="text-sm font-medium uppercase tracking-normal text-white/70">Acesso administrativo</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            Entre para cuidar da rotina com clareza, rapidez e seguranca.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-white/78">
            A V2 foi preparada para manter a navegacao leve, proteger dados privados com RLS
            e carregar permissoes de forma centralizada.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Palette className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="font-semibold">Casa Criativa Gestao</p>
              <p className="text-sm text-muted-foreground">Acesso administrativo</p>
            </div>
          </div>

          <div className="rounded-md border border-border bg-surface p-6 shadow-subtle">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-primary">
              <LockKeyhole className="h-5 w-5" aria-hidden />
            </div>
            <h2 className="mt-5 text-2xl font-semibold">Entrar</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use seu e-mail e senha administrativos. Cadastro publico nao esta disponivel.
            </p>

            <form className="mt-6 grid gap-4" onSubmit={handleSubmit(onSubmit)}>
              <Input
                autoComplete="email"
                error={errors.email?.message}
                label="Email"
                type="email"
                {...register('email')}
              />
              <Input
                autoComplete="current-password"
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
                className="mt-1 w-full"
                isLoading={isSubmitting}
                rightIcon={<ArrowRight className="h-4 w-4" aria-hidden />}
                type="submit"
              >
                Entrar
              </Button>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}
