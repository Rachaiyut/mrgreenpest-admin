import { IBase } from "./base.interface";

export interface IUnit extends IBase {
    id: string,
    name: string
}

export type Unit = IUnit;
