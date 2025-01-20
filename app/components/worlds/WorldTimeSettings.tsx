'use client';

import { useState } from 'react';
import { World, TimeSlot } from '@/app/types';

const DAYS = [
  { value: 0, label: 'ראשון' },
  { value: 1, label: 'שני' },
  { value: 2, label: 'שלישי' },
  { value: 3, label: 'רביעי' },
  { value: 4, label: 'חמישי' },
  { value: 5, label: 'שישי' },
  { value: 6, label: 'שבת' }
] as const;

interface Props {
  world: World;
  onUpdate: (timeSlots: TimeSlot[]) => void;
}

export default function WorldTimeSettings({ world, onUpdate }: Props) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(world.timeSlots || []);

  const handleAddSlot = () => {
    const newSlot: TimeSlot = {
      dayOfWeek: 0,
      startTime: "09:00",
      endTime: "17:00"
    };
    const updatedSlots = [...timeSlots, newSlot];
    setTimeSlots(updatedSlots);
    onUpdate(updatedSlots);
  };

  const handleRemoveSlot = (index: number) => {
    const updatedSlots = timeSlots.filter((_, i) => i !== index);
    setTimeSlots(updatedSlots);
    onUpdate(updatedSlots);
  };

  const handleSlotChange = (index: number, field: keyof TimeSlot, value: string | number) => {
    const updatedSlots = timeSlots.map((slot, i) => {
      if (i === index) {
        return { ...slot, [field]: value };
      }
      return slot;
    });
    setTimeSlots(updatedSlots);
    onUpdate(updatedSlots);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">זמנים מועדפים</h3>
      {timeSlots.map((slot, index) => (
        <div key={index} className="flex items-center gap-4">
          <select 
            value={slot.dayOfWeek}
            onChange={(e) => handleSlotChange(index, 'dayOfWeek', Number(e.target.value))}
            className="rounded-md border-gray-300"
          >
            {DAYS.map(day => (
              <option key={day.value} value={day.value}>{day.label}</option>
            ))}
          </select>
          <input 
            type="time" 
            value={slot.startTime}
            onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)}
            className="rounded-md border-gray-300"
          />
          <input 
            type="time" 
            value={slot.endTime}
            onChange={(e) => handleSlotChange(index, 'endTime', e.target.value)}
            className="rounded-md border-gray-300"
          />
          <button 
            onClick={() => handleRemoveSlot(index)}
            className="text-red-500 hover:text-red-700"
          >
            🗑️
          </button>
        </div>
      ))}
      <button 
        onClick={handleAddSlot}
        className="text-primary-500 hover:text-primary-700"
      >
        + הוסף זמן חדש
      </button>
    </div>
  );
} 