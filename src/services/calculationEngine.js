export function calculatePrint(input) {
  const grams = Math.max(0, Number(input.grams) || 0);
  const hours = Math.max(0, Number(input.hours) || 0);
  const quantity = Math.max(1, Number(input.quantity) || 1);
  const spoolPrice = Math.max(0, Number(input.spoolPrice) || 0);
  const spoolGrams = Math.max(1, Number(input.spoolGrams) || 1000);
  const powerWatts = Math.max(0, Number(input.powerWatts) || 0);
  const kwhPrice = Math.max(0, Number(input.kwhPrice) || 0);
  const printerPrice = Math.max(0, Number(input.printerPrice) || 0);
  const residual = Math.min(printerPrice, Math.max(0, Number(input.residual) || 0));
  const usefulHours = Math.max(1, Number(input.usefulHours) || 5000);
  const maintenancePerHour = Math.max(0, Number(input.maintenancePerHour) || 0);
  const labor = Math.max(0, Number(input.labor) || 0);
  const extras = Math.max(0, Number(input.extras) || 0);
  const failureRate = Math.min(95, Math.max(0, Number(input.failureRate) || 0)) / 100;

  // Per-unit material requirement is adjusted for expected production loss.
  const material = (spoolPrice / spoolGrams) * grams / (1 - failureRate);
  const energy = (powerWatts / 1000) * hours * kwhPrice;
  const depreciation = ((printerPrice - residual) / usefulHours) * hours;
  const maintenance = maintenancePerHour * hours;
  const unitCost = material + energy + depreciation + maintenance + labor + extras;
  const totalCost = unitCost * quantity;

  return {
    material, energy, depreciation, maintenance, labor, extras,
    unitCost, totalCost, quantity,
    effectiveGrams: grams / (1 - failureRate)
  };
}

export function calculatePrice({ unitCost, fixedFee = 0, percentageFees = 0, targetMargin = 30 }) {
  const fees = Math.max(0, Number(percentageFees) || 0) / 100;
  const margin = Math.max(0, Number(targetMargin) || 0) / 100;
  const fixed = Math.max(0, Number(fixedFee) || 0);
  const denominator = 1 - fees - margin;
  if (denominator <= 0) {
    return { valid: false, message: "A soma das taxas e da margem precisa ser menor que 100%." };
  }
  const price = (Math.max(0, Number(unitCost) || 0) + fixed) / denominator;
  const profit = price - fixed - price * fees - (Number(unitCost) || 0);
  return { valid: true, price, profit, margin: price ? profit / price * 100 : 0 };
}
