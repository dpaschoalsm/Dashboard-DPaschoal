/**
 * Formats currency values into Brazilian Real format matching the original design.
 * Example: 321415 -> "R$ 321.415"
 * Example: 1306.57 -> "R$ 1.306,57"
 */
export function formatCurrency(value: number): string {
  if (isNaN(value) || value === null || value === undefined) return 'R$ 0';
  
  // Check if value has decimals
  const hasDecimals = value % 1 !== 0;
  
  if (hasDecimals) {
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return `R$ ${formatted}`;
  } else {
    const formatted = new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 0,
    }).format(value);
    return `R$ ${formatted}`;
  }
}

/**
 * Formats integer numbers with pt-BR thousand separators.
 * Example: 5773 -> "5.773"
 */
export function formatNumber(value: number): string {
  if (isNaN(value) || value === null || value === undefined) return '0';
  return new Intl.NumberFormat('pt-BR').format(Math.round(value));
}

/**
 * Formats percentages into pt-BR style.
 * Example: 34.22 -> "34,22%"
 */
export function formatPercent(value: number): string {
  if (isNaN(value) || value === null || value === undefined) return '0,00%';
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted}%`;
}

/**
 * Parse pt-BR formatted string or standard float string into a Javascript number.
 * Example: "R$ 321.415,50" -> 321415.5
 * Example: "34,22%" -> 34.22
 * Example: "5.773" -> 5773
 */
export function parsePtBrNumber(val: string | number): number {
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  if (val === null || val === undefined) return 0;

  let cleaned = String(val)
    .replace(/R\$\s?/gi, '')
    .replace(/%/g, '')
    .trim();

  if (!cleaned) return 0;

  // If both dot and comma are present:
  if (cleaned.includes('.') && cleaned.includes(',')) {
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    if (lastDot < lastComma) {
      // e.g. "1.306,57" or "1.000.000,50" -> dot is thousand, comma is decimal
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // e.g. "1,306.57" or "1,000,000.50" -> comma is thousand, dot is decimal
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Only comma present:
    const parts = cleaned.split(',');
    if (parts.length > 2) {
      // e.g. "1,000,000" -> thousand separators
      cleaned = cleaned.replace(/,/g, '');
    } else if (parts[1] && parts[1].length === 3) {
      // Exactly 3 digits after single comma e.g. "463,000" or "6,924"
      cleaned = cleaned.replace(/,/g, '');
    } else {
      // Decimal comma e.g. "34,22" or "1306,57"
      cleaned = cleaned.replace(',', '.');
    }
  } else if (cleaned.includes('.')) {
    // Only dot present:
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      // e.g. "1.000.000" -> thousand separators
      cleaned = cleaned.replace(/\./g, '');
    } else if (parts[1] && parts[1].length === 3) {
      // Exactly 3 digits after single dot e.g. "463.000" or "321.415" or "6.924"
      cleaned = cleaned.replace(/\./g, '');
    }
  }

  const result = parseFloat(cleaned);
  return isNaN(result) ? 0 : result;
}
