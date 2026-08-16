export function formatVehicleStockCode(
  stockDays: number | null | undefined,
  proposalDays?: number | null
): string {
  const normalizedDays = Math.max(0, Math.trunc(Number(stockDays) || 0));
  const stockCode = `SV${String(normalizedDays).padStart(5, "0")}`;

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
