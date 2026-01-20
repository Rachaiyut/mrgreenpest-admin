// Interface
import { ICategory } from "../entity/category.interface";
import { IProduct } from "../entity/product.interface";

export interface IProductProps {
  products: IProduct[];
  onCreateProduct: (product: Omit<IProduct, 'id'>) => void;
  onUpdateProduct: (product: IProduct) => void;
  onDeleteProduct: (productId: string) => void;
  categories: ICategory[];
}
