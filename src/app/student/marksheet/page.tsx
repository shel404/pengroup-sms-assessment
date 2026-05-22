"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRole } from "@/lib/role-context";

interface GradeItem {
  id: string;
  numericGrade: number;
  classification: string;
  assessment: { title: string; module: string; deadline: string };
}

interface MarksheetData {
  student: { fullName: string; studentId: string } | null;
  grades: GradeItem[];
}

export default function StudentMarksheetPage() {
  const { userId } = useRole();
  const [data, setData] = useState<MarksheetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/students/${userId}/marksheet`);
      const json = await res.json();
      setData(json);
      setLoading(false);
    }
    if (userId) load();
  }, [userId]);

  if (!userId) return null;
  if (loading) return <p className="text-muted-foreground p-8">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Marksheet</h1>
        {data?.student && (
          <p className="text-muted-foreground">
            {data.student.fullName} ({data.student.studentId})
          </p>
        )}
      </div>

      {!data?.grades.length ? (
        <p className="text-muted-foreground">No published grades yet.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assessment</TableHead>
                <TableHead>Module</TableHead>
                <TableHead className="text-center">Grade</TableHead>
                <TableHead>Classification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.grades.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">
                    {g.assessment.title}
                  </TableCell>
                  <TableCell>{g.assessment.module}</TableCell>
                  <TableCell className="text-center font-mono">
                    {g.numericGrade}%
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        g.classification === "Fail" ? "destructive" : "default"
                      }
                    >
                      {g.classification}
                    </Badge>
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
