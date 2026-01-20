import { Status, User } from './core.interface';

export interface FieldJobWorkArea {
  id: string;
  name: string;
  servicePackage: string;
}

export interface ServiceReport {
  createdAt: string;
  checkInTime: string;
  checkOutTime: string;
  serviceTypes: string[];
  serviceActions: string[];
  termite?: any;
  ant?: any;
  cockroach?: any;
  rat?: any;
  lizard?: any;
  other?: string;
  nextAppointment?: {
    notes: string;
    reasons: string[];
    scheduledAt?: string;
  };
  notes?: string;
  images?: {
    before: string[];
    after: string[];
  };
  signatures?: {
    customer: string;
    customerName: string;
    technician: string;
    technicianName: string;
  };
  materialsUsed?: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
  }[];
  status: Status;
}

export interface FieldJob {
  id: string;
  assessmentId?: string;
  contractId?: string;
  customerId: string;
  customerName: string;
  address: string;
  googleMapLink?: string;
  startTime: string;
  endTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  technicians: User[];
  workAreas: FieldJobWorkArea[];
  status: Status;
  vehicleId: string;
  serviceReport?: ServiceReport;
  remarks?: string;
  quotationId?: string;
  operationDetails?: string;
  zone?: string;
  group?: string;
  roadLine?: string;
  sequence?: string;
}

