export type Role = {
  id: string;
  name: string;
  bookable: boolean;
  assistable: boolean;
  permissions: string[];
  builtin: boolean;
  sortOrder: number;
  userCount: number;
};

export type PermissionGroup = {
  key: string;
  label: string;
  items: { key: string; label: string }[];
};

export type RoleBrief = {
  id: string;
  name: string;
  bookable: boolean;
  assistable: boolean;
};

export type StaffUser = {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
  roles: RoleBrief[];
};
