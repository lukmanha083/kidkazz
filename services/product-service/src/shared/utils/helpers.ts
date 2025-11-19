/**
 * Utility Helper Functions
 */

/**
 * Generate a unique ID using nanoid
 */
export function generateId(): string {
  // Simple ID generation - can be replaced with nanoid
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate current timestamp in milliseconds
 */
export function generateTimestamp(): number {
  return Date.now();
}

/**
 * Format date to ISO string
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Parse ISO date string to Date
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString);
}
