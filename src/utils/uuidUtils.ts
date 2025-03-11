/**
 * Utility functions for UUID formatting and validation
 */

/**
 * Validates if a string is a properly formatted UUID
 * @param uuid String to validate as UUID
 * @returns Boolean indicating if the string is a valid UUID
 */
export const isValidUUID = (uuid: string): boolean => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
};

/**
 * Converts a dealer ID string to a properly formatted UUID if possible
 * This handles various formats and tries to create a valid UUID
 * 
 * @param dealerId The dealer ID string to format
 * @returns A properly formatted UUID string or the original dealer ID if it's in a special format
 */
export const formatDealerUUID = (dealerId: string): string => {
  // Special case: If the dealer ID is in format like "14118-67c59087473c1f88e06f9cb5"
  // Just return it as is - it's a valid identifier in our system
  if (/^\d+-[0-9a-f]+$/i.test(dealerId)) {
    console.log(`Using dealer ID in special format: "${dealerId}"`);
    return dealerId;
  }

  // If it's already a valid UUID, return it
  if (isValidUUID(dealerId)) {
    return dealerId;
  }

  // Check if we need to add hyphens to create a valid UUID
  if (/^[0-9a-f]{32}$/i.test(dealerId)) {
    return `${dealerId.slice(0, 8)}-${dealerId.slice(8, 12)}-${dealerId.slice(12, 16)}-${dealerId.slice(16, 20)}-${dealerId.slice(20)}`;
  }

  // For other formats, try to convert to a valid format
  // Remove any non-hex characters
  const hexOnly = dealerId.replace(/[^0-9a-f]/gi, '');
  
  // If we have 32 hex characters after cleaning, format as UUID
  if (hexOnly.length === 32) {
    return `${hexOnly.slice(0, 8)}-${hexOnly.slice(8, 12)}-${hexOnly.slice(12, 16)}-${hexOnly.slice(16, 20)}-${hexOnly.slice(20)}`;
  }
  
  // If all else fails, return the original dealer ID to avoid losing information
  console.warn(`Could not format dealer ID "${dealerId}" as valid UUID, using original ID`);
  return dealerId;
}; 