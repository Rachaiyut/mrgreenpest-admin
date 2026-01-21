// Interface
import { ICategory } from "@/src/types/entity/category.interface";
import { IProduct } from "@/src/types/entity/product.interface";

export interface IProductProps {
  products: IProduct[];
  onCreateProduct: (product: Omit<IProduct, 'id'>) => void;
  onUpdateProduct: (product: IProduct) => void;
  onDeleteProduct: (productId: string) => void;
  categories: ICategory[];
}
