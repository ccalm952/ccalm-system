import { createRoot, type Root } from "react-dom/client";
import dayjs from "dayjs";

import type { MedicalRecord } from "./patient-detail-types";
import {
  MEDICAL_RECORD_PRINT_STYLE,
  MedicalRecordPrintView,
  type PrintCourseCharge,
  type PrintPatient,
} from "./medical-record-print";

function copyStyles(targetDoc: Document) {
  for (const node of document.querySelectorAll(
    'link[rel="stylesheet"], style',
  )) {
    targetDoc.head.appendChild(node.cloneNode(true));
  }
  const style = targetDoc.createElement("style");
  style.textContent = MEDICAL_RECORD_PRINT_STYLE;
  targetDoc.head.appendChild(style);
}

/** 在隐藏 iframe 中挂载初诊打印视图并调起浏览器打印 */
export function printInitialMedicalRecord(
  patient: PrintPatient,
  record: MedicalRecord,
  courseCharge: PrintCourseCharge | null = null,
): void {
  const printedAt = dayjs().format("YYYY-MM-DD HH:mm:ss");
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "打印初诊病历");
  // 离屏但保留真实纸宽，便于牙位十字测宽与横竖线渲染
  iframe.style.cssText =
    "position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(
    '<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><div id="root"></div></body></html>',
  );
  doc.close();
  copyStyles(doc);

  const mount = doc.getElementById("root");
  if (!mount) {
    iframe.remove();
    return;
  }

  let root: Root | null = createRoot(mount);
  const cleanup = () => {
    try {
      root?.unmount();
    } catch {
      /* ignore */
    }
    root = null;
    iframe.remove();
  };

  win.addEventListener("afterprint", cleanup);
  root.render(
    <MedicalRecordPrintView
      patient={patient}
      record={record}
      printedAt={printedAt}
      courseCharge={courseCharge}
    />,
  );

  // 等样式、牙位测宽完成后再打
  window.setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      cleanup();
    }
  }, 400);
}
