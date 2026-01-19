import { ICustomer } from "../../api/customer.interface";
import { IContract } from "../../api/contract.interface";
import { IQuotation } from "../../api/quotation.interface";

export interface ICustomerProps {
  customers: ICustomer[];
  contracts: IContract[];
  quotations: IQuotation[];
}