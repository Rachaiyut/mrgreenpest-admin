import { IBase } from './base.interface';

export enum ContactMethod {
  PHONE = 'PHONE',
  LINE = 'LINE',
  VISIT = 'VISIT',
  EMAIL = 'EMAIL',
  OTHER = 'OTHER',
}

export enum FollowUpResult {
  INTERESTED = 'INTERESTED',
  NOT_INTERESTED = 'NOT_INTERESTED',
  CONSIDERING = 'CONSIDERING',
  NO_RESPONSE = 'NO_RESPONSE',
  CALL_BACK = 'CALL_BACK',
  RENEWED = 'RENEWED',
  OTHER = 'OTHER',
}

export enum FollowUpType {
  QUOTATION = 'QUOTATION',
  CONTRACT = 'CONTRACT',
  CONTRACT_RENEWAL = 'CONTRACT_RENEWAL',
  PAYMENT = 'PAYMENT',
}

export enum FollowUpDocumentRefType {
  QUOTATION = 'QUOTATION',
  CONTRACT = 'CONTRACT',
  INVOICE = 'INVOICE',
}

export const ContactMethodLabels: Record<ContactMethod, string> = {
  PHONE: 'โทรศัพท์',
  LINE: 'LINE',
  VISIT: 'เข้าพบ',
  EMAIL: 'อีเมล',
  OTHER: 'อื่นๆ',
};

export const FollowUpResultLabels: Record<FollowUpResult, string> = {
  INTERESTED: 'สนใจ',
  NOT_INTERESTED: 'ไม่สนใจ',
  CONSIDERING: 'กำลังพิจารณา',
  NO_RESPONSE: 'ติดต่อไม่ได้',
  CALL_BACK: 'ติดต่อกลับภายหลัง',
  RENEWED: 'ต่อสัญญาแล้ว',
  OTHER: 'อื่นๆ',
};

export const FollowUpTypeLabels: Record<FollowUpType, string> = {
  QUOTATION: 'ใบเสนอราคา',
  CONTRACT: 'สัญญา',
  CONTRACT_RENEWAL: 'ต่อสัญญา',
  PAYMENT: 'การชำระเงิน',
};

export const FollowUpDocumentRefTypeLabels: Record<FollowUpDocumentRefType, string> = {
  QUOTATION: 'ใบเสนอราคา',
  CONTRACT: 'สัญญา',
  INVOICE: 'ใบแจ้งหนี้',
};

/**
 * Which document ref types are valid for each follow-up type.
 * (UI uses this to constrain the document picker)
 */
export const FollowUpTypeToDocRefTypes: Record<FollowUpType, FollowUpDocumentRefType[]> = {
  QUOTATION: [FollowUpDocumentRefType.QUOTATION],
  CONTRACT: [FollowUpDocumentRefType.CONTRACT],
  CONTRACT_RENEWAL: [FollowUpDocumentRefType.CONTRACT],
  PAYMENT: [FollowUpDocumentRefType.INVOICE],
};

export interface ContractFollowUp extends IBase {
  contract_id?: string;
  customer_id: string;
  follow_up_type: FollowUpType;
  document_ref_type?: FollowUpDocumentRefType;
  document_ref_id?: string;
  document_ref_code?: string;
  follow_up_number?: number;
  follow_up_date: string;
  /** Free-text channel — enum values still common (PHONE/LINE/...) but any string is allowed */
  contact_method?: string;
  /** Free-text result — enum values still common (INTERESTED/...) but any string is allowed */
  result: string;
  notes?: string;
  next_follow_up_date?: string;
  created_by?: string;
  contract?: { id: string; code: string; status: string };
  creator?: { id: string; first_name: string; last_name: string };
}
