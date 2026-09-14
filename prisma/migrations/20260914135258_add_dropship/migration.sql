-- CreateTable
CREATE TABLE "Dropship" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dropship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dropship_createdAt_idx" ON "Dropship"("createdAt");
