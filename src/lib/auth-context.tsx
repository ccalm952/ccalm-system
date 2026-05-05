import * as React from "react";

import { AuthContext, type AuthMe } from "@/lib/auth";

export function AuthProvider({
  me,
  children,
}: {
  me: AuthMe | null;
  children: React.ReactNode;
}) {
  return <AuthContext.Provider value={{ me }}>{children}</AuthContext.Provider>;
}
