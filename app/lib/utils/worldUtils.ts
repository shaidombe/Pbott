import { WorldCategory } from '@/app/types';

export const getWorldName = (category: WorldCategory): string => {
  switch (category) {
    case WorldCategory.WORK:
      return 'עבודה';
    case WorldCategory.FAMILY:
      return 'משפחה';
    case WorldCategory.HEALTH:
      return 'בריאות';
    case WorldCategory.LEISURE:
      return 'פנאי';
    case WorldCategory.CUSTOM:
      return 'עולם מותאם אישית';
    default:
      return 'עולם חדש';
  }
};

export const getWorldDescription = (category: WorldCategory): string => {
  switch (category) {
    case WorldCategory.WORK:
      return 'התפתחות מקצועית, פרויקטים, יעדים קריירה';
    case WorldCategory.FAMILY:
      return 'זמן איכות, אירועים משפחתיים, וטיפוח הקשרים המשפחתיים';
    case WorldCategory.HEALTH:
      return 'כושר גופני, תזונה, שינה';
    case WorldCategory.LEISURE:
      return 'תחביבים, בילויים, ופעילויות הנאה';
    case WorldCategory.CUSTOM:
      return 'הגדר עולם משלך עם מטרות מותאמות אישית';
    default:
      return '';
  }
};

export const getWorldIcon = (category: WorldCategory): string => {
  switch (category) {
    case WorldCategory.WORK:
      return '💼';
    case WorldCategory.FAMILY:
      return '👨‍👩‍👧‍👦';
    case WorldCategory.HEALTH:
      return '🏃';
    case WorldCategory.LEISURE:
      return '🎮';
    case WorldCategory.CUSTOM:
      return '🌟';
    default:
      return '🌍';
  }
}; 