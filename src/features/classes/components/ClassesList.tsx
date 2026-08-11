import { ArrowRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { ClassStatusBadge } from '@/features/classes/components/ClassStatusBadge'
import type { ClassListItem } from '@/features/classes/types/classTypes'
import { formatAvailableSpots, formatCapacity } from '@/features/classes/utils/classCapacity'
import { formatClassSchedules } from '@/features/classes/utils/classSchedule'

type ClassesListProps = {
  classes: ClassListItem[]
  onOpenClass: (id: string) => void
  onPrefetchClass?: (id: string) => void
}

export function ClassesList({ classes, onOpenClass, onPrefetchClass }: ClassesListProps) {
  return (
    <div className="grid gap-3">
      {classes.map((classItem) => (
        <article
          className="rounded-md border border-border bg-surface p-4 shadow-subtle transition-colors hover:bg-muted/40"
          key={classItem.class_id}
          onMouseEnter={() => onPrefetchClass?.(classItem.class_id)}
        >
          <div className="grid gap-4 md:grid-cols-[minmax(220px,1.2fr)_minmax(180px,1fr)_minmax(180px,auto)_auto] md:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-semibold text-foreground">{classItem.name}</h2>
                {classItem.is_full ? <span className="rounded border border-warning/30 bg-warning/15 px-2 text-xs font-semibold text-amber-700">Turma cheia</span> : null}
              </div>
              {classItem.description ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{classItem.description}</p>
              ) : null}
            </div>

            <div className="text-sm">
              <p className="font-medium text-foreground">{formatClassSchedules(classItem.schedules)}</p>
              <p className="mt-1 text-muted-foreground">ISO: segunda=1, domingo=7</p>
            </div>

            <div className="text-sm">
              <p className="font-semibold text-foreground">{formatCapacity(classItem)}</p>
              <p className="mt-1 text-muted-foreground">
                {formatAvailableSpots(classItem.capacity, classItem.active_enrollments)}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 md:justify-end">
              <ClassStatusBadge status={classItem.status} />
              <Button
                onClick={() => onOpenClass(classItem.class_id)}
                onFocus={() => onPrefetchClass?.(classItem.class_id)}
                rightIcon={<ArrowRight className="h-4 w-4" aria-hidden />}
                variant="secondary"
              >
                Ver turma
              </Button>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
