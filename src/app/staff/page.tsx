"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, AlertTriangle, Users } from "lucide-react";

export default function StaffDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    overdueCount: 0,
    enrolledCount: 0,
  });
  const [overdueStudents, setOverdueStudents] = useState<
    { id: string; studentId: string; fullName: string; balance: number }[]
  >([]);

  useEffect(() => {
    async function load() {
      const [studentsRes, overdueRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/dashboard/overdue"),
      ]);
      const students = await studentsRes.json();
      const overdue = await overdueRes.json();

      setStats({
        totalStudents: students.length,
        overdueCount: overdue.length,
        enrolledCount: students.filter(
          (s: { status: string }) => s.status === "Enrolled"
        ).length,
      });
      setOverdueStudents(overdue);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Registry overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Students
            </CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalStudents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enrolled
            </CardTitle>
            <GraduationCap className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.enrolledCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue Fees
            </CardTitle>
            <AlertTriangle className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">
              {stats.overdueCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue widget */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Students with Overdue Balance
          </CardTitle>
          <Link href="/staff/students">
            <Button variant="outline" size="sm">
              View All Students
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {overdueStudents.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No students with overdue balances.
            </p>
          ) : (
            <div className="space-y-2">
              {overdueStudents.map((s) => (
                <Link
                  key={s.id}
                  href={`/staff/students/${s.id}`}
                  className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{s.fullName}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {s.studentId}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-destructive font-medium">
                      £{s.balance.toFixed(2)}
                    </span>
                    <Badge variant="destructive">Overdue</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
