import type { UseFormReturn } from 'react-hook-form'
import { Textarea } from '@/shared/components/ui/FormControls'
import { Input } from '@/shared/components/ui/Input'
import type { GuardianContactValues } from '@/features/guardians/schemas/guardianSchema'

type GuardianContactFieldsProps<TValues extends GuardianContactValues> = {
  form: UseFormReturn<TValues>
}

export function GuardianContactFields<TValues extends GuardianContactValues>({
  form,
}: GuardianContactFieldsProps<TValues>) {
  const errors = form.formState.errors

  return (
    <div className="grid gap-4">
      <Input
        error={errors.full_name?.message as string | undefined}
        label="Nome completo *"
        {...form.register('full_name' as never)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          error={errors.phone?.message as string | undefined}
          label="Celular / WhatsApp"
          {...form.register('phone' as never)}
        />
        <Input
          error={errors.email?.message as string | undefined}
          label="E-mail"
          type="email"
          {...form.register('email' as never)}
        />
      </div>
      <Textarea label="Observacoes" {...form.register('notes' as never)} />
    </div>
  )
}
