#!/usr/bin/env npx
/**
 * clean-old-proofs.ts
 *
 * Deletes Cloudinary transfer proof files for orders that were confirmed
 * more than 6 months ago. Safe to run manually or via cron every 90 days.
 *
 * Usage:
 *   npx tsx --require dotenv/config scripts/clean-old-proofs.ts
 *   npx tsx --require dotenv/config scripts/clean-old-proofs.ts --dry-run
 *
 * Cron (every 90 days at 03:00):
 * @example
 * ```
 * 0 3 1 * /3 * cd /path/to/app && npx tsx --require dotenv/config scripts/clean-old-proofs.ts >> logs/cron.log 2>&1
 * ```
 *
 * Rules:
 *   - Only touches orders with paymentStatus=PAID AND transferStatus=CONFIRMED
 *   - transferConfirmedAt must be older than 6 months
 *   - NEVER touches REJECTED or PENDING_REVIEW orders
 *   - Appends results to logs/clean-old-proofs.log
 */

import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import * as fs from "fs";
import * as path from "path";

const DRY_RUN = process.argv.includes("--dry-run");

const LOG_DIR = path.resolve(__dirname, "../logs");
const LOG_FILE = path.join(LOG_DIR, "clean-old-proofs.log");

const SIX_MONTHS_AGO = new Date();
SIX_MONTHS_AGO.setMonth(SIX_MONTHS_AGO.getMonth() - 6);

// ─── Logging ─────────────────────────────────────────────────────────────────

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function log(level: "INFO" | "WARN" | "ERROR" | "DRY", message: string) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n", "utf8");
}

// ─── Cloudinary helpers ───────────────────────────────────────────────────────

function initCloudinary() {
  const url = process.env.CLOUDINARY_URL;
  if (!url) throw new Error("Falta CLOUDINARY_URL en .env");
  cloudinary.config(url);
}

type ResourceType = "image" | "raw";

function extractPublicId(
  proofUrl: string,
  mimeType: string | null
): { publicId: string; resourceType: ResourceType } | null {
  try {
    const uploadIdx = proofUrl.indexOf("/upload/");
    if (uploadIdx === -1) return null;

    let segment = proofUrl.slice(uploadIdx + "/upload/".length);

    // Strip optional version prefix: v1234567890/
    segment = segment.replace(/^v\d+\//, "");

    const resourceType: ResourceType =
      mimeType === "application/pdf" ? "raw" : "image";

    // Strip file extension for image public IDs
    if (resourceType === "image") {
      segment = segment.replace(/\.[^./]+$/, "");
    }

    return { publicId: segment, resourceType };
  } catch {
    return null;
  }
}

async function destroyCloudinaryAsset(
  publicId: string,
  resourceType: ResourceType
): Promise<boolean> {
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
  return result.result === "ok" || result.result === "not found";
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  ensureLogDir();

  const runLabel = DRY_RUN ? "DRY RUN" : "RUN";
  log("INFO", `=== clean-old-proofs start [${runLabel}] ===`);
  log("INFO", `Cutoff date: ${SIX_MONTHS_AGO.toISOString()} (confirmed before this date)`);

  initCloudinary();
  const prisma = new PrismaClient();

  let deleted = 0;
  let skipped = 0;
  let errors = 0;

  try {
    const orders = await prisma.order.findMany({
      where: {
        paymentStatus: "PAID",
        transferStatus: "CONFIRMED",
        transferProofUrl: { not: null },
        transferConfirmedAt: { lt: SIX_MONTHS_AGO },
      },
      select: {
        id: true,
        orderNumber: true,
        transferCode: true,
        transferProofUrl: true,
        transferProofMimeType: true,
        transferConfirmedAt: true,
      },
    });

    log("INFO", `Found ${orders.length} order(s) eligible for proof cleanup`);

    if (orders.length === 0) {
      log("INFO", "Nothing to clean. Exiting.");
      return;
    }

    for (const order of orders) {
      const label = order.transferCode ?? order.orderNumber ?? order.id;

      if (!order.transferProofUrl) {
        skipped++;
        continue;
      }

      const extracted = extractPublicId(
        order.transferProofUrl,
        order.transferProofMimeType
      );

      if (!extracted) {
        log(
          "WARN",
          `Order ${label}: cannot parse public_id from URL "${order.transferProofUrl}" — skipping`
        );
        skipped++;
        continue;
      }

      const { publicId, resourceType } = extracted;

      if (DRY_RUN) {
        log(
          "DRY",
          `Order ${label} (confirmed ${order.transferConfirmedAt?.toISOString()}): ` +
            `would destroy ${resourceType} "${publicId}"`
        );
        deleted++;
        continue;
      }

      try {
        const ok = await destroyCloudinaryAsset(publicId, resourceType);

        if (!ok) {
          log("WARN", `Order ${label}: Cloudinary destroy returned unexpected result for "${publicId}"`);
          skipped++;
          continue;
        }

        // Clear the proof URL from DB only after successful Cloudinary deletion
        await prisma.order.update({
          where: { id: order.id },
          data: {
            transferProofUrl: null,
            transferProofMimeType: null,
          },
        });

        log(
          "INFO",
          `Order ${label}: deleted ${resourceType} "${publicId}" ` +
            `(confirmed ${order.transferConfirmedAt?.toISOString()})`
        );
        deleted++;
      } catch (err) {
        log(
          "ERROR",
          `Order ${label}: failed — ${err instanceof Error ? err.message : String(err)}`
        );
        errors++;
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  log(
    "INFO",
    `=== Done [${runLabel}] — deleted: ${deleted}, skipped: ${skipped}, errors: ${errors} ===`
  );

  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
