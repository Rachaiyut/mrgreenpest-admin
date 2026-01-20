import { ICategory } from "../../entity/category.interface";
import { IUnit } from "../../entity/unit.interface";

export interface IAddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: ICategory[];
  units: IUnit[];
}
