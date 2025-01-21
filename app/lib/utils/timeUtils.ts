export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) {
    return `${remainingMinutes} דקות`;
  } else if (remainingMinutes === 0) {
    return `${hours} שעות`;
  } else {
    return `${hours}:${remainingMinutes.toString().padStart(2, '0')}`;
  }
} 