/**
 * Genera un código CN-YYYY-NNNNNN atómico dentro de una transacción Prisma.
 * El UPDATE con increment en PostgreSQL garantiza no-repetición bajo concurrencia.
 */
export async function generateTransferCode(tx: any): Promise<string> {
  const year = new Date().getFullYear();

  const seq = await tx.transferCodeSequence.upsert({
    where: { year },
    update: { lastNumber: { increment: 1 } },
    create: { year, lastNumber: 1 },
    select: { lastNumber: true },
  });

  return `CN-${year}-${String(seq.lastNumber).padStart(6, "0")}`;
}

export function formatTransferAmount(cents: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}
