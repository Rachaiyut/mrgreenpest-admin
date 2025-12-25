import os
import shutil
import re

# 1. Define moves
moves = {
    # features/jobs
    "src/components/AddJobModal.tsx": "src/components/features/jobs/AddJobModal.tsx",
    "src/components/EditJobModal.tsx": "src/components/features/jobs/EditJobModal.tsx",
    "src/components/JobDetailsModal.tsx": "src/components/features/jobs/JobDetailsModal.tsx",
    "src/components/CancelJobModal.tsx": "src/components/features/jobs/CancelJobModal.tsx",
    "src/components/ServiceReportModal.tsx": "src/components/features/jobs/ServiceReportModal.tsx",

    # features/assessments
    "src/components/AddAssessmentModal.tsx": "src/components/features/assessments/AddAssessmentModal.tsx",
    "src/components/EditAssessmentModal.tsx": "src/components/features/assessments/EditAssessmentModal.tsx",
    "src/components/AssessmentDetailsModal.tsx": "src/components/features/assessments/AssessmentDetailsModal.tsx",

    # features/contracts
    "src/components/AddContractModal.tsx": "src/components/features/contracts/AddContractModal.tsx",

    # features/quotations
    "src/components/AddQuotationModal.tsx": "src/components/features/quotations/AddQuotationModal.tsx",
    "src/components/EditQuotationModal.tsx": "src/components/features/quotations/EditQuotationModal.tsx",
    "src/components/QuotationDetailsModal.tsx": "src/components/features/quotations/QuotationDetailsModal.tsx",

    # features/users
    "src/components/AddUserModal.tsx": "src/components/features/users/AddUserModal.tsx",
    "src/components/EditUserModal.tsx": "src/components/features/users/EditUserModal.tsx",
    "src/components/UserDetailsModal.tsx": "src/components/features/users/UserDetailsModal.tsx",
    "src/components/AddRoleModal.tsx": "src/components/features/users/AddRoleModal.tsx",
    "src/components/RoleDetailsModal.tsx": "src/components/features/users/RoleDetailsModal.tsx",
    "src/components/UserWalletModal.tsx": "src/components/features/users/UserWalletModal.tsx",

    # features/suppliers
    "src/components/AddSupplierModal.tsx": "src/components/features/suppliers/AddSupplierModal.tsx",
    "src/components/EditSupplierModal.tsx": "src/components/features/suppliers/EditSupplierModal.tsx",
    "src/components/SupplierDetailsModal.tsx": "src/components/features/suppliers/SupplierDetailsModal.tsx",

    # features/packages
    "src/components/AddPackageModal.tsx": "src/components/features/packages/AddPackageModal.tsx",
    "src/components/EditPackageModal.tsx": "src/components/features/packages/EditPackageModal.tsx",
    "src/components/PackageDetailsModal.tsx": "src/components/features/packages/PackageDetailsModal.tsx",

    # features/categories
    "src/components/AddCategoryModal.tsx": "src/components/features/categories/AddCategoryModal.tsx",
    "src/components/EditCategoryModal.tsx": "src/components/features/categories/EditCategoryModal.tsx",

    # features/warehouses
    "src/components/AddWarehouseModal.tsx": "src/components/features/warehouses/AddWarehouseModal.tsx",
    "src/components/EditWarehouseModal.tsx": "src/components/features/warehouses/EditWarehouseModal.tsx",
    "src/components/WarehouseDetailsModal.tsx": "src/components/features/warehouses/WarehouseDetailsModal.tsx",
    "src/components/SetWithdrawalLimitModal.tsx": "src/components/features/warehouses/SetWithdrawalLimitModal.tsx",

    # features/inventory
    "src/components/ProductSelectionModal.tsx": "src/components/features/inventory/ProductSelectionModal.tsx",
    "src/components/AddProductModal.tsx": "src/components/features/inventory/AddProductModal.tsx",
    "src/components/EditProductModal.tsx": "src/components/features/inventory/EditProductModal.tsx",
}

# 2. Component Map
component_map = {
    # Common
    "Card": "common/Card",
    "Modal": "common/Modal",
    "Pagination": "common/Pagination",
    "StatusBadge": "common/StatusBadge",
    "FormControls": "common/FormControls",
    "ConfirmationModal": "common/ConfirmationModal",
    "ApprovalModal": "common/ApprovalModal",
    "ReferenceSelectionModal": "common/ReferenceSelectionModal",
    "Button": "common/Button",
    
    # Layout
    "Header": "layout/Header",
    "Sidebar": "layout/Sidebar",
    
    # Features - Customers
    "AddCustomerModal": "features/customers/AddCustomerModal",
    "EditCustomerModal": "features/customers/EditCustomerModal",
    "CustomerDetailsModal": "features/customers/CustomerDetailsModal",
    "CustomerSelectionModal": "features/customers/CustomerSelectionModal",
    "CustomerContractsListModal": "features/customers/CustomerContractsListModal",
    
    # Features - Assessments
    "AddAssessmentModal": "features/features/assessments/AddAssessmentModal", # Typo check? No.
    "AddAssessmentModal": "features/assessments/AddAssessmentModal",
    "EditAssessmentModal": "features/assessments/EditAssessmentModal",
    "AssessmentDetailsModal": "features/assessments/AssessmentDetailsModal",
    
    # Features - Jobs
    "AddJobModal": "features/jobs/AddJobModal",
    "EditJobModal": "features/jobs/EditJobModal",
    "JobDetailsModal": "features/jobs/JobDetailsModal",
    "CancelJobModal": "features/jobs/CancelJobModal",
    "ServiceReportModal": "features/jobs/ServiceReportModal",
    
    # Features - Contracts
    "AddContractModal": "features/contracts/AddContractModal",
    
    # Features - Quotations
    "AddQuotationModal": "features/features/quotations/AddQuotationModal", # Typo check
    "AddQuotationModal": "features/quotations/AddQuotationModal",
    "EditQuotationModal": "features/quotations/EditQuotationModal",
    "QuotationDetailsModal": "features/quotations/QuotationDetailsModal",
    
    # Features - Users
    "AddUserModal": "features/users/AddUserModal",
    "EditUserModal": "features/users/EditUserModal",
    "UserDetailsModal": "features/users/UserDetailsModal",
    "AddRoleModal": "features/users/AddRoleModal",
    "RoleDetailsModal": "features/users/RoleDetailsModal",
    "UserWalletModal": "features/users/UserWalletModal",
    
    # Features - Suppliers
    "AddSupplierModal": "features/suppliers/AddSupplierModal",
    "EditSupplierModal": "features/suppliers/EditSupplierModal",
    "SupplierDetailsModal": "features/suppliers/SupplierDetailsModal",
    
    # Features - Packages
    "AddPackageModal": "features/packages/AddPackageModal",
    "EditPackageModal": "features/packages/EditPackageModal",
    "PackageDetailsModal": "features/packages/PackageDetailsModal",
    
    # Features - Categories
    "AddCategoryModal": "features/categories/AddCategoryModal",
    "EditCategoryModal": "features/categories/EditCategoryModal",
    
    # Features - Warehouses
    "AddWarehouseModal": "features/warehouses/AddWarehouseModal",
    "EditWarehouseModal": "features/warehouses/EditWarehouseModal",
    "WarehouseDetailsModal": "features/warehouses/WarehouseDetailsModal",
    "SetWithdrawalLimitModal": "features/warehouses/SetWithdrawalLimitModal",
    
    # Features - Inventory (Products)
    "ProductSelectionModal": "features/inventory/ProductSelectionModal",
    "AddProductModal": "features/inventory/AddProductModal",
    "EditProductModal": "features/inventory/EditProductModal",
    
    # Inventory Sub-components
    "AddGoodsReceiptModal": "features/inventory/AddGoodsReceiptModal",
    "AddReturnModal": "features/inventory/AddReturnModal",
    "AddStockAdjustmentModal": "features/inventory/AddStockAdjustmentModal",
    "AddTransferModal": "features/inventory/AddTransferModal",
    "AddWithdrawalModal": "features/inventory/AddWithdrawalModal",
    "EditReturnModal": "features/inventory/EditReturnModal",
    "EditStockAdjustmentModal": "features/inventory/EditStockAdjustmentModal",
    "EditTransferModal": "features/inventory/EditTransferModal",
    "GoodsReceiptDetailsModal": "features/inventory/GoodsReceiptDetailsModal",
    "ReturnDetailsModal": "features/inventory/ReturnDetailsModal",
    "StockAdjustmentDetailsModal": "features/inventory/StockAdjustmentDetailsModal",
    "TransferDetailsModal": "features/inventory/TransferDetailsModal",
    "WithdrawalDetailsModal": "features/inventory/WithdrawalDetailsModal",
}

# Move files
for src, dest in moves.items():
    if os.path.exists(src):
        try:
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.move(src, dest)
            print(f"Moved {src} to {dest}")
        except Exception as e:
            print(f"Error moving {src}: {e}")
    else:
        pass

# Move inventory folder contents
inv_src = "src/components/inventory"
inv_dest = "src/components/features/inventory"
if os.path.exists(inv_src):
    os.makedirs(inv_dest, exist_ok=True)
    for item in os.listdir(inv_src):
        s = os.path.join(inv_src, item)
        d = os.path.join(inv_dest, item)
        if os.path.isfile(s):
            try:
                shutil.move(s, d)
                print(f"Moved {s} to {d}")
            except Exception as e:
                print(f"Error moving {s}: {e}")
    try:
        os.rmdir(inv_src)
    except:
        pass

# Update imports
def update_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return
    
    original_content = content
    
    def replace_import(match):
        full_match = match.group(0)
        quote = match.group(1)
        path = match.group(2)
        
        if "components" not in path:
             return full_match

        parts = path.split('/')
        try:
            idx = parts.index('components')
        except ValueError:
            return full_match
            
        subpath = parts[idx+1:]
        if not subpath: return full_match
        
        component_name = subpath[-1]
        if component_name == "ui" and len(subpath) > 1: # ui/Button
             component_name = subpath[-1] # Wait, if it's ui/Button, subpath is ['ui', 'Button'], name is Button
        
        # remove extension
        if component_name.endswith('.tsx') or component_name.endswith('.ts'):
            component_name = component_name[:-4]
        
        if component_name in component_map:
            new_subpath = component_map[component_name]
            prefix = "/".join(parts[:idx+1])
            new_path = f"{prefix}/{new_subpath}"
            return f"from {quote}{new_path}{quote}"
            
        return full_match

    # Regex for static imports
    content = re.sub(r'from ([\'"])(.*?components.*?)(\1)', replace_import, content)
    
    # Regex for dynamic imports
    # content = re.sub(r'import\(([\'"])(.*?components.*?)(\1)\)', lambda m: f"import({m.group(1)}{replace_import(m).split(m.group(1))[1]}{m.group(1)})", content)
    # Simplifying dynamic import regex manually since lambda is tricky with replace_import logic reusing
    
    # Actually let's just run the same replacement logic on the content inside import()
    # But replace_import expects the full match "from 'path'".
    # We can adapt regex to match path in quotes.
    
    # New generic replacer for paths in quotes containing 'components'
    def replace_path(match):
        quote = match.group(1)
        path = match.group(2)
        if "components" not in path: return match.group(0)
        
        parts = path.split('/')
        try:
            idx = parts.index('components')
        except ValueError:
            return match.group(0)
            
        subpath = parts[idx+1:]
        if not subpath: return match.group(0)
        
        component_name = subpath[-1]
        if component_name == "ui" and len(subpath) > 1:
             component_name = subpath[-1]
        
        if component_name.endswith('.tsx') or component_name.endswith('.ts'):
            component_name = component_name[:-4]
            
        if component_name in component_map:
            new_subpath = component_map[component_name]
            prefix = "/".join(parts[:idx+1])
            new_path = f"{prefix}/{new_subpath}"
            return f"{quote}{new_path}{quote}"
        
        return match.group(0)

    # Apply to all quoted strings containing components? Risky.
    # Better to stick to imports.
    
    # Refined regex for imports
    content = re.sub(r'from ([\'"])(.*?components.*?)(\1)', lambda m: f"from {replace_path(m)}", content)
    content = re.sub(r'import\(([\'"])(.*?components.*?)(\1)\)', lambda m: f"import({replace_path(m)})", content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk("src"):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            update_file(os.path.join(root, file))
