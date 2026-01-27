import { IBase } from "./base.interface";

export interface IUnit extends IBase {
    id: string,
    name: string,
    symbol: string
}

export type Unit = IUnit;
