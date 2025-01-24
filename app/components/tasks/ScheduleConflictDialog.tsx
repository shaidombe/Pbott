import { Task, CalendarEvent } from '@/app/types';
import { format } from 'date-fns';

interface ScheduleConflictDialogProps {
  task: Task;
  conflicts: {
    scheduledStart: Date;
    isOutOfPreferredTime: boolean;
    conflictingEvents?: CalendarEvent[];
  };
  onConfirm: (scheduledStart: Date) => void;
  onCancel: () => void;
  onFindAlternative: () => void;
}

export function ScheduleConflictDialog({
  conflicts,
  onConfirm,
  onCancel,
  onFindAlternative
}: ScheduleConflictDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">התנגשות בתזמון המשימה</h3>
        
        <div className="space-y-4">
          {conflicts.isOutOfPreferredTime && (
            <p className="text-yellow-600">
              הזמן המוצע ({format(conflicts.scheduledStart, 'HH:mm')}) 
              נמצא מחוץ לשעות המועדפות
            </p>
          )}
          
          {conflicts.conflictingEvents?.map(event => (
            <div key={event.id} className="bg-red-50 p-3 rounded-lg">
              <p>התנגשות עם האירוע: {event.summary || 'אירוע ללא כותרת'}</p>
              <p className="text-sm text-gray-600">
                {format(new Date(event.start.dateTime), 'HH:mm')} - {format(new Date(event.end.dateTime), 'HH:mm')}
              </p>
            </div>
          ))}
          
          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={() => onConfirm(conflicts.scheduledStart)}
              className="w-full p-3 bg-primary-500 text-white rounded-lg"
            >
              קבע בכל זאת
            </button>
            
            <button
              onClick={onFindAlternative}
              className="w-full p-3 border border-gray-300 rounded-lg"
            >
              מצא זמן חלופי
            </button>
            
            <button
              onClick={onCancel}
              className="w-full p-3 text-gray-600"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 