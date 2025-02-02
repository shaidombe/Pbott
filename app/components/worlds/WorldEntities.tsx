import { useState, useEffect } from 'react';
import { WorldEntity, WORLD_ENTITY_TYPES, WorldCategory } from '@/app/types';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useApp } from '@/app/contexts/AppContext';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface EntityTemplate {
  namePlaceholder: string;
  descPlaceholder: string;
  descTemplate?: (name: string, birthDate: string | null) => string;
  showBirthDate?: boolean;
}

// פונקציית עזר לחישוב גיל
const calculateAge = (birthDate: string | null): number | null => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const ENTITY_PLACEHOLDERS: Record<string, EntityTemplate> = {
  'בן זוג': {
    namePlaceholder: 'מה שם בן הזוג שלך?',
    descPlaceholder: 'ספר לי קצת על בן הזוג שלך...',
    descTemplate: (name, birthDate) => {
      const age = calculateAge(birthDate);
      console.log('Calculating age for בן זוג:', { name, birthDate, age });
      return `${name} בן הזוג שלי ${age ? `(בן ${age})` : ''}`;
    },
    showBirthDate: true
  },
  'בת זוג': {
    namePlaceholder: 'מה שם בת הזוג שלך?',
    descPlaceholder: 'ספר לי קצת על בת הזוג שלך...',
    descTemplate: (name, birthDate) => {
      const age = calculateAge(birthDate);
      console.log('Calculating age for בת זוג:', { name, birthDate, age });
      return `${name} בת הזוג שלי ${age ? `(בת ${age})` : ''}`;
    },
    showBirthDate: true
  },
  'בן': {
    namePlaceholder: 'מה שם הבן שלך?',
    descPlaceholder: 'ספר לי קצת על הבן שלך...',
    descTemplate: (name, birthDate) => {
      const age = calculateAge(birthDate);
      console.log('Calculating age for בן:', { name, birthDate, age });
      return `${name} הבן שלי היקר ${age ? `(בן ${age})` : ''} שאני אוהב אותו הכי בעולם ואני רוצה להשקיע בו זמן איכות`;
    },
    showBirthDate: true
  },
  'בת': {
    namePlaceholder: 'מה שם הבת שלך?',
    descPlaceholder: 'ספר לי קצת על הבת שלך...',
    descTemplate: (name, birthDate) => {
      const age = calculateAge(birthDate);
      console.log('Calculating age for בת:', { name, birthDate, age });
      return `${name} הבת שלי היקרה ${age ? `(בת ${age})` : ''} שאני אוהב אותה הכי בעולם ואני רוצה להשקיע בה זמן איכות`;
    },
    showBirthDate: true
  },
  'אח': {
    namePlaceholder: 'מה שם האח שלך?',
    descPlaceholder: 'ספר לי קצת על האח שלך...',
    descTemplate: (name, birthDate) => {
      const age = calculateAge(birthDate);
      console.log('Calculating age for אח:', { name, birthDate, age });
      return `${name} האח שלי ${age ? `(בן ${age})` : ''}`;
    },
    showBirthDate: true
  },
  'אחות': {
    namePlaceholder: 'מה שם האחות שלך?',
    descPlaceholder: 'ספר לי קצת על האחות שלך...',
    descTemplate: (name, birthDate) => {
      const age = calculateAge(birthDate);
      console.log('Calculating age for אחות:', { name, birthDate, age });
      return `${name} האחות שלי ${age ? `(בת ${age})` : ''}`;
    },
    showBirthDate: true
  },
  'אבא': {
    namePlaceholder: 'מה שם האבא שלך?',
    descPlaceholder: 'ספר לי קצת על האבא שלך...',
    showBirthDate: true
  },
  'אמא': {
    namePlaceholder: 'מה שם האמא שלך?',
    descPlaceholder: 'ספר לי קצת על האמא שלך...',
    showBirthDate: true
  },
  'סבא': {
    namePlaceholder: 'מה שם הסבא שלך?',
    descPlaceholder: 'ספר לי קצת על הסבא שלך...',
    showBirthDate: true
  },
  'סבתא': {
    namePlaceholder: 'מה שם הסבתא שלך?',
    descPlaceholder: 'ספר לי קצת על הסבתא שלך...',
    showBirthDate: true
  },
  'קרוב משפחה אחר': {
    namePlaceholder: 'מה שם קרוב המשפחה שלך?',
    descPlaceholder: 'ספר לי קצת על קרוב המשפחה שלך...',
    showBirthDate: true
  },
  'חבר': {
    namePlaceholder: 'מה שם החבר שלך?',
    descPlaceholder: 'ספר לי קצת על החבר שלך...',
    showBirthDate: true
  },
  'חברה': {
    namePlaceholder: 'מה שם החברה שלך?',
    descPlaceholder: 'ספר לי קצת על החברה שלך...',
    showBirthDate: true
  },
  'שנת לילה': {
    namePlaceholder: 'שנת לילה',
    descPlaceholder: 'תיאור הרגלי השינה...',
    descTemplate: () => 'לישון מינימום 7 שעות בלילה לשמירה על בריאות ואיכות חיים'
  }
};

interface Props {
  worldId: string;
  category: WorldCategory;
  entities: WorldEntity[];
  onUpdate: () => void;
  showQuickAdd: boolean;
  setShowQuickAdd: (show: boolean) => void;
  selectedEntity: WorldEntity | null;
  setSelectedEntity: (entity: WorldEntity | null) => void;
}

// נוסיף פונקציית עזר לפורמוט הגיל והשם
const formatEntityDisplay = (entity: WorldEntity) => {
  if (!entity.birthDate) return `#${entity.type} ${entity.name}`;
  
  const age = calculateAge(entity.birthDate);
  if (!age) return `#${entity.type} ${entity.name}`;
  
  // הפורמט החדש - הגיל בסוגריים אחרי השם
  return `#${entity.type} ${entity.name} (${age})`;
};

export default function WorldEntities({ worldId, category, entities, onUpdate, showQuickAdd, setShowQuickAdd, selectedEntity, setSelectedEntity }: Props) {
  const { user } = useApp();
  const [newEntity, setNewEntity] = useState(() => ({
    type: selectedEntity?.type || WORLD_ENTITY_TYPES[category][0],
    name: selectedEntity?.name || '',
    description: selectedEntity?.description || '',
    birthDate: selectedEntity?.birthDate || null
  }));

  // עדכון הערכים כשנבחרת ישות לעריכה
  useEffect(() => {
    if (selectedEntity) {
      setNewEntity({
        type: selectedEntity.type,
        name: selectedEntity.name,
        description: selectedEntity.description,
        birthDate: selectedEntity.birthDate || null
      });
    } else {
      setNewEntity({
        type: WORLD_ENTITY_TYPES[category][0],
        name: '',
        description: '',
        birthDate: null
      });
    }
  }, [selectedEntity, category]);

  // כשמשתנה סוג הישות, נעדכן את התיאור אם יש תבנית
  useEffect(() => {
    console.log('Effect triggered:', { type: newEntity.type, name: newEntity.name, birthDate: newEntity.birthDate });
    const template = ENTITY_PLACEHOLDERS[newEntity.type]?.descTemplate;
    if (template && newEntity.name) {
      const newDescription = template(newEntity.name, newEntity.birthDate);
      console.log('New description:', newDescription);
      setNewEntity(prev => ({
        ...prev,
        description: newDescription
      }));
    }
  }, [newEntity.type, newEntity.name, newEntity.birthDate]);

  const currentPlaceholders = ENTITY_PLACEHOLDERS[newEntity.type] || {
    namePlaceholder: 'שם',
    descPlaceholder: 'תיאור קצר...'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newEntity.name.trim()) return;

    try {
      if (selectedEntity) {
        // עריכת ישות קיימת
        const entityRef = doc(db, `users/${user.id}/worlds/${worldId}/entities/${selectedEntity.id}`);
        await updateDoc(entityRef, {
          ...newEntity,
          updatedAt: new Date()
        });
      } else {
        // הוספת ישות חדשה
        const entityRef = collection(db, `users/${user.id}/worlds/${worldId}/entities`);
        await addDoc(entityRef, {
          ...newEntity,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      setNewEntity({
        type: WORLD_ENTITY_TYPES[category][0],
        name: '',
        description: '',
        birthDate: null
      });
      setSelectedEntity(null);
      setShowQuickAdd(false);
      onUpdate();
    } catch (error) {
      console.error('Error saving entity:', error);
    }
  };

  const handleDelete = async (entityId: string) => {
    if (!user) return;
    
    try {
      await deleteDoc(doc(db, `users/${user.id}/worlds/${worldId}/entities/${entityId}`));
      onUpdate();
    } catch (error) {
      console.error('Error deleting entity:', error);
    }
  };

  return (
    <Dialog as="div" className="relative z-10" open={showQuickAdd} onClose={() => {
      setShowQuickAdd(false);
      setSelectedEntity(null);
    }}>
      <Transition.Child
        as={Fragment}
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="fixed inset-0 bg-black bg-opacity-25" />
      </Transition.Child>
      
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-right align-middle shadow-xl transition-all">
            <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
              {selectedEntity ? 'עריכת ישות' : 'הוספת ישות חדשה'}
            </Dialog.Title>

            <form onSubmit={handleSubmit} className="space-y-4">
              <select
                value={newEntity.type}
                onChange={(e) => setNewEntity(prev => ({ ...prev, type: e.target.value }))}
                className="w-full p-2 border rounded-md"
              >
                {WORLD_ENTITY_TYPES[category].map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <input
                type="text"
                value={newEntity.name}
                onChange={(e) => setNewEntity(prev => ({ ...prev, name: e.target.value }))}
                placeholder={currentPlaceholders.namePlaceholder}
                className="w-full p-3 border rounded-md"
              />

              {currentPlaceholders.showBirthDate && (
                <div>
                  <label className="block text-sm font-medium mb-1">תאריך לידה (אופציונאלי)</label>
                  <input
                    type="date"
                    value={newEntity.birthDate || ''}
                    onChange={(e) => setNewEntity(prev => ({ 
                      ...prev, 
                      birthDate: e.target.value || null 
                    }))}
                    className="w-full p-3 border rounded-md"
                  />
                </div>
              )}

              <textarea
                value={newEntity.description}
                onChange={(e) => setNewEntity(prev => ({ ...prev, description: e.target.value }))}
                placeholder={currentPlaceholders.descPlaceholder}
                className="w-full p-3 border rounded-md"
                rows={3}
              />

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAdd(false);
                    setSelectedEntity(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
                >
                  {selectedEntity ? 'שמור שינויים' : 'הוסף'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </div>

      {/* נעדכן את התצוגה של הישויות */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {entities.map(entity => (
          <div
            key={entity.id}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => {
              setSelectedEntity(entity);
              setShowQuickAdd(true);
            }}
          >
            <div className="font-medium">
              {formatEntityDisplay(entity)}
            </div>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {entity.description}
            </p>
          </div>
        ))}
      </div>
    </Dialog>
  );
} 