export function normalizePhone(phone: string | number): string {
  // Convert to string and remove all non-digits
  const cleaned = String(phone).replace(/\D/g, '');
  
  // Handle US numbers: remove leading 1 if 11 digits
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return cleaned.substring(1);
  }
  
  // Return as is if 10 digits (US without country code)
  return cleaned;
}

export function isValidUSPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  
  // Valid US phone: exactly 10 digits
  // First digit 2-9 (area code can't start with 0 or 1)
  if (normalized.length !== 10) {
    return false;
  }
  
  const firstDigit = normalized.charAt(0);
  if (firstDigit === '0' || firstDigit === '1') {
    return false;
  }
  
  return true;
}

// Keep old function for backward compatibility, but use US validation
export function isValidPhone(phone: string): boolean {
  return isValidUSPhone(phone);
}