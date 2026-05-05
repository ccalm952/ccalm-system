import * as React from "react";

export type AuthMe = {
  id: string;
  username: string;
  displayName: string;
  role: string;
};

export type AuthContextValue = {
  me: AuthMe | null;
};

export const AuthContext = React.createContext<AuthContextValue | null>(null);
