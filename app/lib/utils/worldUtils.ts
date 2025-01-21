import { WorldCategory } from '@/app/types/index';

export function getWorldName(category: WorldCategory): string {
  const names: Record<WorldCategory, string> = {
    WORK: 'עבודה',
    FAMILY: 'משפחה',
    HEALTH: 'בריאות',
    PERSONAL: 'אישי',
    SOCIAL: 'חברתי',
    STUDY: 'לימודים',
    SLEEP: 'שינה',
    CUSTOM: 'מותאם אישית'
  };
  return names[category];
}

export function getWorldDescription(category: WorldCategory): string {
  const descriptions: Record<WorldCategory, string> = {
    WORK: 'התפתחות מקצועית, פרויקטים, יעדים קריירה',
    FAMILY: 'זמן איכות עם המשפחה',
    HEALTH: 'כושר גופני, תזונה, שינה',
    PERSONAL: 'תחביבים, פנאי, צמיחה אישית, זמן לעצמך',
    SOCIAL: 'חברים, אירועים חברתיים',
    STUDY: 'לימודים, קורסים, העשרה',
    SLEEP: 'זמני שינה קבועים לשיפור איכות החיים',
    CUSTOM: 'עולם בהתאמה אישית לצרכים שלך'
  };
  return descriptions[category];
}

export function getWorldIcon(category: WorldCategory): string {
  const icons: Record<WorldCategory, string> = {
    WORK: '💼',
    FAMILY: '👨‍👩‍👧‍👦',
    HEALTH: '🏃',
    PERSONAL: '🎯',
    SOCIAL: '👥',
    STUDY: '📚',
    SLEEP: '😴',
    CUSTOM: '✨'
  };
  return icons[category];
}

export function getWorldColor(category: WorldCategory): string {
  const colors: Record<WorldCategory, string> = {
    WORK: '#4F46E5',      // סגול כהה
    FAMILY: '#EC4899',    // ורוד
    HEALTH: '#10B981',    // ירוק
    PERSONAL: '#F59E0B',  // כתום
    SOCIAL: '#3B82F6',    // כחול
    STUDY: '#8B5CF6',     // סגול
    SLEEP: '#6B7280',     // אפור
    CUSTOM: '#6366F1'     // סגול בהיר
  };
  return colors[category];
} 