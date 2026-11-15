import { Module } from "@nestjs/common";

import { PrismaModule } from "./prisma/prisma.module";
import { PermissionsModule } from "./common/permissions/permissions.module";
import { PermissionsGuard } from "./common/permissions/permissions.guard";
import { AuthModule } from "./modules/auth/auth.module";
import { JwtAuthGuard } from "./modules/auth/jwt-auth.guard";
import { APP_GUARD } from "@nestjs/core";
import { UsersModule } from "./modules/users/users.module";
import { RolesModule } from "./modules/roles/roles.module";
import { AppointmentsModule } from "./modules/appointments/appointments.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { ChargesModule } from "./modules/charges/charges.module";
import { FeeCatalogModule } from "./modules/fee-catalog/fee-catalog.module";
import { FollowUpsModule } from "./modules/follow-ups/follow-ups.module";
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
    PermissionsModule,
    AuthModule,
    UsersModule,
    RolesModule,
    AppointmentsModule,
    AttendanceModule,
    ChargesModule,
    FeeCatalogModule,
    FollowUpsModule,
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
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
