'use client';
import { useState } from 'react';
import { Task } from '@/app/types';
import AddTaskForm from './AddTaskForm';

interface TaskListProps {
  worldId: string;
  goalId: string;
  tasks: Task[];
  onUpdate: () => Promise<void>;
}

const PRIORITY_STYLES = {
  HIGH: {
    icon: '🔥',
    className: 'bg-red-50 text-red-700 border-red-200'
  },
  MEDIUM: {
    icon: '⚡',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200'
  },
  LOW: {
    icon: '📝',
    className: 'bg-green-50 text-green-700 border-green-200'
  }
} as const;

export default function TaskList({ worldId, goalId, tasks, onUpdate }: TaskListProps) {
  const [showAddTask, setShowAddTask] = useState(false);

  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-gray-700">תתי-משימות</h4>
        <button
          onClick={() => setShowAddTask(true)}
          className="text-primary-500 text-sm hover:underline"
        >
          + הוסף תת-משימה
        </button>
      </div>

      {/* רשימת המשימות */}
      <div className="space-y-2">
        {tasks.map(task => (
          <div 
            key={task.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={task.status === 'COMPLETED'}
                onChange={() => {/* נוסיף בהמשך */}}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <div className={task.status === 'COMPLETED' ? 'line-through text-gray-400' : ''}>
                  {task.title}
                </div>
                <div className="text-sm text-gray-500">
                  {task.estimatedDuration} דקות
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`
                px-3 py-1.5 rounded-full text-sm border
                flex items-center gap-1.5
                ${PRIORITY_STYLES[task.priority].className}
              `}>
                <span>{PRIORITY_STYLES[task.priority].icon}</span>
                {getPriorityLabel(task.priority)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* כפתור הוספת משימה */}
      {!showAddTask && (
        <button
          onClick={() => setShowAddTask(true)}
          className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-500 hover:text-primary-500"
        >
          + הוסף תת-משימה
        </button>
      )}

      {/* טופס הוספת משימה */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">הוספת משימה חדשה</h3>
            <AddTaskForm
              worldId={worldId}
              goalId={goalId}
              onComplete={() => {
                setShowAddTask(false);
                onUpdate();
              }}
              onCancel={() => setShowAddTask(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const getPriorityLabel = (priority: Task['priority']) => {
  switch (priority) {
    case 'HIGH':
      return 'דחוף';
    case 'MEDIUM':
      return 'חשוב מאוד';
    case 'LOW':
      return 'צריך לעשות';
  }
}; 