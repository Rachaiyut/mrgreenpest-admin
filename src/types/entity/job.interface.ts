import { IBase } from "./base.interface";

export enum ServiceSystem {
  CHEMICAL = 'CHEMICAL',
  PREY = 'PREY',
  // Add other systems here, e.g., BAITING = 'BAITING'
}

export interface TeamMember {
  user_id: string;
  check_in: Date;
  check_out: Date;
}

export interface Job extends IBase {
  customer_id: string;
  contract_id: string;
  assessment_id: string;
  primary_tech_id: string;
  vehicle_id: string;
  start_date: Date;
  end_date: Date;
  service_system: ServiceSystem | string;
  remark: string;
  team_member: TeamMember[];
}
