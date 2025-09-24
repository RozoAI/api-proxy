// Utility functions for Edge Functions

/**
 * Filters out sensitive fields from metadata that should not be exposed in API responses.
 * These fields are only included in webhook callbacks for security verification.
 * @param metadata - The metadata object to filter
 * @returns Filtered metadata object without sensitive fields
 */
export function filterSensitiveMetadata(metadata: Record<string, any> | undefined | null): Record<string, any> {
  if (!metadata) {
    return {};
  }

  // List of sensitive fields that should only be in webhooks, not API responses
  const sensitiveFields = ['merchantToken'];
  
  return Object.fromEntries(
    Object.entries(metadata).filter(([key]) => !sensitiveFields.includes(key))
  );
}

/**
 * Safely spreads metadata while filtering out sensitive fields
 * @param metadata - The metadata object to spread
 * @returns Object ready for spreading with sensitive fields removed
 */
export function safeMetadataSpread(metadata: Record<string, any> | undefined | null): Record<string, any> {
  return filterSensitiveMetadata(metadata);
}