import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getStoredRole, storeRole } from "./api";
import type { DemoRole } from "./types";

type RoleCtx = {
  role: DemoRole;
  setRole: (role: DemoRole) => void;
};

const Ctx = createContext<RoleCtx | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<DemoRole>(() => getStoredRole());
  const value = useMemo(
    () => ({
      role,
      setRole: (next: DemoRole) => {
        storeRole(next);
        setRoleState(next);
      },
    }),
    [role],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRole(): RoleCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRole outside provider");
  return ctx;
}
