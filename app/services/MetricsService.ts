import { World, Goal, Task, DailyPlan } from '@/app/types';
import { startOfWeek, endOfWeek, differenceInMinutes } from 'date-fns';

export class MetricsService {
  constructor(
    private worlds: World[],
    private goals: Goal[],
    private dailyPlans: DailyPlan[]
  ) {}

  // חישוב זמן שהושקע בכל עולם בשבוע האחרון
  calculateWeeklyWorldTime(world: World): {
    totalMinutes: number;
    percentageOfTarget: number;
  } {
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());
    
    // מציאת כל המשימות המושלמות של העולם בשבוע האחרון
    const completedTasks = this.dailyPlans
      .filter(plan => 
        plan.date >= weekStart && 
        plan.date <= weekEnd
      )
      .flatMap(plan => 
        plan.tasks.filter(task => 
          task.worldId === world.id &&
          task.status === 'COMPLETED' &&
          task.actualStart &&
          task.actualEnd
        )
      );

    const totalMinutes = completedTasks.reduce((sum, task) => {
      if (task.actualStart && task.actualEnd) {
        return sum + differenceInMinutes(task.actualEnd, task.actualStart);
      }
      return sum;
    }, 0);

    // חישוב יעד הזמן השבועי מתוך חלונות הזמן המועדפים
    const weeklyTargetMinutes = world.timeSlots.reduce((sum, slot) => {
      const start = new Date(`1970-01-01T${slot.startTime}Z`);
      const end = new Date(`1970-01-01T${slot.endTime}Z`);
      const slotMinutes = differenceInMinutes(end, start);
      return sum + (slotMinutes * 7); // כפול 7 ימים
    }, 0);

    const percentageOfTarget = weeklyTargetMinutes > 0 
      ? (totalMinutes / weeklyTargetMinutes) * 100 
      : 0;

    return { totalMinutes, percentageOfTarget };
  }

  // בדיקת איזון בין העולמות
  checkWorldsBalance(): {
    isBalanced: boolean;
    underInvestedWorlds: World[];
    overInvestedWorlds: World[];
  } {
    const activeWorlds = this.worlds.filter(w => w.isActive);
    const worldsTime = activeWorlds.map(world => ({
      world,
      metrics: this.calculateWeeklyWorldTime(world)
    }));

    const averagePercentage = worldsTime.reduce(
      (sum, { metrics }) => sum + metrics.percentageOfTarget, 0
    ) / worldsTime.length;

    const threshold = 20; // 20% סטייה מהממוצע נחשבת חריגה

    const underInvestedWorlds = worldsTime
      .filter(({ metrics }) => 
        metrics.percentageOfTarget < averagePercentage - threshold
      )
      .map(({ world }) => world);

    const overInvestedWorlds = worldsTime
      .filter(({ metrics }) => 
        metrics.percentageOfTarget > averagePercentage + threshold
      )
      .map(({ world }) => world);

    return {
      isBalanced: underInvestedWorlds.length === 0 && overInvestedWorlds.length === 0,
      underInvestedWorlds,
      overInvestedWorlds
    };
  }

  // חישוב התקדמות כללית בעולם
  calculateWorldProgress(world: World): {
    completedGoals: number;
    totalGoals: number;
    percentageCompleted: number;
  } {
    const worldGoals = this.goals.filter(g => g.worldId === world.id);
    const completedGoals = worldGoals.filter(g => g.isCompleted).length;
    const totalGoals = worldGoals.length;
    const percentageCompleted = totalGoals > 0 
      ? (completedGoals / totalGoals) * 100 
      : 0;

    return {
      completedGoals,
      totalGoals,
      percentageCompleted
    };
  }
} 