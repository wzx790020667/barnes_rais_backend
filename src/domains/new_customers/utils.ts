import { type NewCustomer } from "../../db/schema";

type NewCustomerCriteria = {
  id: string;
  customer_name: string;
  customer_code: string;
  co_code: string;
};

/**
 * Validates if a new customer object meets the required criteria
 */
export function validateNewCustomerCriteria(
  newCustomer: Partial<NewCustomer>
): newCustomer is NewCustomerCriteria {
  return !!(
    newCustomer.id &&
    newCustomer.customer_name &&
    newCustomer.customer_code &&
    newCustomer.co_code
  );
}

/**
 * Formats a new customer name for display
 */
export function formatNewCustomerName(customerName: string): string {
  return customerName.trim().toUpperCase();
}

/**
 * Formats a new customer code for display
 */
export function formatNewCustomerCode(customerCode: string): string {
  return customerCode.trim().toUpperCase();
}

/**
 * Formats a co code for display
 */
export function formatCoCode(coCode: string): string {
  return coCode.trim().toUpperCase();
}

/**
 * Checks if two new customers are the same based on key fields
 */
export function areNewCustomersEqual(
  customer1: Partial<NewCustomer>,
  customer2: Partial<NewCustomer>
): boolean {
  return (
    customer1.customer_name === customer2.customer_name &&
    customer1.customer_code === customer2.customer_code &&
    customer1.co_code === customer2.co_code
  );
}

/**
 * Sanitizes new customer input data
 */
export function sanitizeNewCustomerInput(
  input: Partial<NewCustomer>
): Partial<NewCustomer> {
  const sanitized: Partial<NewCustomer> = {};

  if (input.customer_name) {
    sanitized.customer_name = input.customer_name.trim();
  }

  if (input.customer_code) {
    sanitized.customer_code = input.customer_code.trim();
  }

  if (input.co_code) {
    sanitized.co_code = input.co_code.trim();
  }

  return sanitized;
}