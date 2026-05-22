"use client";

import { useEffect, useState } from "react";
import { useRole } from "@/lib/role-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Shield, User } from "lucide-react";

interface StudentOption {
  id: string;
  fullName: string;
  studentId: string;
}

export function RoleToggle() {
  const { role, userId, switchRole } = useRole();
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(userId || "");

  const loadStudents = async () => {
    const res = await fetch("/api/students?status=Enrolled&limit=50");
    const data = await res.json();
    setStudents(data);
  };

  useEffect(() => { loadStudents(); }, []);

  useEffect(() => {
    function onRefresh() { loadStudents(); }
    window.addEventListener("student-list-refresh", onRefresh);
    return () => window.removeEventListener("student-list-refresh", onRefresh);
  }, []);

  useEffect(() => {
    setSelectedStudentId(userId || "");
  }, [userId]);

  function handleStudentSelect(studentId: string) {
    if (!studentId) return;
    switchRole("STUDENT", studentId);
  }

  return (
    <div className="flex items-center gap-2">
      {role === "STAFF" ? (
        <div className="space-y-2 w-full">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            <span className="text-sm font-medium text-primary">Staff</span>
          </div>
          <Select value={selectedStudentId} onValueChange={(v) => v && handleStudentSelect(v)}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue placeholder="Switch to Student..." />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.fullName} ({s.studentId})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => switchRole("STAFF")}
          className="gap-2"
        >
          <User className="size-4" />
          Switch to Staff
        </Button>
      )}
    </div>
  );
}
