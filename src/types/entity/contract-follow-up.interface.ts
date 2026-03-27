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
  NO_RESPONSE = 'NO_RESPONSE',
  CALL_BACK = 'CALL_BACK',
  RENEWED = 'RENEWED',
  OTHER = 'OTHER',
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
  NO_RESPONSE: 'ติดต่อไม่ได้',
  CALL_BACK: 'ขอให้โทรกลับ',
  RENEWED: 'ต่อสัญญาแล้ว',
  OTHER: 'อื่นๆ',
};

export interface ContractFollowUp extends IBase {
  contract_id: string;
  customer_id: string;
  follow_up_date: string;
  contact_method: ContactMethod;
  result: FollowUpResult;
  notes?: string;
  next_follow_up_date?: string;
  created_by?: string;
  contract?: { id: string; code: string; status: string };
  creator?: { id: string; first_name: string; last_name: string };
}
