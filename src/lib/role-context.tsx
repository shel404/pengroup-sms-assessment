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
}

const RoleContext = createContext<RoleContextType>({
  role: "STAFF",
  switchRole: () => {},
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<RoleState>({ role: "STAFF" });

  useEffect(() => {
    const stored = localStorage.getItem("sms-role");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
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

  return (
    <RoleContext.Provider value={{ ...state, switchRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
