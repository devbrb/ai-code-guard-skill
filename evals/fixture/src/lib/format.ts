export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatCount(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}
