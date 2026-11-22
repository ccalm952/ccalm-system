import * as React from "react";

import { CLINIC_PRINT } from "@/lib/clinic-print";
import { formatMoney } from "@/lib/charges/charge-calc";
import {
  isEntryField,
  MEDICAL_RECORD_FIELD_LABELS,
  MEDICAL_RECORD_FIELDS,
  type MedicalRecordField,
} from "@/lib/medical-records/record-types";
import type { MedicalRecord } from "./patient-detail-types";
import { PlanQuoteView } from "./plan-quote";
import { ToothEntriesView } from "./tooth-entries-field";

export type PrintPatient = {
  name: string;
  gender: string;
  birthday: string | null;
  chartNo: string;
};

export type PrintCourseCharge = {
  receivable: number;
  paid: number;
  owed: number;
};

export const MEDICAL_RECORD_PRINT_STYLE = `
  @page { size: A4; margin: 16mm 14mm; }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #111;
    font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }
  .mr-print { width: 100%; }
  .mr-print-title {
    text-align: center;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.08em;
    margin: 0 0 10px;
  }
  .mr-print-rule {
    border: 0;
    border-top: 1px solid #111;
    margin: 8px 0;
  }
  .mr-print-meta {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6px 16px;
  }
  .mr-print-meta div { min-width: 0; }
  .mr-print-section { margin-top: 10px; }
  .mr-print-label {
    font-weight: 600;
    margin-bottom: 4px;
  }
  .mr-print-body { white-space: pre-wrap; word-break: break-word; min-height: 1.2em; }
  .mr-print-footer {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 6px 24px;
    align-items: start;
  }
  .mr-print-footer-left {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .mr-print-charge {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 28px;
    margin-top: 12px;
    font-variant-numeric: tabular-nums;
  }
  .mr-print-charge-owed { color: #b91c1c; }
  /* 牙位十字：屏幕用背景色，打印改用边框保证出线 */
  .mr-print .bg-sky-300.w-px {
    background: transparent !important;
    width: 0 !important;
    border-left: 1px solid #38bdf8;
  }
  .mr-print .bg-sky-300.h-px {
    background: transparent !important;
    height: 0 !important;
    border-top: 1px solid #38bdf8;
  }
`;

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      {label}：{value || "\u00a0"}
    </div>
  );
}

function PrintField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mr-print-section">
      <div className="mr-print-label">{label}</div>
      <div className="mr-print-body">{children}</div>
    </div>
  );
}

function fieldContent(
  field: MedicalRecordField,
  record: MedicalRecord,
): React.ReactNode {
  if (field === "treatmentPlan") {
    return record.treatmentPlan.length ? (
      <ToothEntriesView
        entries={record.treatmentPlan}
        hideText
        renderDetail={(index) => (
          <PlanQuoteView item={record.treatmentPlan[index]} />
        )}
      />
    ) : (
      "\u00a0"
    );
  }
  if (isEntryField(field)) {
    const entries = record[field];
    return entries.length ? <ToothEntriesView entries={entries} /> : "\u00a0";
  }
  return record[field] || "\u00a0";
}

export function MedicalRecordPrintView({
  patient,
  record,
  printedAt,
  courseCharge,
}: {
  patient: PrintPatient;
  record: MedicalRecord;
  printedAt: string;
  courseCharge: PrintCourseCharge | null;
}) {
  const fields = MEDICAL_RECORD_FIELDS[record.type].filter(
    (f): f is MedicalRecordField => f !== "treatment",
  );

  return (
    <div className="mr-print">
      <h1 className="mr-print-title">{CLINIC_PRINT.name}</h1>
      <hr className="mr-print-rule" />
      <div className="mr-print-meta">
        <MetaItem label="姓名" value={patient.name} />
        <MetaItem label="性别" value={patient.gender} />
        <MetaItem label="出生年月" value={patient.birthday ?? ""} />
        <MetaItem label="病历号" value={patient.chartNo} />
        <MetaItem label="就诊日期" value={record.visitDate} />
        <MetaItem label="医生" value={record.doctor} />
      </div>
      <hr className="mr-print-rule" />

      {fields.map((field) => (
        <PrintField key={field} label={MEDICAL_RECORD_FIELD_LABELS[field]}>
          {fieldContent(field, record)}
        </PrintField>
      ))}

      {courseCharge ? (
        <div className="mr-print-charge">
          <span>治疗应收：{formatMoney(courseCharge.receivable)}</span>
          <span>已收：{formatMoney(courseCharge.paid)}</span>
          <span
            className={
              courseCharge.owed > 0 ? "mr-print-charge-owed" : undefined
            }
          >
            欠费：{formatMoney(courseCharge.owed)}
          </span>
        </div>
      ) : null}

      <hr className="mr-print-rule" />
      <div className="mr-print-footer">
        <div className="mr-print-footer-left">
          <div>诊所电话：{CLINIC_PRINT.phone}</div>
          <div>诊所地址：{CLINIC_PRINT.address}</div>
          <div>医生签名：____________</div>
        </div>
        <div>打印日期：{printedAt}</div>
      </div>
    </div>
  );
}
