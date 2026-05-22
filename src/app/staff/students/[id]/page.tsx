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
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    referenceNumber: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [paymentSort, setPaymentSort] = useState<{
    key: "date" | "amount";
    dir: "asc" | "desc";
  }>({ key: "date", dir: "desc" });

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

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    setPaymentError("");
    setPaymentSuccess("");
    setPaymentSubmitting(true);

    const res = await fetch(`/api/students/${id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: paymentForm.amount,
        referenceNumber: paymentForm.referenceNumber.trim(),
        date: paymentForm.date || undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setPaymentError(data.error || "Failed to record payment");
      setPaymentSubmitting(false);
      return;
    }

    // Refresh student data for real-time balance update
    const studentRes = await fetch(`/api/students/${id}`);
    const updatedStudent = await studentRes.json();
    setStudent(updatedStudent);
    setEditForm({
      fullName: updatedStudent.fullName,
      email: updatedStudent.email,
      dob: updatedStudent.dob?.split("T")[0] || "",
      programmeId: updatedStudent.programme?.id || "",
      academicYear: updatedStudent.academicYear,
      status: updatedStudent.status,
    });

    setPaymentForm({
      amount: "",
      referenceNumber: "",
      date: new Date().toISOString().split("T")[0],
    });
    setPaymentSuccess("Payment recorded successfully.");
    setPaymentSubmitting(false);
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
        <div className="space-y-6">
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
                        <TableHead
                          className="cursor-pointer select-none hover:text-foreground"
                          onClick={() =>
                            setPaymentSort((s) => ({
                              key: "date",
                              dir: s.key === "date" && s.dir === "asc" ? "desc" : "asc",
                            }))
                          }
                        >
                          Date{" "}
                          {paymentSort.key === "date"
                            ? paymentSort.dir === "asc" ? "\u2191" : "\u2193"
                            : ""}
                        </TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead
                          className="text-right cursor-pointer select-none hover:text-foreground"
                          onClick={() =>
                            setPaymentSort((s) => ({
                              key: "amount",
                              dir: s.key === "amount" && s.dir === "asc" ? "desc" : "asc",
                            }))
                          }
                        >
                          Amount{" "}
                          {paymentSort.key === "amount"
                            ? paymentSort.dir === "asc" ? "\u2191" : "\u2193"
                            : ""}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...student.payments]
                        .sort((a, b) => {
                          const aVal =
                            paymentSort.key === "date"
                              ? new Date(a.date).getTime()
                              : a.amount;
                          const bVal =
                            paymentSort.key === "date"
                              ? new Date(b.date).getTime()
                              : b.amount;
                          return paymentSort.dir === "asc"
                            ? aVal - bVal
                            : bVal - aVal;
                        })
                        .map((p) => (
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

          {/* Record Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Record Payment</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentError && (
                <p className="text-sm text-destructive bg-destructive/10 p-2 rounded mb-4">
                  {paymentError}
                </p>
              )}
              {paymentSuccess && (
                <p className="text-sm text-green-600 bg-green-600/10 p-2 rounded mb-4">
                  {paymentSuccess}
                </p>
              )}
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payAmount">Amount (£) *</Label>
                    <Input
                      id="payAmount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={student.fee?.totalAmount ?? 0}
                      value={paymentForm.amount}
                      onChange={(e) =>
                        setPaymentForm((p) => ({ ...p, amount: e.target.value }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payRef">Reference Number *</Label>
                    <Input
                      id="payRef"
                      value={paymentForm.referenceNumber}
                      onChange={(e) =>
                        setPaymentForm((p) => ({
                          ...p,
                          referenceNumber: e.target.value,
                        }))
                      }
                      placeholder="e.g. PAY-2026-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payDate">Date</Label>
                    <Input
                      id="payDate"
                      type="date"
                      value={paymentForm.date}
                      onChange={(e) =>
                        setPaymentForm((p) => ({ ...p, date: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <Button type="submit" disabled={paymentSubmitting}>
                  {paymentSubmitting ? "Recording..." : "Record Payment"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
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
