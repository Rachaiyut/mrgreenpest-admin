export enum ReceiptStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  CANCELLED = 'CANCELLED',
  VOIDED = 'VOIDED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  CREDIT_CARD = 'CREDIT_CARD',
  CHEQUE = 'CHEQUE',
  QR_PAYMENT = 'QR_PAYMENT',
  DIVIDED = 'DIVIDED',
  INSTALLMENT = 'INSTALLMENT',
}


export enum ExpenseType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum InstallmentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}