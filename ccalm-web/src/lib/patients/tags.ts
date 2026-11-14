import * as React from "react";

import { api } from "@/lib/api";

export type PatientTag = {
  id: number;
  name: string;
  color: string;
  abbreviation: string;
  enabled: boolean;
  sortOrder: number;
  count: number;
};

export const TAG_COLORS = [
  "#e11d48",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#0ea5e9",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#64748b",
];

export const DEFAULT_TAG_COLOR = "#64748b";

const TAGS_CHANGED_EVENT = "patients:tags-changed";

export function fetchPatientTags(): Promise<PatientTag[]> {
  return api<PatientTag[]>("GET", "/patients/tags");
}

/** 标签库或患者标签变动后通知所有用到标签的组件刷新 */
export function refreshPatientTags() {
  window.dispatchEvent(new Event(TAGS_CHANGED_EVENT));
}

export function usePatientTags(): PatientTag[] {
  const [tags, setTags] = React.useState<PatientTag[]>([]);
  React.useEffect(() => {
    let active = true;
    const load = () => {
      fetchPatientTags()
        .then((list) => {
          if (active) setTags(list);
        })
        .catch(() => {
          if (active) setTags([]);
        });
    };
    load();
    window.addEventListener(TAGS_CHANGED_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(TAGS_CHANGED_EVENT, load);
    };
  }, []);
  return tags;
}

export function tagColor(tags: PatientTag[], name: string): string {
  return tags.find((t) => t.name === name)?.color ?? DEFAULT_TAG_COLOR;
}

export function tagBadgeStyle(color: string): React.CSSProperties {
  return { backgroundColor: `${color}1f`, color };
}
