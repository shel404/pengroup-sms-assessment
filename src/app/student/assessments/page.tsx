"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRole } from "@/lib/role-context";

interface Assessment {
  id: string;
  title: string;
  module: string;
  deadline: string;
  status: "open" | "closed";
}

export default function StudentAssessmentsPage() {
  const { userId } = useRole();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const aRes = await fetch("/api/assessments");
      const allAssessments = await aRes.json();

      setAssessments(allAssessments);

      // Check which assessments have submissions
      if (userId) {
        const studentRes = await fetch(`/api/students/${userId}`);
        const studentData = await studentRes.json();
        const submittedIds = new Set<string>(
          studentData.submissions?.map((s: { assessmentId: string }) => s.assessmentId) || []
        );
        setSubmitted(submittedIds);
      }
    }
    if (userId) load();
  }, [userId]);

  async function handleUpload(assessmentId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("studentId", userId);

    const res = await fetch(`/api/assessments/${assessmentId}/submit`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Upload failed");
      setUploading(false);
      return;
    }

    setSubmitted((prev) => {
        const next = new Set<string>(prev);
        next.add(assessmentId);
        return next;
      });
    setUploading(false);
    e.target.value = "";
  }

  if (!userId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Assessments</h1>
        <p className="text-muted-foreground">Submit your work against open assessments</p>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</p>
      )}

      {assessments.length === 0 ? (
        <p className="text-muted-foreground">No assessments available yet.</p>
      ) : (
        <div className="grid gap-4">
          {assessments.map((a) => {
            const isLate = new Date() > new Date(a.deadline);
            const hasSubmitted = submitted.has(a.id);

            return (
              <Card key={a.id}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {a.module} — Deadline: {new Date(a.deadline).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isLate && !hasSubmitted && (
                      <Badge variant="outline" className="text-amber-600 border-amber-600">
                        Late
                      </Badge>
                    )}
                    <Badge variant={a.status === "open" ? "default" : "secondary"}>
                      {a.status === "open" ? "Open" : "Closed"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <label
                      className={cn(
                        "inline-flex items-center gap-2 cursor-pointer",
                        "px-4 py-2 rounded-md text-sm font-medium",
                        "bg-primary text-primary-foreground hover:bg-primary/90",
                        (uploading || (a.status === "closed" && isLate && hasSubmitted)) &&
                          "opacity-50 pointer-events-none"
                      )}
                    >
                      <input
                        type="file"
                        accept=".pdf,.docx"
                        className="hidden"
                        onChange={(e) => handleUpload(a.id, e)}
                        disabled={uploading}
                      />
                      {uploading
                        ? "Uploading..."
                        : hasSubmitted
                        ? "Resubmit"
                        : "Upload File"}
                    </label>
                    {hasSubmitted && (
                      <span className="text-xs text-green-600">Submitted</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      PDF or DOCX only
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
