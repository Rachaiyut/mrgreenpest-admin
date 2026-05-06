import { FC } from 'react';
import { PlusIcon, ClipboardDocumentListIcon } from '../../assets/icons/Icons';
import { WorkAreaForm } from '../features/assessments/WorkAreaForm';
import { Product } from '../../types/entity/product.interface';
import { Category } from '../../types';
import { Package } from '../../types/entity/package.interface';

export interface WorkAreasSectionProps {
  areas: any[];
  onAreasChange: (areas: any[]) => void;
  products: Product[];
  categories: Category[];
  packages: Package[];
  getSelectedPackage?: (area: any) => Package | null;
  onSelectPackage?: (pkgId: string, areaIndex: number) => void;
  isReadOnly?: boolean;
  isEditing?: boolean;
  title?: string;
  notice?: string;
  sortByCreatedAt?: boolean;
  disabled?: boolean;
  errors?: Record<string, string>;
}

const WorkAreasSection: FC<WorkAreasSectionProps> = ({
  areas,
  onAreasChange,
  products,
  categories,
  packages,
  getSelectedPackage,
  onSelectPackage,
  isReadOnly = false,
  isEditing = false,
  title = 'รายละเอียดพื้นที่',
  notice,
  sortByCreatedAt = false,
  disabled = false,
  errors = {},
}) => {
  const handleAreaChange = (index: number, updated: any) => {
    onAreasChange(areas.map((a, idx) => idx === index ? updated : a));
  };

  const handleClearArea = (index: number) => {
    onAreasChange(areas.map((a, idx) => idx === index ? {
      ...a,
      building_type: '',
      area_size: undefined,
      category_services: [],
      service_system: undefined,
      total_price: 0,
      package_price: undefined,
    } : a));
  };

  const handleRemoveArea = areas.length > 1 ? (index: number) => {
    onAreasChange(areas.filter((_, idx) => idx !== index));
  } : undefined;

  const handleAddArea = () => {
    onAreasChange([...areas, {
      id: crypto.randomUUID(),
      area_name: `พื้นที่ ${areas.length + 1}`,
      building_type: '',
      service_system: '',
      area_size: undefined,
      package_price: undefined,
      total_price: 0,
      category_services: [],
      items: [],
    }]);
  };

  const sortedAreas = sortByCreatedAt
    ? areas
        .map((area, originalIndex) => ({ area, originalIndex }))
        .sort((a, b) => new Date(a.area.created_at || 0).getTime() - new Date(b.area.created_at || 0).getTime())
    : areas.map((area, originalIndex) => ({ area, originalIndex }));

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6 col-span-1 lg:col-span-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-green-50 rounded-lg text-green-600">
            <ClipboardDocumentListIcon className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-slate-800 text-lg">{title}</h3>
        </div>
        {notice && (
          <span className="text-sm text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">{notice}</span>
        )}
      </div>

      <div className="space-y-4">
        {sortedAreas.map(({ area, originalIndex }) => (
          <WorkAreaForm
            key={area.id || originalIndex}
            area={area}
            index={originalIndex}
            errors={errors}
            onAreaChange={handleAreaChange}
            onClearArea={handleClearArea}
            onRemoveArea={handleRemoveArea}
            products={products}
            categories={categories}
            selectedPackage={getSelectedPackage ? getSelectedPackage(area) : null}
            availablePackages={packages}
            onSelectPackage={onSelectPackage ? (pkgId) => onSelectPackage(pkgId, originalIndex) : () => {}}
            isEditing={isEditing}
            readOnly={isReadOnly}
          />
        ))}

        {areas.length === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
            <ClipboardDocumentListIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">ยังไม่มีพื้นที่ให้บริการ กด "เพิ่มพื้นที่" เพื่อเริ่มต้น</p>
          </div>
        )}

        {!isReadOnly && (
          <div className="flex justify-center mt-6">
            <button
              type="button"
              onClick={handleAddArea}
              className="flex items-center gap-2 px-6 py-2.5 border border-green-600 text-green-600 bg-white rounded-lg hover:bg-green-50 hover:shadow-sm transition-all font-medium"
            >
              <PlusIcon className="h-5 w-5" /> เพิ่มพื้นที่ให้บริการ
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkAreasSection;
