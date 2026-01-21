import { ICategory } from "@/src/types/entity/category.interface";
import { IUnit } from "@/src/types/entity/unit.interface";

export interface IAddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: ICategory[];
  units: IUnit[];
}
