export function normalizePhone(phone: string | number): string {
    // Convert to string and remove all non-digits
    const cleaned = String(phone).replace(/\D/g, '');
    
    // Handle US numbers: remove leading 1 if 11 digits
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return cleaned.substring(1);
    }
    
    // Return cleaned number
    return cleaned;
  }
  
  export function isValidPhone(phone: string): boolean {
    const normalized = normalizePhone(phone);
    // Basic validation: 10 digits for US numbers
    return normalized.length >= 10 && normalized.length <= 15;
  }