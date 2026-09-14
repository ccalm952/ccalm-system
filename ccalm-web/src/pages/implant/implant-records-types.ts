export type ImplantRecordRow = {
  patientId: number;
  patientName: string;
  phone: string;
  chartNo?: string;
  birthday?: string | null;
  age?: number | null;
  visitId: number;
  visitDate: string;
  remark: string | null;
  staff: string | null;
  toothId: number | null;
  toothNo: string | null;
  implantBrand: string | null;
  implantModel: string | null;
  toothRemark: string | null;
};

export type ImplantRecordsVisitDialogState =
  | { type: "add" }
  | { type: "edit"; group: ImplantRecordRow[] };

export type RecordsTableMeta = {
  mergeSpans: number[];
  selection: Set<string>;
  toggleSel: (id: string) => void;
  selectAllRows: () => void;
  clearSelection: () => void;
};
