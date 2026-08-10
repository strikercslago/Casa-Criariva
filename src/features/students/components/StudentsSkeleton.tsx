import { Skeleton } from '@/shared/components/ui/Skeleton'

export function StudentsSkeleton() {
  return (
    <div className="space-y-3" aria-label="Carregando alunos">
      <Skeleton className="h-16 w-full" />
      <div className="rounded-md border border-border bg-surface p-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            className="grid gap-3 border-b border-border py-3 last:border-0 md:grid-cols-[1.5fr_1fr_1fr_7rem]"
            key={index}
          >
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
