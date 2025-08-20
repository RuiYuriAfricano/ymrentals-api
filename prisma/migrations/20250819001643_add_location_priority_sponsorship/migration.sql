-- CreateEnum
CREATE TYPE "AdSponsorshipStatus" AS ENUM ('ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Rental" ADD COLUMN     "hasPriority" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priorityAmount" DOUBLE PRECISION,
ADD COLUMN     "priorityPaidAt" TIMESTAMP(3),
ADD COLUMN     "renterAddress" TEXT,
ADD COLUMN     "renterLatitude" DOUBLE PRECISION,
ADD COLUMN     "renterLongitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ad_sponsorships" (
    "id" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "equipmentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "AdSponsorshipStatus" NOT NULL DEFAULT 'ACTIVE',
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_sponsorships_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ad_sponsorships" ADD CONSTRAINT "ad_sponsorships_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_sponsorships" ADD CONSTRAINT "ad_sponsorships_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_sponsorships" ADD CONSTRAINT "ad_sponsorships_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
