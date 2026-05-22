"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Entry {
  student: { id: string; fullName: string; studentId: string };
  submission: {
    id: string;
    fileUrl: string;
    submittedAt: string;
    isLate: boolean;
  } | null;
  grade: {
    id: string;
    numericGrade: number;
    classification: string;
    isPublished: boolean;
  } | null;
}

interface AssessmentDetail {
  id: string;
  title: string;
  module: string;
  deadline: string;
  createdBy: string;
}

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [confirmPublish, setConfirmPublish] = useState<{
    gradeId: string;
    studentName: string;
    action: "publish" | "withhold";
  } | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/assessments/${id}/submissions`);
      const data = await res.json();
      setAssessment(data.assessment);
      setEntries(data.entries);
      const inputs: Record<string, string> = {};
      data.entries.forEach((e: Entry) => {
        if (e.grade !== null) {
          inputs[e.student.id] = String(e.grade.numericGrade);
        }
      });
      setGradeInputs(inputs);
      setLoading(false);
    }
    load();
  }, [id]);

  async function saveGrade(studentId: string) {
    const raw = gradeInputs[studentId];
    if (!raw) return;
    setSaving((s) => ({ ...s, [studentId]: true }));
    setError("");

    const res = await fetch("/api/grades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        assessmentId: id,
        numericGrade: raw,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save grade");
      setSaving((s) => ({ ...s, [studentId]: false }));
      return;
    }

    // Refresh entries
    const fresh = await fetch(`/api/assessments/${id}/submissions`);
    const freshData = await fresh.json();
    setEntries(freshData.entries);
    setSaving((s) => ({ ...s, [studentId]: false }));
  }

  async function togglePublish(gradeId: string) {
    const res = await fetch(`/api/grades/${gradeId}/publish`, {
      method: "PATCH",
    });
    if (res.ok) {
      const fresh = await fetch(`/api/assessments/${id}/submissions`);
      const freshData = await fresh.json();
      setEntries(freshData.entries);
    }
  }

  if (loading) return <p className="text-muted-foreground p-8">Loading...</p>;
  if (!assessment) return <p className="text-muted-foreground p-8">Assessment not found.</p>;

  const isClosed = new Date(assessment.deadline) < new Date();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{assessment.title}</h1>
          <Badge variant={isClosed ? "secondary" : "default"}>
            {isClosed ? "Closed" : "Open"}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          {assessment.module} — Deadline: {new Date(assessment.deadline).toLocaleString()}
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Submissions &amp; Grades</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-muted-foreground">No students enrolled.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Submission</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.student.id}>
                      <TableCell>
                        <p className="font-medium">{entry.student.fullName}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {entry.student.studentId}
                        </p>
                      </TableCell>
                      <TableCell>
                        {entry.submission ? (
                          <div className="space-x-2">
                            <a
                              href={entry.submission.fileUrl}
                              target="_blank"
                              className="text-primary underline text-sm"
                            >
                              View file
                            </a>
                            {entry.submission.isLate && (
                              <Badge
                                variant="outline"
                                className="text-amber-600 border-amber-600"
                              >
                                Late
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No submission
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            className="w-20 h-8"
                            value={
                              gradeInputs[entry.student.id] !== undefined
                                ? gradeInputs[entry.student.id]
                                : ""
                            }
                            onChange={(e) =>
                              setGradeInputs((p) => ({
                                ...p,
                                [entry.student.id]: e.target.value,
                              }))
                            }
                            placeholder="-"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={saving[entry.student.id]}
                            onClick={() => saveGrade(entry.student.id)}
                          >
                            {saving[entry.student.id] ? "..." : "Save"}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.grade?.classification ? (
                          <Badge
                            variant={
                              entry.grade.classification === "Fail"
                                ? "destructive"
                                : "default"
                            }
                          >
                            {entry.grade.classification}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.grade ? (
                          <Button
                            variant={entry.grade.isPublished ? "default" : "outline"}
                            size="sm"
                            onClick={() =>
                              setConfirmPublish({
                                gradeId: entry.grade!.id,
                                studentName: entry.student.fullName,
                                action: entry.grade!.isPublished ? "withhold" : "publish",
                              })
                            }
                          >
                            {entry.grade.isPublished ? "Published" : "Withheld"}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {/* actions placeholder */}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm publish/withhold dialog */}
      <Dialog
        open={confirmPublish !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmPublish(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmPublish?.action === "publish" ? "Publish Grade" : "Withhold Grade"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to{" "}
              <span className="font-medium">
                {confirmPublish?.action === "publish" ? "publish" : "withhold"}
              </span>{" "}
              the grade for{" "}
              <span className="font-medium">{confirmPublish?.studentName}</span>?
              {confirmPublish?.action === "publish"
                ? " The student will be able to see their result."
                : " The student will not see this result until it is published."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPublish(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (confirmPublish) {
                  togglePublish(confirmPublish.gradeId);
                  setConfirmPublish(null);
                }
              }}
            >
              {confirmPublish?.action === "publish" ? "Publish" : "Withhold"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
