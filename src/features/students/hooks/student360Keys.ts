export const student360Keys = {
  all: ['student360'] as const,
  guardians: {
    all: () => [...student360Keys.all, 'guardians'] as const,
    candidates: (params: { email?: string | null; phone?: string | null }) =>
      [...student360Keys.guardians.all(), 'candidates', params] as const,
  },
  classes: {
    list: () => [...student360Keys.all, 'classes', 'list'] as const,
  },
  relations: {
    detail: (studentId: string) => [...student360Keys.all, 'relations', studentId] as const,
  },
}
