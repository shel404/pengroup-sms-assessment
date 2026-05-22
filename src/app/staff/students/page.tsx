"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Student {
  id: string;
  studentId: string;
  fullName: string;
  email: string;
  academicYear: string;
  status: string;
  programmeName: string;
  outstandingBalance: number;
  isOverdue: boolean;
  createdAt: string;
}

const STATUS_OPTIONS = ["Enrolled", "Deferred", "Withdrawn", "Completed"];

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [programmeFilter, setProgrammeFilter] = useState("");
  const [programmes, setProgrammes] = useState<{ name: string }[]>([]);

  useEffect(() => {
    fetch("/api/programmes")
      .then((r) => r.json())
      .then(setProgrammes);
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("name", search);
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
    if (programmeFilter && programmeFilter !== "all") params.set("programme", programmeFilter);

    const res = await fetch(`/api/students?${params}`);
    const data = await res.json();
    setStudents(data);
    setLoading(false);
  }, [search, statusFilter, programmeFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchStudents, 300);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  function statusBadge(status: string) {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      Enrolled: "default",
      Deferred: "secondary",
      Withdrawn: "destructive",
      Completed: "outline",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-muted-foreground">Manage student records</p>
        </div>
        <Link href="/staff/students/new">
          <Button>Enrol Student</Button>
        </Link>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Search by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={programmeFilter} onValueChange={(v) => setProgrammeFilter(v ?? "")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All programmes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All programmes</SelectItem>
            {programmes.map((p) => (
              <SelectItem key={p.name} value={p.name}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : students.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">
          No students found. Try adjusting your search or{" "}
          <Link href="/staff/students/new" className="underline">
            enrol a new student
          </Link>
          .
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Programme</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-sm">{s.studentId}</TableCell>
                  <TableCell className="font-medium">{s.fullName}</TableCell>
                  <TableCell>{s.programmeName}</TableCell>
                  <TableCell>{statusBadge(s.status)}</TableCell>
                  <TableCell>
                    <span className="font-mono">
                      £{s.outstandingBalance.toFixed(2)}
                    </span>
                    {s.isOverdue && (
                      <Badge variant="destructive" className="ml-2">
                        Overdue
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/staff/students/${s.id}`}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
