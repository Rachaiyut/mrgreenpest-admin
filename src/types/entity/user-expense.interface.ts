import { ExpenseType } from "../enums/financial";
import { IBase } from "./base.interface";

export interface UserExpense extends IBase {
    user_id: string,
    stock_issue_summary_id: string,
    description: string,
    amount: number,
    transaction_date: Date,
    type: ExpenseType,
    created_by: string,
    updated_by: string,
}
