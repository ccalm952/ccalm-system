import { Module } from "@nestjs/common";

import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { JwtAuthGuard } from "./modules/auth/jwt-auth.guard";
import { APP_GUARD } from "@nestjs/core";
import { UsersModule } from "./modules/users/users.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { ChargesModule } from "./modules/charges/charges.module";
import { FeeCatalogModule } from "./modules/fee-catalog/fee-catalog.module";
import { ImplantModule } from "./modules/implant/implant.module";
import { MedicalRecordsModule } from "./modules/medical-records/medical-records.module";
import { OrthodonticsModule } from "./modules/orthodontics/orthodontics.module";
import { PatientsModule } from "./modules/patients/patients.module";
import { SalaryModule } from "./modules/salary/salary.module";
import { VisitsModule } from "./modules/visits/visits.module";
import { WarehouseModule } from "./modules/warehouse/warehouse.module";
import { WorkbenchModule } from "./modules/workbench/workbench.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    AttendanceModule,
    ChargesModule,
    FeeCatalogModule,
    ImplantModule,
    MedicalRecordsModule,
    OrthodonticsModule,
    PatientsModule,
    SalaryModule,
    VisitsModule,
    WarehouseModule,
    WorkbenchModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
