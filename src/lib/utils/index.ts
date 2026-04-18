export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function completionPercent(
  total: number,
  completed: number
): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}
