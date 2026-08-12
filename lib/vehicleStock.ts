export function formatVehicleStockCode(stockDays: number | null | undefined): string {
  const normalizedDays = Math.max(0, Math.trunc(Number(stockDays) || 0));
  return `SV${String(normalizedDays).padStart(5, "0")}`;
}
