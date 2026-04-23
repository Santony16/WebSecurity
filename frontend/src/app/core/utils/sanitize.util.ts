/**
 * Strips HTML/script tags and trims whitespace from a string.
 * Used before sending form data to the API to prevent stored XSS.
 */
export function sanitizeInput(value: string): string {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<[^>]*>/g, '')   // strip HTML tags
    .replace(/[<>]/g, '')       // catch residual angle brackets
    .trim();
}

/**
 * Applies sanitizeInput to every string field in a plain object.
 * Returns a new object (does not mutate the original).
 */
export function sanitizeForm<T extends Record<string, unknown>>(form: T): T {
  const result = { ...form } as T;
  for (const key of Object.keys(result) as (keyof T)[]) {
    if (typeof result[key] === 'string') {
      (result as Record<keyof T, unknown>)[key] = sanitizeInput(result[key] as string);
    }
  }
  return result;
}
