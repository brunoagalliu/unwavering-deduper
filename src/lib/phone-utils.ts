export function normalizePhone(phone: string | number): string {
  // Convert to string and remove all non-digits
  const cleaned = String(phone).replace(/\D/g, '');
  
  // Handle US numbers with country code: remove leading 1 if 11 digits
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return cleaned.substring(1);
  }
  
  // Return as is (validation will catch if invalid)
  return cleaned;
}

export function isValidUSPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  
  // Valid US phone: exactly 10 digits
  if (normalized.length !== 10) {
    return false; // Rejects 9-digit numbers
  }
  
  // First digit 2-9 (area code can't start with 0 or 1)
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