'use client';

import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { World, WorldCategory } from '@/app/types';
import { getWorldName, getWorldColor } from '@/app/lib/utils/worldUtils';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface Props {
  worlds: World[];
}

interface TimeDistribution {
  name: string;
  value: number;
  category: WorldCategory;
  hoursPerWeek: number;
}

interface TimeSlotDisplay {
  day: number;
  slots: Array<{
    start: string;
    end: string;
    duration: number;
  }>;
}

export default function WorldsTimeDistribution({ worlds }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>();

  const { timeDistribution, freeTimeSlots } = useMemo(() => {
    const MINUTES_IN_WEEK = 7 * 24 * 60;
    const timeUsage = new Map<WorldCategory, number>();
    const occupiedSlots = new Map<number, Array<{ start: number; end: number }>>();

    // אתחול מערך הזמנים התפוסים לכל יום
    for (let i = 0; i < 7; i++) {
      occupiedSlots.set(i, []);
    }

    // מיפוי כל הזמנים התפוסים
    worlds.forEach(world => {
      let totalMinutes = 0;
      
      world.timeSlots?.forEach(slot => {
        const [startHour, startMin] = slot.startTime.split(':').map(Number);
        const [endHour, endMin] = slot.endTime.split(':').map(Number);
        
        let startMinutes = startHour * 60 + startMin;
        let endMinutes = endHour * 60 + endMin;
        
        // טיפול במעבר יום
        if (endMinutes < startMinutes) {
          endMinutes += 24 * 60;
        }
        
        const duration = endMinutes - startMinutes;
        totalMinutes += duration;

        const daySlots = occupiedSlots.get(slot.dayOfWeek) || [];
        daySlots.push({ start: startMinutes, end: endMinutes });
        occupiedSlots.set(slot.dayOfWeek, daySlots);
      });

      if (world.category) {
        timeUsage.set(
          world.category, 
          (timeUsage.get(world.category) || 0) + totalMinutes
        );
      }
    });

    // מציאת זמנים לא מנוצלים
    const unusedTimeSlots: TimeSlotDisplay[] = [];
    
    for (let day = 0; day < 7; day++) {
      const daySlots = occupiedSlots.get(day) || [];
      const normalizedSlots: Array<{ start: number; end: number }> = [];
      
      // נרמול הזמנים וטיפול במעבר יום
      daySlots.forEach(slot => {
        if (slot.end > 24 * 60) {
          // פיצול זמנים שחוצים את חצות
          normalizedSlots.push(
            { start: slot.start, end: 24 * 60 },
            { start: 0, end: slot.end - 24 * 60 }
          );
        } else {
          normalizedSlots.push(slot);
        }
      });

      // מיון הזמנים
      const sortedSlots = normalizedSlots.sort((a, b) => a.start - b.start);
      
      // מיזוג זמנים חופפים
      const mergedSlots: Array<{ start: number; end: number }> = [];
      sortedSlots.forEach(slot => {
        const lastSlot = mergedSlots[mergedSlots.length - 1];
        if (lastSlot && slot.start <= lastSlot.end) {
          lastSlot.end = Math.max(lastSlot.end, slot.end);
        } else {
          mergedSlots.push({ ...slot });
        }
      });

      // מציאת זמנים לא מנוצלים
      const unusedSlots: Array<{ start: string; end: string; duration: number }> = [];
      let currentTime = 6 * 60; // מתחיל מ-06:00
      const endOfDay = 23 * 60; // עד 23:00

      mergedSlots.forEach(slot => {
        const slotStart = slot.start > 24 * 60 ? slot.start - 24 * 60 : slot.start;
        const slotEnd = slot.end > 24 * 60 ? slot.end - 24 * 60 : slot.end;
        
        if (slotStart > currentTime) {
          const duration = slotStart - currentTime;
          if (duration >= 30) { // רק חלונות של 30 דקות ומעלה
            unusedSlots.push({
              start: formatMinutes(currentTime),
              end: formatMinutes(slotStart),
              duration
            });
          }
        }
        currentTime = Math.max(currentTime, slotEnd);
      });

      if (currentTime < endOfDay) {
        const duration = endOfDay - currentTime;
        if (duration >= 30) {
          unusedSlots.push({
            start: formatMinutes(currentTime),
            end: formatMinutes(endOfDay),
            duration
          });
        }
      }

      if (unusedSlots.length > 0) {
        unusedTimeSlots.push({
          day,
          slots: unusedSlots
        });
      }
    }

    // הכנת נתונים לגרף
    const distribution: TimeDistribution[] = Array.from(timeUsage.entries())
      .map(([category, minutes]) => ({
        name: getWorldName(category),
        value: (minutes / MINUTES_IN_WEEK) * 100,
        category,
        hoursPerWeek: Math.round(minutes / 60)
      }))
      .sort((a, b) => b.value - a.value);

    return { timeDistribution: distribution, freeTimeSlots: unusedTimeSlots };
  }, [worlds]);

  const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border">
          <p className="font-medium">{data.name}</p>
          <p className="text-gray-600">{data.hoursPerWeek} שעות בשבוע</p>
          <p className="text-gray-600">{data.value.toFixed(1)}% מהזמן</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold mb-6">התפלגות זמנים שבועית</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={timeDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
              >
                {timeDistribution.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={getWorldColor(entry.category)}
                    opacity={1} // תמיד מראה את הצבעים
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* סיכום שעות שבועי */}
        <div>
          <h3 className="text-lg font-medium mb-4">סיכום שעות שבועי</h3>
          <div className="space-y-3">
            {timeDistribution.map(item => (
              <div 
                key={item.name}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getWorldColor(item.category) }}
                  />
                  <span>{item.name}</span>
                </div>
                <div className="text-gray-600">
                  {item.hoursPerWeek} שעות ({item.value.toFixed(1)}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* זמנים לא מנוצלים או הודעת הצלחה */}
      {freeTimeSlots.length > 0 ? (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">זמנים לא מנוצלים</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {freeTimeSlots.map((dayData) => (
              <div 
                key={dayData.day}
                className="p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="font-medium mb-2">{DAYS[dayData.day]}</div>
                {dayData.slots.map((slot, index) => (
                  <div key={index} className="text-gray-600 text-sm">
                    {slot.start} - {slot.end}
                    <span className="text-gray-500 mr-2">
                      ({Math.round(slot.duration / 60)} שעות)
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-lg font-medium text-green-600 bg-green-50 px-4 py-2 rounded-full">
            <CheckCircleIcon className="w-6 h-6" />
            עשית עבודה טובה! ניצלת את כל הזמן שלך
          </div>
        </div>
      )}
    </div>
  );
}

// פונקציית עזר להמרת דקות לפורמט של שעה
function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
} 