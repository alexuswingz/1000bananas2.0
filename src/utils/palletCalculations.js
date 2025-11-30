export const calculatePallets = (quantity, unitsPerPallet) => {
  if (!quantity || !unitsPerPallet || unitsPerPallet === 0) {
    return 0;
  }
  // Return fractional pallets (e.g., 2.5 pallets) not rounded up
  return quantity / unitsPerPallet;
};

export const calculateCases = (quantity, unitsPerCase) => {
  if (!quantity || !unitsPerCase || unitsPerCase === 0) {
    return 0;
  }
  return Math.ceil(quantity / unitsPerCase);
};

export const calculatePalletsFromCases = (cases, casesPerPallet) => {
  if (!cases || !casesPerPallet || casesPerPallet === 0) {
    return 0;
  }
  return Math.ceil(cases / casesPerPallet);
};

