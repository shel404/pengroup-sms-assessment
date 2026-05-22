"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export type Role = "STAFF" | "STUDENT";

interface RoleState {
  role: Role;
  userId?: string;
}

interface RoleContextType {
  role: Role;
  userId?: string;
  switchRole: (role: Role, userId?: string) => void;
  authHeaders: () => Record<string, string>;
}

const RoleContext = createContext<RoleContextType>({
  role: "STAFF",
  switchRole: () => {},
  authHeaders: () => ({}),
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<RoleState>({ role: "STAFF" });

  useEffect(() => {
    const stored = localStorage.getItem("sms-role");
    const isStaffPath = window.location.pathname.startsWith("/staff");

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (isStaffPath && parsed.role === "STUDENT") {
          setState({ role: "STAFF" });
          localStorage.setItem("sms-role", JSON.stringify({ role: "STAFF" }));
          return;
        }
        setState(parsed);
      } catch {
        localStorage.removeItem("sms-role");
      }
    }
  }, []);

  const switchRole = useCallback(
    (role: Role, userId?: string) => {
      const next = { role, userId };
      localStorage.setItem("sms-role", JSON.stringify(next));
      setState(next);

      if (role === "STUDENT" && userId) {
        router.push("/student/assessments");
      } else {
        router.push("/staff");
      }
    },
    [router]
  );

  const authHeaders = useCallback(() => {
    return {
      "x-sms-role": state.role,
      "x-sms-userid": state.userId || "",
    };
  }, [state.role, state.userId]);

  return (
    <RoleContext.Provider value={{ ...state, switchRole, authHeaders }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
