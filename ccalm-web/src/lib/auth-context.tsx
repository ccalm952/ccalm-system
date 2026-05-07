import * as React from "react";

import { AuthContext, type AuthMe } from "@/lib/auth";

export function AuthProvider({
  me,
  setMe,
  children,
}: {
  me: AuthMe | null;
  setMe: React.Dispatch<React.SetStateAction<AuthMe | null>>;
  children: React.ReactNode;
}) {
  return <AuthContext.Provider value={{ me, setMe }}>{children}</AuthContext.Provider>;
}
