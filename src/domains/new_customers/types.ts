import { type NewCustomer } from "../../db/schema";

export type { NewCustomer };

export type CreateNewCustomerRequest = {
  customer_name: string;
  customer_code: string;
  co_code: string;
};

export type UpdateNewCustomerRequest = Partial<CreateNewCustomerRequest>;

export type NewCustomerResponse = NewCustomer;

export type NewCustomersListResponse = {
  newCustomers: NewCustomer[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type SearchNewCustomersResponse = NewCustomersListResponse & {
  query: string;
};

export type NewCustomerNamesResponse = {
  names: string[];
};