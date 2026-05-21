"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Programme {
  id: string;
  name: string;
  feeAmount: number;
}

interface StudentDetail {
  id: string;
  studentId: string;
  fullName: string;
  email: string;
  dob: string;
  academicYear: string;
  status: string;
  programme: { id: string; name: string; feeAmount: number };
  fee: { id: string; totalAmount: number; dueDate: string } | null;
  payments: { id: string; amount: number; date: string; referenceNumber: string }[];
  submissions: {
    id: string;
    fileUrl: string;
    submittedAt: string;
    isLate: boolean;
    assessment: { title: string; module: string };
  }[];
  grades: {
    id: string;
    numericGrade: number;
    classification: string;
    isPublished: boolean;
    assessment: { title: string; module: string };
  }[];
  balance: { paid: number; outstanding: number; isOverdue: boolean };
}

const STATUS_OPTIONS = ["Enrolled", "Deferred", "Withdrawn", "Completed"];

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"profile" | "fees" | "submissions" | "grades">(
    "profile"
  );

  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    dob: "",
    programmeId: "",
    academicYear: "",
    status: "",
  });

  useEffect(() => {
    async function load() {
      const [studentRes, progRes] = await Promise.all([
        fetch(`/api/students/${id}`),
        fetch("/api/programmes"),
      ]);
      const studentData = await studentRes.json();
      const progData = await progRes.json();
      setStudent(studentData);
      setProgrammes(progData);
      setEditForm({
        fullName: studentData.fullName,
        email: studentData.email,
        dob: studentData.dob?.split("T")[0] || "",
        programmeId: studentData.programme?.id || "",
        academicYear: studentData.academicYear,
        status: studentData.status,
      });
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to update");
      setSaving(false);
      return;
    }
    const updated = await res.json();
    setStudent((prev) =>
      prev ? { ...prev, ...updated, programme: { ...prev.programme, ...updated.programme } } : prev
    );
    setEditMode(false);
    setSaving(false);
  }

  function statusBadge(status: string) {
    const v: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      Enrolled: "default",
      Deferred: "secondary",
      Withdrawn: "destructive",
      Completed: "outline",
    };
    return <Badge variant={v[status] || "secondary"}>{status}</Badge>;
  }

  if (loading) return <p className="text-muted-foreground p-8">Loading...</p>;
  if (!student) return <p className="text-muted-foreground p-8">Student not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{student.fullName}</h1>
          <p className="text-muted-foreground font-mono">{student.studentId}</p>
        </div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditMode(true)}>
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(["profile", "fees", "submissions", "grades"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === "profile" && (
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </p>
            )}
            {editMode ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      value={editForm.fullName}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, fullName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, email: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      value={editForm.dob}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, dob: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Academic Year</Label>
                    <Input
                      value={editForm.academicYear}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          academicYear: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Programme</Label>
                    <Select
                      value={editForm.programmeId}
                      onValueChange={(v) =>
                        setEditForm((p) => ({ ...p, programmeId: v ?? "" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {programmes.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={editForm.status}
                      onValueChange={(v) =>
                        setEditForm((p) => ({ ...p, status: v ?? "" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Full Name</Label>
                  <p>{student.fullName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p>{student.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Date of Birth</Label>
                  <p>{new Date(student.dob).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Academic Year</Label>
                  <p>{student.academicYear}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Programme</Label>
                  <p>{student.programme?.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <div className="mt-1">{statusBadge(student.status)}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fees Tab */}
      {tab === "fees" && (
        <Card>
          <CardHeader>
            <CardTitle>Fees &amp; Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {student.fee ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Total Fee</p>
                    <p className="text-lg font-bold">£{student.fee.totalAmount.toFixed(2)}</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Amount Paid</p>
                    <p className="text-lg font-bold text-green-600">
                      £{student.balance.paid.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      Outstanding
                      {student.balance.isOverdue && (
                        <Badge variant="destructive" className="ml-1 text-xs">
                          Overdue
                        </Badge>
                      )}
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        student.balance.outstanding > 0
                          ? "text-destructive"
                          : "text-green-600"
                      }`}
                    >
                      £{student.balance.outstanding.toFixed(2)}
                    </p>
                  </div>
                </div>
                {student.fee.dueDate && (
                  <p className="text-sm text-muted-foreground">
                    Due date: {new Date(student.fee.dueDate).toLocaleDateString()}
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No fee record assigned.</p>
            )}

            {student.payments.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {student.payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          {new Date(p.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {p.referenceNumber}
                        </TableCell>
                        <TableCell className="text-right">
                          £{p.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground">No payments recorded.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submissions Tab */}
      {tab === "submissions" && (
        <Card>
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {student.submissions.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assessment</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {student.submissions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {s.assessment.title}
                        </TableCell>
                        <TableCell>{s.assessment.module}</TableCell>
                        <TableCell>
                          {new Date(s.submittedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {s.isLate ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-600">
                              Late
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              On Time
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground">No submissions yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grades Tab */}
      {tab === "grades" && (
        <Card>
          <CardHeader>
            <CardTitle>Grades</CardTitle>
          </CardHeader>
          <CardContent>
            {student.grades.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assessment</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Classification</TableHead>
                      <TableHead>Published</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {student.grades.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">
                          {g.assessment.title}
                        </TableCell>
                        <TableCell>{g.assessment.module}</TableCell>
                        <TableCell>{g.numericGrade}%</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              g.classification === "Fail" ? "destructive" : "default"
                            }
                          >
                            {g.classification}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {g.isPublished ? (
                            <span className="text-green-600 text-sm">Published</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Withheld
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground">No grades recorded yet.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
