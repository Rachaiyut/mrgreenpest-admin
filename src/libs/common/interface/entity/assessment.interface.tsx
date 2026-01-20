import { Status } from './core.interface';

export interface AssessmentItem {
  id: string;
  productId?: string;
  quantity: number;
  price: number;
}

export interface AssessmentWorkArea {
  id: string;
  name: string;
  buildingType?: string;
  areaSize: number;
  linearMeters: number;
  serviceType: string[];
  serviceSystem?: string;
  estimatedCost: number;
  items: AssessmentItem[];
  packageId?: string;
  selectedConditionId?: string;
  packagePrice?: number;
}

export interface Assessment {
  id: string;
  createdAt: string;
  customerId: string;
  customerName: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  scheduledAt: string;
  workAreas: AssessmentWorkArea[];
  totalEstimatedCost: number;
  status: Status;
  createdBy: string;
  updatedBy: string;
  googleMapLink?: string;
  locationType?: string;
  paymentConditions?: string;
  zone?: string;
  group?: string;
  roadLine?: string;
  sequence?: string;
}

