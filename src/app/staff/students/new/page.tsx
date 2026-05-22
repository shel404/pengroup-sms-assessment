"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Programme {
  id: string;
  name: string;
  feeAmount: number;
}

export default function EnrolStudentPage() {
  const router = useRouter();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    dob: "",
    programmeId: "",
    academicYear: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
    status: "Enrolled",
  });

  useEffect(() => {
    async function loadProgrammes() {
      const res = await fetch("/api/programmes");
      const data = await res.json();
      setProgrammes(data);
    }
    loadProgrammes();
  }, []);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.fullName || !form.email || !form.dob || !form.programmeId) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to enrol student.");
      setSubmitting(false);
      return;
    }

    window.dispatchEvent(new CustomEvent("student-list-refresh"));
    router.push("/staff/students");
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Enrol Student</h1>
        <p className="text-muted-foreground">Create a new student record</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="e.g. john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth *</Label>
              <Input
                id="dob"
                type="date"
                max={new Date().toISOString().split("T")[0]}
                value={form.dob}
                onChange={(e) => update("dob", e.target.value)}
              />
            </div>

            <div className="space-y-2 min-w-72">
              <Label htmlFor="programme">Programme *</Label>
              <Select
                value={form.programmeId}
                onValueChange={(v) => update("programmeId", v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select programme" />
                </SelectTrigger>
                <SelectContent>
                  {programmes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (fee £{p.feeAmount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="academicYear">Academic Year</Label>
              <Input
                id="academicYear"
                value={form.academicYear}
                onChange={(e) => update("academicYear", e.target.value)}
                placeholder="e.g. 2026/2027"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Enrolment Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => update("status", v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Enrolled", "Deferred", "Withdrawn", "Completed"].map(
                    (s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Enrolling..." : "Enrol Student"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
