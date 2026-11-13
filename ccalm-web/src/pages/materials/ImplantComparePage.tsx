import { Button } from "@/components/ui/button";
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
  implantCompareColumns,
  implantCompareConsultationCalendar,
  implantCompareCopy,
  implantCompareRows,
  type ImplantCatalog,
} from "@/pages/materials/implant-compare-data";

const implants = implantCompareColumns.flatMap((column) =>
  "implants" in column ? column.implants : [column],
);

function CompareCell({ value }: { value: string }) {
  const lines = value.split("\n");
  if (lines.length > 1) {
    return (
      <div className="flex flex-col items-center justify-center gap-0.5">
        {lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
    );
  }
  return value;
}

function CatalogLink({ catalog }: { catalog: ImplantCatalog }) {
  return (
    <Button
      variant="link"
      className="h-auto min-w-0 px-0"
      nativeButton={false}
      render={<a href={catalog.url} target="_blank" rel="noreferrer" />}
    >
      {catalog.label}
    </Button>
  );
}

function HeaderLabel({
  name,
  catalogs,
}: {
  name: string;
  catalogs?: ImplantCatalog[];
}) {
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <span>{name}</span>
      {catalogs && (
        <div className="flex justify-center gap-3">
          {catalogs.map((catalog) => (
            <CatalogLink key={catalog.url} catalog={catalog} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ImplantComparePage() {
  return (
    <div className="bg-background p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3">
        <Card>
          <CardContent>
            <ScrollArea>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead rowSpan={2}>
                      {implantCompareCopy.cornerLabel}
                    </TableHead>
                    {implantCompareColumns.map((column) =>
                      "implants" in column ? (
                        <TableHead
                          key={column.name}
                          colSpan={column.implants.length}
                        >
                          <HeaderLabel
                            name={column.name}
                            catalogs={column.catalogs}
                          />
                        </TableHead>
                      ) : (
                        <TableHead key={column.name} rowSpan={2}>
                          <HeaderLabel
                            name={column.name}
                            catalogs={column.catalogs}
                          />
                        </TableHead>
                      ),
                    )}
                  </TableRow>
                  <TableRow>
                    {implantCompareColumns.flatMap((column) =>
                      "implants" in column
                        ? column.implants.map((implant) => (
                            <TableHead key={implant.name}>
                              {implant.name}
                            </TableHead>
                          ))
                        : [],
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {implantCompareRows.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell>{row.label}</TableCell>
                      {implants.map((implant) => (
                        <TableCell key={implant.name}>
                          <CompareCell value={implant[row.key]} />
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
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <p>{implantCompareCopy.materialNote}</p>
          <p>{implantCompareCopy.surfaceNote}</p>
        </div>
        <div>
          <CatalogLink catalog={implantCompareConsultationCalendar} />
        </div>
      </div>
    </div>
  );
}
