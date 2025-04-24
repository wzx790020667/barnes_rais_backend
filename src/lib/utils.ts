import crypto from 'crypto';

/**
 * Generates a unique hash based on customer information
 * @param customerName - The customer name
 * @param coCode - The company code
 * @param fileFormat - The file format
 * @param documentType - The document type
 * @returns A unique hash string
 */
export function generateCustomerInfoHash(
  customerName: string,
  coCode: string | null | undefined,
  fileFormat: string,
  documentType: string
): string {
  // Create a string by concatenating the values, using empty string for null/undefined
  const dataString = `${customerName}|${coCode || ''}|${fileFormat}| ${documentType}`;
  
  // Generate an MD5 hash of the combined string
  // This md5 algorithm is used for creating a unique ID for the number of finished documents calculation in the customer table.
  // It will create a unique hash based on (customerName, coCode, fileFormat, documentType).
  // This hash is not used in any other security-senstive operations/processes/data protection mechanisms.
  return crypto.createHash('md5').update(dataString).digest('hex');
}
