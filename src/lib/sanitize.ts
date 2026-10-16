/**
 * Client-Side Input Sanitization & Anti-XSS Utility
 * Strips script tags, HTML injection constructs, and control characters.
 */

const DANGEROUS_PATTERNS = [
  /<\s*script[^>]*>[\s\S]*?<\s*\/script\s*>/gi,
  /<\s*iframe[^>]*>[\s\S]*?<\s*\/iframe\s*>/gi,
  /<\s*object[^>]*>[\s\S]*?<\s*\/object\s*>/gi,
  /<\s*embed[^>]*>[\s\S]*?<\s*\/embed\s*>/gi,
  /javascript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /on\w+\s*=/gi,
  /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
];

export function sanitizeInput(input: string | null | undefined, maxLength = 5000): string {
  if (!input) return "";

  let cleaned = input;
  for (const pattern of DANGEROUS_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Escape basic HTML angle brackets to prevent DOM injection
  cleaned = cleaned.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }

  return cleaned.trim();
}

export function sanitizeTextPlain(input: string | null | undefined, maxLength = 5000): string {
  if (!input) return "";

  let cleaned = input;
  for (const pattern of DANGEROUS_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }

  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }

  return cleaned.trim();
}
