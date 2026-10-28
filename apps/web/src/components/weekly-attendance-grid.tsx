"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getWeeklyDailyAttendance, setDailyAttendance } from "@/lib/actions/daily-attendance";

function getStartOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 is Sunday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  return new Date(d.setDate(diff));
}

function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDay(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function formatDayNum(date: Date): string {
  return date.getDate().toString();
}

export function WeeklyAttendanceGrid() {
  const [startDate] = useState(() => getStartOfWeek(new Date()));
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push(d);
  }

  useEffect(() => {
    getWeeklyDailyAttendance(formatDate(startDate)).then(setAttendance);
  }, [startDate]);

  function toggleDay(dateStr: string) {
    const current = attendance[dateStr] ?? false;
    const next = !current;
    setAttendance((prev) => ({ ...prev, [dateStr]: next }));
    startTransition(async () => {
      await setDailyAttendance(dateStr, next);
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center">Weekly Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dateStr = formatDate(day);
            const attended = attendance[dateStr] ?? false;
            const isToday = formatDate(new Date()) === dateStr;
            return (
              <Button
                key={dateStr}
                variant={attended ? "default" : "outline"}
                size="sm"
                className={`flex h-14 flex-col p-1 ${isToday ? "ring-2 ring-primary" : ""}`}
                onClick={() => toggleDay(dateStr)}
                disabled={isPending}
                aria-label={`Mark attendance for ${formatDay(day)} ${formatDayNum(day)}`}
              >
                <span className="text-xs">{formatDay(day)}</span>
                <span className="text-sm font-semibold">{formatDayNum(day)}</span>
              </Button>
            );
          })}
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">Tap once per day</p>
      </CardContent>
    </Card>
  );
}
