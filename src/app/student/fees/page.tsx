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

interface FeesData {
  balance: {
    totalFee: number;
    paid: number;
    outstanding: number;
    isOverdue: boolean;
    dueDate: string | null;
  };
  payments: { id: string; amount: number; date: string; referenceNumber: string }[];
}

export default function StudentFeesPage() {
  const { userId } = useRole();
  const [data, setData] = useState<FeesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/students/${userId}/fees`);
      const json = await res.json();
      setData(json);
      setLoading(false);
    }
    if (userId) load();
  }, [userId]);

  if (!userId) return null;
  if (loading) return <p className="text-muted-foreground p-8">Loading...</p>;
  if (!data) return <p className="text-muted-foreground p-8">No fee record found.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Fees</h1>
        <p className="text-muted-foreground">Track your fee payments and balance</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-xs text-muted-foreground">Total Fee</p>
          <p className="text-2xl font-bold">£{data.balance.totalFee.toFixed(2)}</p>
        </div>
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-xs text-muted-foreground">Amount Paid</p>
          <p className="text-2xl font-bold text-green-600">
            £{data.balance.paid.toFixed(2)}
          </p>
        </div>
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-xs text-muted-foreground">
            Outstanding
            {data.balance.isOverdue && (
              <Badge variant="destructive" className="ml-1">Overdue</Badge>
            )}
          </p>
          <p
            className={`text-2xl font-bold ${
              data.balance.outstanding > 0 ? "text-destructive" : "text-green-600"
            }`}
          >
            £{data.balance.outstanding.toFixed(2)}
          </p>
        </div>
      </div>

      {data.balance.dueDate && (
        <p className="text-sm text-muted-foreground">
          Due date: {new Date(data.balance.dueDate).toLocaleDateString()}
        </p>
      )}

      {data.payments.length > 0 ? (
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
              {data.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-mono text-sm">{p.referenceNumber}</TableCell>
                  <TableCell className="text-right">£{p.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-muted-foreground">No payments recorded.</p>
      )}
    </div>
  );
}
