import { WorldCategory } from '@/app/types';

export function getWorldColor(category: WorldCategory): string {
  const colors: Record<WorldCategory, string> = {
    WORK: '#2196F3',
    FAMILY: '#E91E63',
    HEALTH: '#4CAF50',
    PERSONAL: '#9C27B0',
    SOCIAL: '#FF9800',
    STUDY: '#673AB7',
    SLEEP: '#00BCD4',
    CUSTOM: '#9E9E9E'
  };

  return colors[category];
} 