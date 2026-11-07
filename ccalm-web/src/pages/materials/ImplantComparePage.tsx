import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  implantCompareCopy,
  implantCompareFaq,
  implantCompareImplants,
  implantComparePicks,
  implantCompareRows,
  implantCompareTerms,
  type ImplantComparePair,
  type ImplantTier,
} from "@/pages/materials/implant-compare-data";
import { cn } from "cn";

const tierBadgeClass: Record<ImplantTier, string> = {
  经济: "bg-muted text-foreground",
  中端: "bg-blue-100 text-blue-950 dark:bg-blue-950 dark:text-blue-50",
  高端: "bg-violet-100 text-violet-950 dark:bg-violet-950 dark:text-violet-50",
  旗舰: "bg-orange-100 text-orange-950 dark:bg-orange-950 dark:text-orange-50",
};

const stickyLabelClass =
  "sticky left-0 z-20 whitespace-nowrap bg-card shadow-[1px_0_0_0_var(--border)]";
const stickyHeadClass =
  "sticky left-0 z-30 whitespace-nowrap bg-muted shadow-[1px_0_0_0_var(--border)]";

function SectionTitle({ children }: { children: string }) {
  return <h2 className="font-heading text-lg font-medium">{children}</h2>;
}

function KeyValueList({ rows }: { rows: ImplantComparePair[] }) {
  return (
    <div className="grid grid-cols-[minmax(7.5rem,max-content)_minmax(0,1fr)] gap-x-6 gap-y-3 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="col-span-2 grid grid-cols-subgrid">
          <div className="font-medium">{row.label}</div>
          <div>{row.value}</div>
        </div>
      ))}
    </div>
  );
}

function CompareCell({ value, stars }: { value: string; stars?: boolean }) {
  const lines = value.split("\n");
  if (stars) {
    return (
      <div className="flex flex-col items-center justify-center gap-1">
        {lines.map((line, index) => (
          <span
            key={`${line}-${index}`}
            className="whitespace-nowrap text-amber-600 dark:text-amber-400"
          >
            {line}
          </span>
        ))}
      </div>
    );
  }
  if (lines.length === 2) {
    return (
      <div className="flex flex-col items-center justify-center gap-0.5">
        <span>{lines[0]}</span>
        <span className="text-xs text-muted-foreground">{lines[1]}</span>
      </div>
    );
  }
  return (
    <span className="mx-auto block max-w-44 text-center whitespace-normal">
      {value}
    </span>
  );
}

export function ImplantComparePage() {
  return (
    <div className="bg-background p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="font-heading text-2xl font-medium text-balance">
            {implantCompareCopy.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {implantCompareCopy.subtitle}
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <SectionTitle>{implantCompareCopy.termsTitle}</SectionTitle>
          <Card>
            <CardContent>
              <KeyValueList rows={implantCompareTerms} />
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>{implantCompareCopy.tableTitle}</SectionTitle>
          <p className="text-sm text-muted-foreground">
            {implantCompareCopy.tableNote}
          </p>
          <Card>
            <CardContent>
              <ScrollArea className="w-full max-w-full [&_[data-slot=table-container]]:w-auto [&_[data-slot=table-container]]:overflow-x-visible">
                <Table className="w-full min-w-[1096px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead
                        className={cn("h-auto bg-muted", stickyHeadClass)}
                      >
                        {implantCompareCopy.cornerLabel}
                      </TableHead>
                      {implantCompareImplants.map((implant) => (
                        <TableHead
                          key={implant.name}
                          className="h-auto min-w-36 bg-muted px-3 py-3 whitespace-normal"
                        >
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <span className="whitespace-nowrap">
                              {implant.name}
                            </span>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "rounded-full",
                                tierBadgeClass[implant.tier],
                              )}
                            >
                              {implant.tier}
                            </Badge>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {implantCompareRows.map((row) => (
                      <TableRow
                        key={row.label}
                        className="hover:bg-transparent"
                      >
                        <TableCell
                          className={cn("h-auto font-medium", stickyLabelClass)}
                        >
                          {row.label}
                        </TableCell>
                        {implantCompareImplants.map((implant) => (
                          <TableCell
                            key={implant.name}
                            className="h-auto min-w-36 px-3 py-3 whitespace-normal"
                          >
                            <CompareCell
                              value={implant[row.key]}
                              stars={row.stars}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>{implantCompareCopy.picksTitle}</SectionTitle>
          <Card>
            <CardContent>
              <KeyValueList rows={implantComparePicks} />
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>{implantCompareCopy.faqTitle}</SectionTitle>
          <Card>
            <CardContent>
              <KeyValueList rows={implantCompareFaq} />
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>{implantCompareCopy.disclaimerTitle}</SectionTitle>
          <Card>
            <CardContent>
              <p className="text-sm">{implantCompareCopy.disclaimer}</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
