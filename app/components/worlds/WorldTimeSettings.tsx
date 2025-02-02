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
  freeTimeSlots?: Array<{
    days: number[];
    slots: Array<{
      start: string;
      end: string;
      duration: number;
    }>;
  }>;
}

interface TimeRange {
  startTime: string;
  endTime: string;
  days: DayOfWeek[];  // מערך של ימים שבהם חל הטווח
}

export default function WorldTimeSettings({ world, onUpdate, freeTimeSlots }: Props) {
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>(
    groupTimeSlots(world.timeSlots || [])
  );
  const [isAdding, setIsAdding] = useState(false);
  const [newRange, setNewRange] = useState<TimeRange>({
    startTime: "09:00",
    endTime: "17:00",
    days: []
  });

  // ממיר טווח לרשימת זמנים בודדים
  const expandTimeRange = (range: TimeRange): TimeSlot[] => {
    return range.days.map(day => ({
      dayOfWeek: day,
      startTime: range.startTime,
      endTime: range.endTime
    }));
  };

  // מקבץ זמנים בודדים לטווחים
  function groupTimeSlots(slots: TimeSlot[]): TimeRange[] {
    const ranges: TimeRange[] = [];
    const sorted = [...slots].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    
    // קיבוץ לפי זמני התחלה וסיום זהים
    const timeGroups: { [key: string]: TimeSlot[] } = {};
    
    sorted.forEach(slot => {
      const timeKey = `${slot.startTime}-${slot.endTime}`;
      if (!timeGroups[timeKey]) {
        timeGroups[timeKey] = [];
      }
      timeGroups[timeKey].push(slot);
    });

    // עיבוד כל קבוצת זמנים
    Object.entries(timeGroups).forEach(([_, groupSlots]) => {
      let currentRange: TimeRange | null = null;
      
      groupSlots.forEach(slot => {
        if (!currentRange) {
          currentRange = {
            startTime: slot.startTime,
            endTime: slot.endTime,
            days: [slot.dayOfWeek as DayOfWeek]
          };
          return;
        }

        // בדיקה אם היום הנוכחי רציף
        if (slot.dayOfWeek === currentRange.days[currentRange.days.length - 1] + 1) {
          currentRange.days.push(slot.dayOfWeek as DayOfWeek);
        } else {
          // אם לא רציף, שומרים את הטווח הנוכחי ומתחילים חדש
          ranges.push(currentRange);
          currentRange = {
            startTime: slot.startTime,
            endTime: slot.endTime,
            days: [slot.dayOfWeek as DayOfWeek]
          };
        }
      });

      // הוספת הטווח האחרון
      if (currentRange) {
        ranges.push(currentRange);
      }
    });

    return ranges.sort((a, b) => a.days[0] - b.days[0]);
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
    if (range.days.length === 1) {
      return DAYS[range.days[0]].label;
    }
    // מיון הימים לפי הסדר
    const sortedDays = [...range.days].sort((a, b) => a - b);
    return sortedDays.map(day => DAYS[day].label).join(', ');
  };

  return (
    <div className="space-y-4">
      {timeRanges.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <p className="text-yellow-800">
            טרם הגדרת זמנים קבועים לעולם זה. הגדרת זמנים תעזור לך לתכנן ולנהל את המשימות שלך בצורה יעילה יותר.
          </p>
        </div>
      )}

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
            <div className="flex items-center gap-2">
              <span>
                {range.startTime}
                {range.startTime > range.endTime && <span className="text-gray-500 text-sm mr-1">(יום למחרת)</span>}
                {' - '}
                {range.endTime}
              </span>
              <span className="text-gray-500">|</span>
              <span className="font-medium">{formatDayRange(range)}</span>
            </div>
            <button
              onClick={() => removeTimeRange(index)}
              className="text-red-500 hover:text-red-700"
              title="הסר"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* טופס הוספת טווח זמנים */}
      {isAdding && (
        <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
          {freeTimeSlots && freeTimeSlots.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">זמנים פנויים מומלצים:</h4>
              <div className="grid grid-cols-1 gap-2">
                {(() => {
                  // קיבוץ לפי זמני התחלה וסיום זהים
                  const groupedByTime = freeTimeSlots.reduce((acc, dayData) => {
                    dayData.slots.forEach(slot => {
                      const timeKey = `${slot.start}-${slot.end}`;
                      if (!acc[timeKey]) {
                        acc[timeKey] = {
                          start: slot.start,
                          end: slot.end,
                          duration: slot.duration,
                          days: []
                        };
                      }
                      acc[timeKey].days.push(...dayData.days);
                    });
                    return acc;
                  }, {} as Record<string, {
                    start: string;
                    end: string;
                    duration: number;
                    days: number[];
                  }>);

                  // מיון וקיבוץ ימים רציפים
                  return Object.values(groupedByTime)
                    .map(group => {
                      const sortedDays = [...new Set(group.days)].sort((a, b) => a - b);
                      const dayRanges: number[][] = [];
                      let currentRange: number[] = [sortedDays[0]];

                      for (let i = 1; i < sortedDays.length; i++) {
                        if (sortedDays[i] === sortedDays[i-1] + 1) {
                          currentRange.push(sortedDays[i]);
                        } else {
                          dayRanges.push([...currentRange]);
                          currentRange = [sortedDays[i]];
                        }
                      }
                      dayRanges.push(currentRange);

                      return dayRanges.map(days => ({
                        start: group.start,
                        end: group.end,
                        duration: group.duration,
                        days
                      }));
                    })
                    .flat()
                    .sort((a, b) => {
                      const dayDiff = a.days[0] - b.days[0];
                      if (dayDiff !== 0) return dayDiff;
                      return a.start.localeCompare(b.start);
                    })
                    .map((timeSlot, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setNewRange({
                            startTime: timeSlot.start,
                            endTime: timeSlot.end,
                            days: timeSlot.days as DayOfWeek[]
                          });
                        }}
                        className="w-full text-right p-2 hover:bg-white rounded-md text-sm text-gray-600 hover:text-primary-600 transition-colors border border-gray-200"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            {timeSlot.days.length > 2 
                              ? `${DAYS[timeSlot.days[0]].label} - ${DAYS[timeSlot.days[timeSlot.days.length - 1]].label}`
                              : timeSlot.days.map(day => DAYS[day].label).join(', ')}
                          </span>
                          <span>
                            {timeSlot.start} - {timeSlot.end}
                            <span className="text-gray-400 mr-2">
                              ({Math.round(timeSlot.duration / 60)} שעות)
                            </span>
                          </span>
                        </div>
                      </button>
                    ));
                })()}
              </div>
            </div>
          )}

          <div className="mt-3 border-t pt-3">
            <p className="text-sm text-gray-500 mb-4">או הגדר טווח זמנים מותאם אישית:</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
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
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={newRange.endTime}
                  onChange={(e) => setNewRange(prev => ({
                    ...prev,
                    endTime: e.target.value
                  }))}
                  className="w-full rounded-md border-gray-300"
                />
                {newRange.startTime > newRange.endTime && 
                  <span className="text-gray-500 text-sm whitespace-nowrap">(יום למחרת)</span>
                }
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">בחר ימים:</label>
              <div className="grid grid-cols-4 gap-2">
                {DAYS.map(day => (
                  <label key={day.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newRange.days.includes(day.value)}
                      onChange={(e) => {
                        setNewRange(prev => ({
                          ...prev,
                          days: e.target.checked
                            ? [...prev.days, day.value]
                            : prev.days.filter(d => d !== day.value)
                        }));
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{day.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
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