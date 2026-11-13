import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { orthodonticsCategoryLabel } from "@/lib/orthodontics/categories";
import { cn } from "cn";
import type { PatientDetail } from "./patient-detail-types";

const OVERDUE_DAYS = 30;

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-all">{value}</span>
    </div>
  );
}

function SectionTable({
  title,
  headers,
  children,
}: {
  title: string;
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr:nth-child(odd)]:bg-muted/30">
            {children}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function PatientInfoTab({ patient }: { patient: PatientDetail }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="姓名" value={patient.name} />
          <InfoItem label="病历号" value={patient.chartNo} />
          <InfoItem label="手机" value={patient.phone} />
          <InfoItem label="性别" value={patient.gender} />
          <InfoItem label="生日" value={patient.birthday ?? ""} />
          <InfoItem
            label="标签"
            value={
              <span className="flex flex-wrap gap-1">
                {patient.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </span>
            }
          />
          <InfoItem label="备注" value={patient.remark} />
        </CardContent>
      </Card>

      {patient.implantVisits.length ? (
        <SectionTable
          title="种植就诊"
          headers={["就诊日期", "牙位", "品牌", "型号", "备注", "经办"]}
        >
          {patient.implantVisits.map((v) => (
            <TableRow key={v.id}>
              <TableCell>{v.visitDate}</TableCell>
              <TableCell>
                {v.teeth
                  .map((t) => t.toothNo)
                  .filter(Boolean)
                  .join("、")}
              </TableCell>
              <TableCell>
                {[...new Set(v.teeth.map((t) => t.implantBrand))]
                  .filter(Boolean)
                  .join("、")}
              </TableCell>
              <TableCell>
                {v.teeth
                  .map((t) => t.implantModel)
                  .filter(Boolean)
                  .join("、")}
              </TableCell>
              <TableCell>{v.remark ?? ""}</TableCell>
              <TableCell>{v.staff ?? ""}</TableCell>
            </TableRow>
          ))}
        </SectionTable>
      ) : null}

      {patient.pendings.length ? (
        <SectionTable title="待种植" headers={["牙位", "拔牙日期", "备注"]}>
          {patient.pendings.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.teeth}</TableCell>
              <TableCell>{p.extractionDate ?? ""}</TableCell>
              <TableCell>{p.remark}</TableCell>
            </TableRow>
          ))}
        </SectionTable>
      ) : null}

      {patient.orthodontics.length ? (
        <SectionTable
          title="正畸"
          headers={["标签", "型号", "上次就诊", "距离上次就诊", "备注", "医生"]}
        >
          {patient.orthodontics.map((o) => (
            <TableRow key={o.id}>
              <TableCell>{orthodonticsCategoryLabel(o.category)}</TableCell>
              <TableCell>{o.applianceModel}</TableCell>
              <TableCell>{o.lastVisitDate ?? ""}</TableCell>
              <TableCell
                className={cn(
                  o.category !== "completed" &&
                    o.daysSinceLastVisit != null &&
                    o.daysSinceLastVisit > OVERDUE_DAYS &&
                    "text-destructive",
                )}
              >
                {o.daysSinceLastVisit == null
                  ? ""
                  : `${o.daysSinceLastVisit} 天`}
              </TableCell>
              <TableCell>{o.remark}</TableCell>
              <TableCell>{o.doctor}</TableCell>
            </TableRow>
          ))}
        </SectionTable>
      ) : null}
    </div>
  );
}
