'use client';

import { useState } from 'react';
import { World, TimeSlot } from '@/app/types/index';

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const DAYS = [
  { value: 0 as DayOfWeek, label: 'ראשון' },
  { value: 1 as DayOfWeek, label: 'שני' },
  { value: 2 as DayOfWeek, label: 'שלישי' },
  { value: 3 as DayOfWeek, label: 'רביעי' },
  { value: 4 as DayOfWeek, label: 'חמישי' },
  { value: 5 as DayOfWeek, label: 'שישי' },
  { value: 6 as DayOfWeek, label: 'שבת' }
] as const;

interface Props {
  world: World;
  onUpdate: (timeSlots: TimeSlot[]) => void;
}

interface TimeRange {
  startDay: DayOfWeek;
  endDay: DayOfWeek;
  startTime: string;
  endTime: string;
}

export default function WorldTimeSettings({ world, onUpdate }: Props) {
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>(
    groupTimeSlots(world.timeSlots || [])
  );
  const [isAdding, setIsAdding] = useState(false);
  const [newRange, setNewRange] = useState<TimeRange>({
    startDay: 0,
    endDay: 0,
    startTime: "09:00",
    endTime: "17:00"
  });

  // ממיר טווח לרשימת זמנים בודדים
  const expandTimeRange = (range: TimeRange): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    for (let day = range.startDay; day <= range.endDay; day++) {
      slots.push({
        dayOfWeek: day as DayOfWeek,
        startTime: range.startTime,
        endTime: range.endTime
      });
    }
    return slots;
  };

  // מקבץ זמנים בודדים לטווחים
  function groupTimeSlots(slots: TimeSlot[]): TimeRange[] {
    const ranges: TimeRange[] = [];
    const sorted = [...slots].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    
    let currentRange: TimeRange | null = null;
    
    for (const slot of sorted) {
      if (!currentRange) {
        currentRange = {
          startDay: slot.dayOfWeek,
          endDay: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime
        };
        continue;
      }

      if (currentRange.endDay + 1 === slot.dayOfWeek &&
          currentRange.startTime === slot.startTime &&
          currentRange.endTime === slot.endTime) {
        currentRange.endDay = slot.dayOfWeek;
      } else {
        ranges.push(currentRange);
        currentRange = {
          startDay: slot.dayOfWeek,
          endDay: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime
        };
      }
    }

    if (currentRange) {
      ranges.push(currentRange);
    }

    return ranges;
  }

  const handleAddTimeRange = () => {
    const updatedRanges = [...timeRanges, newRange];
    setTimeRanges(updatedRanges);
    
    // המר את כל הטווחים לזמנים בודדים ועדכן
    const allSlots = updatedRanges.flatMap(expandTimeRange);
    onUpdate(allSlots);
    
    setIsAdding(false);
  };

  const removeTimeRange = (index: number) => {
    const updatedRanges = timeRanges.filter((_, i) => i !== index);
    setTimeRanges(updatedRanges);
    
    const allSlots = updatedRanges.flatMap(expandTimeRange);
    onUpdate(allSlots);
  };

  const formatDayRange = (range: TimeRange) => {
    if (range.startDay === range.endDay) {
      return DAYS[range.startDay].label;
    }
    return `${DAYS[range.startDay].label} - ${DAYS[range.endDay].label}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">זמנים קבועים</h3>
        <button 
          onClick={() => setIsAdding(true)}
          className="text-primary-500 hover:text-primary-700"
        >
          + הוסף טווח זמנים
        </button>
      </div>

      {/* הצגת טווחי הזמנים הקיימים */}
      <div className="space-y-2">
        {timeRanges.map((range, index) => (
          <div 
            key={index}
            className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
          >
            <div>
              <span className="font-medium">{formatDayRange(range)}</span>
              <span className="mx-2">|</span>
              <span>{range.startTime} - {range.endTime}</span>
            </div>
            <button
              onClick={() => removeTimeRange(index)}
              className="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* טופס הוספת טווח זמנים */}
      {isAdding && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">מיום</label>
              <select
                value={newRange.startDay}
                onChange={(e) => setNewRange(prev => ({
                  ...prev,
                  startDay: Number(e.target.value) as DayOfWeek,
                  endDay: Math.max(Number(e.target.value), prev.endDay) as DayOfWeek
                }))}
                className="w-full rounded-md border-gray-300"
              >
                {DAYS.map(day => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">עד יום</label>
              <select
                value={newRange.endDay}
                onChange={(e) => setNewRange(prev => ({
                  ...prev,
                  endDay: Number(e.target.value) as DayOfWeek
                }))}
                className="w-full rounded-md border-gray-300"
              >
                {DAYS
                  .filter(day => day.value >= newRange.startDay)
                  .map(day => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">משעה</label>
              <input
                type="time"
                value={newRange.startTime}
                onChange={(e) => setNewRange(prev => ({
                  ...prev,
                  startTime: e.target.value
                }))}
                className="w-full rounded-md border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">עד שעה</label>
              <input
                type="time"
                value={newRange.endTime}
                onChange={(e) => setNewRange(prev => ({
                  ...prev,
                  endTime: e.target.value
                }))}
                className="w-full rounded-md border-gray-300"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              ביטול
            </button>
            <button
              onClick={handleAddTimeRange}
              className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
            >
              הוסף
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 