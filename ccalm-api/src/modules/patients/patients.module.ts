import { Module } from "@nestjs/common";

import { EkqyImportService } from "./ekqy-import.service";
import { PatientsController } from "./patients.controller";
import { PatientsService } from "./patients.service";

@Module({
  controllers: [PatientsController],
  providers: [PatientsService, EkqyImportService],
})
export class PatientsModule {}
