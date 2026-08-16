export const studentPhotoKeys = {
  all: ['student-photos'] as const,
  path: (path: string) => [...studentPhotoKeys.all, 'signed-url', path] as const,
}
