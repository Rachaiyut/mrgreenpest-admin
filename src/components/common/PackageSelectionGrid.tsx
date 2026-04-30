import { FC, useMemo } from 'react';
import { Package } from '../../types/entity/package.interface';
import { PackageType } from '../../types/enums/package';

interface PackageSelectionGridProps {
  packages: Package[];
  areaSize?: number;
  activePackageId?: string | null;
  selectedPackageId?: string | null;
  area: any;
  unitName: string;
  selectedUnitId?: string;
  error?: string;
  onSelectPackage?: (pkgId: string) => void;
  onPackageCardClick: (pkgId: string) => void;
  onPriceOptionChange: (price: number, type: PackageType, conditionId: string, pkgId: string) => void;
  readOnly?: boolean;
}

const PackageSelectionGrid: FC<PackageSelectionGridProps> = ({
  packages,
  areaSize,
  activePackageId,
  selectedPackageId,
  area,
  unitName,
  selectedUnitId,
  error,
  onSelectPackage,
  onPackageCardClick,
  onPriceOptionChange,
  readOnly = false,
}) => {
  if (!areaSize || areaSize <= 0 || packages.length === 0) return null;

  return (
    <>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        แพ็คเก็จ <span className="text-red-500">*</span>
      </label>
      <div className={`mb-4 animate-fadeIn rounded-lg ${error ? 'border-2 border-red-400 bg-red-50/30 p-2' : ''}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
          {packages
            .filter((pkg) => {
              const prices = pkg.package_prices || [];
              if (selectedUnitId && !prices.some((p: any) => p.unit_id === selectedUnitId)) return false;
              if (areaSize && areaSize > 0) {
                const unitPrices = selectedUnitId
                  ? prices.filter((p: any) => p.unit_id === selectedUnitId)
                  : prices;
                return unitPrices.some((c) => c.area_range >= areaSize);
              }
              return true;
            })
            .map((pkg) => {
            const conditions = [...(pkg.package_prices || [])]
              .filter((p: any) => !selectedUnitId || p.unit_id === selectedUnitId)
              .sort((a, b) => a.area_range - b.area_range);
            const fit = areaSize ? conditions.find((c) => c.area_range >= areaSize) : null;
            const isSelected = activePackageId === pkg.id;
            const isOtherPackageLocked = !!selectedPackageId && selectedPackageId !== pkg.id;

            const isWithTermiteSelected = isSelected && (
              area.package_type === PackageType.WITH_TERMITE ||
              (!area.package_type && area.package_price_id === fit?.id && area.package_price === fit?.price_with_termite)
            );
            const isWithoutTermiteSelected = isSelected && (
              area.package_type === PackageType.WITHOUT_TERMITE ||
              (!area.package_type && area.package_price_id === fit?.id && area.package_price === fit?.price_without_termite)
            );

            return (
              <div
                key={pkg.id}
                role="button"
                tabIndex={0}
                onClick={() => !readOnly && onPackageCardClick(pkg.id)}
                className={`group relative flex flex-col items-start p-3 rounded-lg border-2 transition-all text-left w-full ${readOnly ? 'cursor-not-allowed' : 'cursor-pointer'} ${
                  readOnly
                    ? (isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary opacity-60' : 'border-slate-200 bg-slate-50 opacity-50')
                    : isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : isOtherPackageLocked ? 'border-slate-200 bg-slate-50/50 opacity-60 hover:opacity-100 hover:border-primary hover:bg-primary/5'
                    : 'border-slate-200 hover:border-primary hover:bg-primary/5 bg-white'
                }`}
              >
                <div className={`font-semibold ${readOnly ? (isSelected ? 'text-primary' : 'text-slate-400') : isSelected ? 'text-primary' : 'text-slate-800'} ${readOnly ? '' : 'group-hover:text-primary'}`}>
                  {pkg.name}
                </div>
                {fit ? (
                  <div className={`w-full mt-2 text-lg font-bold ${isSelected ? 'text-primary' : 'text-slate-700'} group-hover:text-primary`}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      เงื่อนไขราคา<span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 w-full">
                      {/* มีปลวก */}
                      <label
                        onClick={(e) => {
                          if (readOnly) return;
                          e.stopPropagation();
                          if (!isSelected && onSelectPackage) onSelectPackage(pkg.id);
                          onPriceOptionChange(fit.price_with_termite, PackageType.WITH_TERMITE, fit.id, pkg.id);
                        }}
                        className={`p-2 border rounded-md ${readOnly ? 'cursor-not-allowed' : 'cursor-pointer'} transition-all flex flex-col items-start justify-center w-full ${
                          readOnly
                            ? (isWithTermiteSelected ? 'bg-green-50 border-green-500' : 'bg-slate-50 border-slate-200')
                            : isWithTermiteSelected ? 'bg-green-50 border-green-500' : 'bg-white border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <div className={`text-[10px] ${readOnly && !isWithTermiteSelected ? 'text-slate-300' : 'text-slate-500'}`}>มีปลวก</div>
                        <div className="flex items-center mt-1">
                          <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isWithTermiteSelected ? 'border-green-600' : (readOnly ? 'border-slate-300' : 'border-slate-400')}`}>
                            {isWithTermiteSelected && <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>}
                          </div>
                          <div className="font-semibold text-sm text-slate-800 ml-2">{fit.price_with_termite.toLocaleString()} บาท</div>
                        </div>
                      </label>
                      {/* ไม่มีปลวก */}
                      <label
                        onClick={(e) => {
                          if (readOnly) return;
                          e.stopPropagation();
                          if (!isSelected && onSelectPackage) onSelectPackage(pkg.id);
                          onPriceOptionChange(fit.price_without_termite, PackageType.WITHOUT_TERMITE, fit.id, pkg.id);
                        }}
                        className={`p-2 border rounded-md ${readOnly ? 'cursor-not-allowed' : 'cursor-pointer'} transition-all flex flex-col items-start justify-center w-full ${
                          readOnly
                            ? (isWithoutTermiteSelected ? 'bg-green-50 border-green-500' : 'bg-slate-50 border-slate-200')
                            : isWithoutTermiteSelected ? 'bg-green-50 border-green-500' : 'bg-white border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <div className={`text-[10px] ${readOnly && !isWithoutTermiteSelected ? 'text-slate-300' : 'text-slate-500'}`}>ไม่มีปลวก</div>
                        <div className="flex items-center mt-1">
                          <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isWithoutTermiteSelected ? 'border-green-600' : (readOnly ? 'border-slate-300' : 'border-slate-400')}`}>
                            {isWithoutTermiteSelected && <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>}
                          </div>
                          <div className="font-semibold text-sm text-slate-800 ml-2">{fit.price_without_termite.toLocaleString()} บาท</div>
                        </div>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-slate-400">ระบุขนาดเพื่อคำนวณราคา</div>
                )}
                <div className="text-[10px] text-slate-400 mt-3">
                  {fit ? `สำหรับพื้นที่ไม่เกิน ${fit.area_range} ${unitName}` : 'ดูเงื่อนไขราคาตามขนาดพื้นที่'}
                </div>
                {isSelected && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse"></span>}
              </div>
            );
          })}
        </div>
        {error && (
          <p className="text-red-500 text-xs mt-2">{error}</p>
        )}
      </div>
    </>
  );
};

export default PackageSelectionGrid;
