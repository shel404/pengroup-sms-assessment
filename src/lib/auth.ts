import { NextRequest } from "next/server";

interface Session {
  role: "STAFF" | "STUDENT";
  userId: string;
}

export function getSession(request: NextRequest): Session | null {
  const role = request.headers.get("x-sms-role");
  const userId = request.headers.get("x-sms-userid");

  if (!role || !userId) return null;
  if (role !== "STAFF" && role !== "STUDENT") return null;

  return { role, userId };
}

export function requireStaff(request: NextRequest): Session | null {
  const session = getSession(request);
  if (!session || session.role !== "STAFF") return null;
  return session;
}

export function requireOwnership(
  request: NextRequest,
  resourceStudentId: string
): boolean {
  const session = getSession(request);
  if (!session) return false;
  if (session.role === "STAFF") return true;
  return session.userId === resourceStudentId;
}
