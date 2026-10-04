import * as React from "react";

export type UserRole = "admin" | "user";

export type AuthMe = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  role: UserRole;
};

export type AuthContextValue = {
  me: AuthMe | null;
  setMe: React.Dispatch<React.SetStateAction<AuthMe | null>>;
};

export const AuthContext = React.createContext<AuthContextValue | null>(null);
