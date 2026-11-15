import * as React from "react";

export type UserRole = "admin" | "user";

/** 权限点与后端 common/permissions/permissions.ts 保持一致 */
export type Permission =
  | "appointment.view"
  | "appointment.create"
  | "appointment.edit_any"
  | "appointment.delete"
  | "appointment.export"
  | "appointment.pending"
  | "appointment.settings"
  | "patient.view"
  | "patient.edit"
  | "record.view"
  | "record.edit"
  | "charge.view"
  | "charge.edit"
  | "salary.view"
  | "staff.manage"
  | "attendance.manage"
  | "report.view"
  | "warehouse.manage";

export type AuthRole = {
  id: string;
  name: string;
  bookable: boolean;
  assistable: boolean;
};

export type AuthMe = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  /** @deprecated 过渡字段：由是否拥有管理员角色推导 */
  role: UserRole;
  roles?: AuthRole[];
  permissions?: string[];
  bookable?: boolean;
  assistable?: boolean;
};

export type AuthContextValue = {
  me: AuthMe | null;
  setMe: React.Dispatch<React.SetStateAction<AuthMe | null>>;
};

export const AuthContext = React.createContext<AuthContextValue | null>(null);
