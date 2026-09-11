-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('IN_BUILD', 'BLOCKED', 'READY_FOR_TEST', 'IN_TEST', 'COMPLETE');

-- CreateEnum
CREATE TYPE "PartStatus" AS ENUM ('RECEIVED', 'INSPECTED', 'NDT_OK', 'INSTALLED', 'BLOCKED', 'SCRAPPED');

-- CreateEnum
CREATE TYPE "NcrStatus" AS ENUM ('OPEN', 'CONTAINED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EcoStatus" AS ENUM ('OPEN', 'IMPLEMENTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('PART_STATUS_CHANGED', 'PART_INSTALLED', 'PART_REMOVED', 'CERT_ATTACHED', 'NCR_OPENED', 'NCR_CLOSED', 'ECO_OPENED', 'ECO_CLOSED', 'READINESS_EVALUATED', 'READINESS_PASSED', 'READINESS_BLOCKED');

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'IN_BUILD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'IN_BUILD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requiredPn" TEXT NOT NULL,
    "requiredRevision" TEXT NOT NULL,
    "critical" BOOLEAN NOT NULL DEFAULT true,
    "installedPartId" TEXT,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Part" (
    "id" TEXT NOT NULL,
    "pn" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "lot" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "status" "PartStatus" NOT NULL DEFAULT 'RECEIVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "dummyUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ncr" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "partId" TEXT,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "status" "NcrStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Ncr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Eco" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "affectsPn" TEXT NOT NULL,
    "newRevision" TEXT NOT NULL,
    "status" "EcoStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Eco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "stageId" TEXT,
    "partId" TEXT,
    "actorRole" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_code_key" ON "Vehicle"("code");

-- CreateIndex
CREATE INDEX "Stage_vehicleId_idx" ON "Stage"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_vehicleId_code_key" ON "Stage"("vehicleId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Position_installedPartId_key" ON "Position"("installedPartId");

-- CreateIndex
CREATE INDEX "Position_stageId_idx" ON "Position"("stageId");

-- CreateIndex
CREATE UNIQUE INDEX "Position_stageId_code_key" ON "Position"("stageId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Part_serial_key" ON "Part"("serial");

-- CreateIndex
CREATE INDEX "Part_pn_idx" ON "Part"("pn");

-- CreateIndex
CREATE INDEX "Certificate_partId_idx" ON "Certificate"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "Ncr_code_key" ON "Ncr"("code");

-- CreateIndex
CREATE INDEX "Ncr_stageId_idx" ON "Ncr"("stageId");

-- CreateIndex
CREATE INDEX "Ncr_partId_idx" ON "Ncr"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "Eco_code_key" ON "Eco"("code");

-- CreateIndex
CREATE INDEX "Eco_vehicleId_idx" ON "Eco"("vehicleId");

-- CreateIndex
CREATE INDEX "Eco_affectsPn_idx" ON "Eco"("affectsPn");

-- CreateIndex
CREATE INDEX "AuditEvent_stageId_idx" ON "AuditEvent"("stageId");

-- CreateIndex
CREATE INDEX "AuditEvent_partId_idx" ON "AuditEvent"("partId");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_installedPartId_fkey" FOREIGN KEY ("installedPartId") REFERENCES "Part"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ncr" ADD CONSTRAINT "Ncr_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ncr" ADD CONSTRAINT "Ncr_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Eco" ADD CONSTRAINT "Eco_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE SET NULL ON UPDATE CASCADE;
