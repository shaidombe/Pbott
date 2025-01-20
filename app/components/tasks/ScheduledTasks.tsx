'use client';

import { useEffect, useState } from 'react';
import { Task, World } from '@/app/types';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface ScheduledTasksProps {
  tasks: Task[];
  world: World;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ScheduledTasks({ tasks, world }: ScheduledTasksProps) {
  const [groupedTasks, setGroupedTasks] = useState<{ [date: string]: Task[] }>({});

  useEffect(() => {
    const grouped = tasks.reduce((acc, task) => {
      if (!task.scheduledStart) return acc;
      
      const dateKey = format(new Date(task.scheduledStart), 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(task);
      return acc;
    }, {} as { [date: string]: Task[] });

    // מיון המשימות לפי זמן התחלה
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => {
        if (!a.scheduledStart || !b.scheduledStart) return 0;
        return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime();
      });
    });

    setGroupedTasks(grouped);
  }, [tasks]);

  return (
    <div className="space-y-6">
      {Object.entries(groupedTasks).map(([date, dayTasks]) => (
        <div key={date} className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-medium text-lg mb-3">
            {format(new Date(date), 'EEEE, d בMMMM', { locale: he })}
          </h3>
          <div className="space-y-2">
            {dayTasks.map(task => (
              <div 
                key={task.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-16 text-sm text-gray-600">
                    {task.scheduledStart && format(new Date(task.scheduledStart), 'HH:mm')}
                  </div>
                  <div>
                    <div>{task.title}</div>
                    <div className="text-sm text-gray-500">
                      {task.estimatedDuration} דקות
                    </div>
                  </div>
                </div>
                {task.isOutOfPreferredTime && (
                  <span className="text-yellow-600 text-sm">
                    מחוץ לשעות המועדפות
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
} 