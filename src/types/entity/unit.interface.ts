import { IBase } from './base.interface';

export interface IUnit extends IBase {
  id: string;
  name: string;
  symbol: string;
  is_active?: boolean;
}

export type Unit = IUnit;
