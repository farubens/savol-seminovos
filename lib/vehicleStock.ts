export function formatVehicleStockCode(
  stockDays: number | null | undefined,
  proposalDays?: number | null,
  apoloSituation?: string | null
): string {
  const normalizedDays = Math.max(0, Math.trunc(Number(stockDays) || 0));
  const statusPrefix = (apoloSituation || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3) || "SV";
  const stockCode = `${statusPrefix}${String(normalizedDays).padStart(5, "0")}`;

  if (
    proposalDays === null ||
    proposalDays === undefined ||
    !Number.isFinite(Number(proposalDays)) ||
    Number(proposalDays) <= 0
  ) {
    return stockCode;
  }

  const normalizedProposalDays = Math.max(0, Math.trunc(Number(proposalDays)));
  return `${stockCode}/${normalizedProposalDays}`;
}
