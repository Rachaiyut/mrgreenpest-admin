import { useState, useEffect, useMemo, useRef, ChangeEvent, FormEvent, FC, useCallback } from 'react';
import { Card } from '../../common/Card';
import {
    FormField,
    Input,
    Select,
    Button,
    Textarea,
} from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import { 
    PlusIcon, 
    TrashIcon, 
    DocumentTextIcon, 
    HomeIcon, 
    MapIcon, 
    ClipboardDocumentListIcon, 
    CurrencyDollarIcon, 
    CalendarIcon,
    MapPinIcon,
    NewFieldOpsIcon
} from '../../../assets/icons/Icons';
import { useData } from '../../../contexts/DataContext';
import { Status } from '../../../types/entity/core.interface';
import { Assessment } from '../../../types/entity/assessment.interface';
import { Quotation } from '../../../types/entity/financial.interface';
import { AssessmentApi } from '../../../api/assessment';
import { CategoryApi } from '../../../api/category';
import { CustomerApi } from '../../../api/customer';
import { Customer } from '../../../types/entity/customer.interface';
import { CategoryType } from '@/src/types';

import { PackageApi } from '../../../api/package';
import { Package } from '../../../types/entity/package.interface';

interface QuotationItem {
    id: string;
    productId: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    amount: number;
}

export interface QuotationFormProps {
    mode: 'create' | 'edit' | 'revise' | 'detail';
    initialValues?: Partial<Quotation>;
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
    assessmentId?: string | null;
}

export const QuotationForm: FC<QuotationFormProps> = ({
    mode,
    initialValues,
    onSubmit,
    onCancel,
    assessmentId,
}) => {
    const { products, categories } = useData();
    const isReadOnly = mode === 'detail';

    // Local state for fetched data
    const [fetchedCustomers, setFetchedCustomers] = useState<Customer[]>([]);
    const [fetchedAssessments, setFetchedAssessments] = useState<Assessment[]>([]);
    const [fetchedCategories, setFetchedCategories] = useState<any[]>([]);
    
    // Initial data fetching
    useEffect(() => {
        const initData = async () => {
            try {
                const [custRes, assessRes, catRes] = await Promise.all([
                    CustomerApi.getCustomers({ limit: 10 }),
                    AssessmentApi.getAll({ limit: 10 }),
                    CategoryApi.getCategories({ type: CategoryType.SERVICE })
                ]);
                
                if (custRes?.data) setFetchedCustomers(custRes.data);
                if (assessRes?.data) setFetchedAssessments(assessRes.data);
                if (catRes?.data) setFetchedCategories(catRes.data);
        
            } catch (err) {
                console.error("Error fetching initial data:", err);
            }
        };
        initData();
    }, []);

    // Ensure we use the most complete list of categories (Context + potentially fetched)
    // For now, relying on Context 'categories' is standard pattern in this app.
    // If 'categories' is empty, we might want to trigger a fetch in DataContext or here.
    
    // Service Type Options derived from categories
    const serviceTypeOptions = useMemo(() => {
        const sourceCategories = fetchedCategories.length > 0 ? fetchedCategories : (categories || []);
        return sourceCategories
            .filter((c: any) => c.type === 'SERVICE')
            .map((c: any) => ({
                value: c.name, // Use name as value to match backend expectation of string
                label: c.name,
                id: c.id // Keep ID for reference if needed
            }));
    }, [categories, fetchedCategories]);

    // Customer info
    const [selectedCustomerId, setSelectedCustomerId] = useState(initialValues?.customer_id || '');

    // Customer Search Handling
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleCustomerSearch = useCallback((query: string) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await CustomerApi.getCustomers({ search: query, limit: 50 });
                if (res && res.data) {
                    setFetchedCustomers(prev => {
                        const selected = prev.find(c => c.id === selectedCustomerId);
                        if (selected && !res.data.find(c => c.id === selected.id)) {
                            return [selected, ...res.data];
                        }
                        return res.data;
                    });
                }
            } catch (error) {
                console.error("Error searching customers:", error);
            }
        }, 500);
    }, [selectedCustomerId]);

    // Assessment reference
    const [selectedAssessmentId, setSelectedAssessmentId] = useState(
        assessmentId || initialValues?.assessment_id || ''
    );

    // Assessment Search Handling
    const assessmentSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleAssessmentSearch = useCallback((query: string) => {
        if (assessmentSearchTimeoutRef.current) {
            clearTimeout(assessmentSearchTimeoutRef.current);
        }

        assessmentSearchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await AssessmentApi.getAll({ search: query, limit: 10 });
                if (res && res.data) {
                    setFetchedAssessments(prev => {
                        const selected = prev.find(a => a.id === selectedAssessmentId);
                        if (selected && !res.data.find(a => a.id === selected.id)) {
                            return [selected, ...res.data];
                        }
                        return res.data;
                    });
                }
            } catch (error) {
                console.error("Error searching assessments:", error);
            }
        }, 500);
    }, [selectedAssessmentId]);

    // Quotation info
    const [quotationDate, setQuotationDate] = useState(
        initialValues?.created_at ? new Date(initialValues.created_at).toISOString().substring(0, 10) : ''
    );
    const [validityDays, setValidityDays] = useState(30); // Default, logic to calc from existing expiry needed if edit
    const [expiresAt, setExpiresAt] = useState(
        initialValues?.expires_at ? new Date(initialValues.expires_at).toISOString().substring(0, 10) : ''
    );
    
    // Contact Phone (Editable)
    const [contactPhone, setContactPhone] = useState(initialValues?.contact_phone || '');

    // Service info
    const [serviceLocation, setServiceLocation] = useState(initialValues?.service_location || '');
    const [buildingType, setBuildingType] = useState(initialValues?.building_type || '');
    const [serviceArea, setServiceArea] = useState(initialValues?.service_area || '');
    const [serviceSystem, setServiceSystem] = useState(initialValues?.service_system || '');
    const [systemUsed, setSystemUsed] = useState(initialValues?.system_used || '');
    
    // Convert comma-separated string back to array if needed, or default to empty array
    const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>(
        initialValues?.service_type 
            ? initialValues.service_type.split(',').map(s => s.trim()).filter(Boolean)
            : []
    );
    // Keep serviceType state synced for backward compatibility or simple submission logic
    const [serviceType, setServiceType] = useState(initialValues?.service_type || '');

    // Sync serviceType string when selectedServiceTypes changes
    useEffect(() => {
        setServiceType(selectedServiceTypes.join(', '));
    }, [selectedServiceTypes]);

    const [paymentTerms, setPaymentTerms] = useState(
        initialValues?.payment_terms || 'ชำระเมื่อเข้าปฏิบัติงานครั้งแรกเสร็จเรียบร้อย'
    );
    const [notes, setNotes] = useState(initialValues?.notes || '');
    const [contractDuration, setContractDuration] = useState(initialValues?.contract_duration || '1 ปี');
    const [serviceCount, setServiceCount] = useState(initialValues?.service_count || '7 ครั้ง');

    // Reset when usePackagePricing changes back to false if needed, but usually we keep last valid or default
    // Logic to sync package defaults if package changes is handled in useEffect[selectedAssessment]


    // Line items
    const [items, setItems] = useState<QuotationItem[]>(
        initialValues?.items
            ?.filter((item: any) => {
                // Filter legacy artifacts from bug
                if (item.unit === 'พื้นที่' && !item.product_id) return false;
                // Filter out package items if they are accidentally in the list (identified by unit 'งาน/แพ็กเกจ' or description starting with 'แพ็กเกจ:')
                if (item.unit === 'งาน/แพ็กเกจ' || item.description?.startsWith('แพ็กเกจ:')) return false;
                return true;
            })
            ?.map((item: any) => ({
                id: crypto.randomUUID(),
                productId: item.product_id || '',
                description: item.description || '',
                quantity: Number(item.quantity) || 1,
                unit: item.unit || 'ครั้ง',
                unitPrice: Number(item.unit_price) || 0,
                amount: Number(item.amount) || 0,
            })) || [
            {
                id: crypto.randomUUID(),
                productId: '',
                description: '',
                quantity: 1,
                unit: 'ครั้ง',
                unitPrice: 0,
                amount: 0,
            },
        ]
    );

    // Standard service counts for dropdown
    const standardServiceCounts = ["1 ครั้ง", "3 ครั้ง", "5 ครั้ง", "7 ครั้ง", "8 ครั้ง", "12 ครั้ง", "24 ครั้ง"];

    // Ensure custom service count is available in options
    const serviceCountOptions = useMemo(() => {
        const options = [...standardServiceCounts];
        if (serviceCount && !options.includes(serviceCount)) {
            options.push(serviceCount);
            options.sort((a, b) => {
                const numA = parseInt(a) || 0;
                const numB = parseInt(b) || 0;
                return numA - numB;
            });
        }
        return options;
    }, [serviceCount]);

    // VAT settings
    const [includeVat, setIncludeVat] = useState(initialValues?.include_vat ?? true);
    const vatRate = 0.07;

    // Product options for dropdown (filter out PACKAGE items)
    const productOptions = useMemo(() => {
        return products
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            .filter((p) => p.type !== 'PACKAGE') // Filter out products with type 'PACKAGE'
            .map((p) => ({
                value: p.id,
                label: `${p.code} - ${p.name}`,
                description: p.unit?.name || '',
            }));
    }, [products]);

    // Assessment options for dropdown
    const assessmentOptions = useMemo(() => {
        return (fetchedAssessments || []).map((a) => {
            const customerName = a.customer
                ? `${a.customer.first_name || ''} ${a.customer.last_name || ''}`.trim()
                : 'ไม่ระบุลูกค้า';
            return {
                value: a.id,
                label: `${a.code || 'No Code'} - ${customerName} [${a.status}]`,
                description: a.address || '',
            };
        });
    }, [fetchedAssessments]);

    // Selected assessment details
    const [fullAssessment, setFullAssessment] = useState<Assessment | null>(null);
    const [fetchedPackage, setFetchedPackage] = useState<Package | null>(null);

    // Fetch full assessment details when ID changes
    useEffect(() => {
        if (selectedAssessmentId) {
            const fetchFull = async () => {
                try {
                    const res = await AssessmentApi.getById(selectedAssessmentId);
                    setFullAssessment(res);
                    
                    // If assessment has package_id (or nested package object with ID), fetch package details explicitly
                    const packageId = res.package_id || (res.package && res.package.id);
                    
                    if (packageId) {
                        try {
                            const pkgRes = await PackageApi.getPackageById(packageId);
                            setFetchedPackage(pkgRes);
                        } catch (pkgErr) {
                            console.error("Error fetching package details:", pkgErr);
                            setFetchedPackage(null);
                        }
                    } else {
                        setFetchedPackage(null);
                    }
                } catch (err) {
                    console.error("Error fetching full assessment:", err);
                    setFullAssessment(null);
                    setFetchedPackage(null);
                }
            };
            fetchFull();
        } else {
            setFullAssessment(null);
            setFetchedPackage(null);
        }
    }, [selectedAssessmentId]);

    const selectedAssessment = useMemo(() => {
        const assessment = (fullAssessment && fullAssessment.id === selectedAssessmentId)
            ? fullAssessment
            : fetchedAssessments?.find((a) => a.id === selectedAssessmentId);

        if (assessment && fetchedPackage) {
             // Check if assessment links to this package either via package_id OR if the nested package object has the same ID
             const assessmentPkgId = assessment.package_id || (assessment.package && assessment.package.id);
             
             if (assessmentPkgId === fetchedPackage.id) {
                return {
                    ...assessment,
                    package: {
                        ...assessment.package, // Keep existing props
                        ...fetchedPackage, // Overwrite with full master details
                        // Ensure package_price is carried over
                        package_price: fetchedPackage.package_price || (fetchedPackage as any).package_prices || assessment.package?.package_price
                    }
                };
             }
        }
        return assessment;
    }, [fetchedAssessments, selectedAssessmentId, fullAssessment, fetchedPackage]);

    // Selected customer details
    const selectedCustomer = useMemo(() => {
        return fetchedCustomers.find((c) => c.id === selectedCustomerId);
    }, [fetchedCustomers, selectedCustomerId]);



    // Initialize dates if create mode
    useEffect(() => {
        if (mode === 'create' && !initialValues) {
            const today = new Date();
            const expiry = new Date();
            expiry.setDate(today.getDate() + validityDays);

            setQuotationDate(today.toISOString().substring(0, 10));
            setExpiresAt(expiry.toISOString().substring(0, 10));
        } else if ((mode === 'edit' || mode === 'revise') && initialValues?.created_at && initialValues?.expires_at) {
            // Calculate validity days from existing dates
            const start = new Date(initialValues.created_at);
            const end = new Date(initialValues.expires_at);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setValidityDays(diffDays);
        }
    }, [mode, initialValues]);

    // Auto-fill from assessment when selected (only if not editing/revising existing data, or user explicitly changes assessment)
    // We need to be careful not to overwrite data when loading an existing quotation
    // For now, we'll only auto-fill if the selectedAssessmentId changes and it matches the one passed in via props/init only if we are in create mode or explicit change
    // Actually, safer to just run this if it's a NEW selection. 
    // To simplify: if mode is Create, we behave as before. 
    // If mode is Edit/Revise, we assume data is loaded from initialValues, but if user changes assessment, we might want to prompt or just not auto-fill blindly.
    // For this task, let's keep the logic but maybe guard it.

    // Package Info from Assessment
    const [packagePrice, setPackagePrice] = useState(0);
    const [packageName, setPackageName] = useState('');
    const [usePackagePricing, setUsePackagePricing] = useState(false);

    // Installment Logic
    const [isInstallment, setIsInstallment] = useState(
        !!(initialValues?.is_installment || (initialValues?.installments && initialValues.installments.length > 0))
    );
    const [manualInstallmentCount, setManualInstallmentCount] = useState(
        (initialValues?.installments && initialValues.installments.length > 0)
            ? initialValues.installments.length
            : 2
    );
    const [installments, setInstallments] = useState<any[]>(
        (initialValues?.installments && initialValues.installments.length > 0)
            ? initialValues.installments.map((inst: any) => ({
                installment_no: inst.installment_no,
                amount: inst.amount,
                service_date: inst.service_date ? new Date(inst.service_date).toISOString().substring(0, 10) : '',
                notes: inst.notes || ''
            }))
            : []
    );

    // Auto-fill from assessment when selected
    useEffect(() => {
        if (selectedAssessment) {
            // Set customer
            if (selectedAssessment.customer_id && (mode === 'create' || !selectedCustomerId)) {
                setSelectedCustomerId(selectedAssessment.customer_id);
            }

            // Set service location if empty
            if (!serviceLocation) {
                const address = [
                    selectedAssessment.address,
                    selectedAssessment.sub_district,
                    selectedAssessment.district,
                    selectedAssessment.province,
                    selectedAssessment.zipcode,
                ]
                    .filter(Boolean)
                    .join(' ');
                setServiceLocation(address);
            }

            // Auto-fill from first assessment area if available
            if (selectedAssessment.assessment_areas && selectedAssessment.assessment_areas.length > 0) {
                const firstArea = selectedAssessment.assessment_areas[0];
                
                // Building Type
                if (!buildingType && firstArea.building_type) {
                    setBuildingType(firstArea.building_type.toUpperCase());
                }

                // Service System
                if (!serviceSystem && firstArea.service_system) {
                    let ss = firstArea.service_system.toUpperCase();
                    if (ss === 'PREY') ss = 'PREY';
                    if (ss === 'SPRAY') ss = 'CHEMICAL';
                    setServiceSystem(ss);
                }

                // Area Size (Sum of all areas)
                if (!serviceArea) {
                     const totalSize = selectedAssessment.assessment_areas.reduce((sum: number, a: any) => sum + (Number(a.area_size) || 0), 0);
                     if (totalSize > 0) {
                         setServiceArea(`${totalSize.toLocaleString()} ตร.ม.`);
                     }
                }
            }

            // Auto-fill Service Type (ประเภทบริการ)
            // We re-evaluate this if selectedServiceTypes is empty OR if we have new categories loaded 
            // (e.g. initial load of categories might happen after assessment is selected)
            if (selectedAssessment.assessment_areas && selectedAssessment.assessment_areas.length > 0) {
                const newSelectedTypes: string[] = [];
                
                // Extract all category IDs from all areas
                const allCategoryIds = selectedAssessment.assessment_areas.flatMap(area => 
                    (area.category_services || []).map(cs => cs.category_id)
                ).filter(Boolean);
                
                const uniqueIds = Array.from(new Set(allCategoryIds));
                
                if (uniqueIds.length > 0) {
                    // Use the most complete list of categories available
                    const sourceCategories = fetchedCategories.length > 0 ? fetchedCategories : (categories || []);
                    
                    // Filter valid categories from master data using IDs
                    const matchedCategories = sourceCategories.filter((c: any) => uniqueIds.includes(c.id) && c.type === 'SERVICE');
                    
                    if (matchedCategories.length > 0) {
                            // Add all matched names
                            matchedCategories.forEach(c => {
                                if (c.name && !newSelectedTypes.includes(c.name)) {
                                    newSelectedTypes.push(c.name);
                                }
                            });
                    }
                }

                // Only update if we found something and it's different from current
                if (newSelectedTypes.length > 0) {
                    // Check if different to avoid infinite loop
                    const isDifferent = newSelectedTypes.length !== selectedServiceTypes.length || 
                                        !newSelectedTypes.every(t => selectedServiceTypes.includes(t));
                    
                    if (isDifferent) {
                         // If user hasn't manually selected anything yet (empty), overwrite.
                         // Or if we want to merge? User said "doesn't show up", implying it's empty initially.
                         // Let's just set it.
                         if (selectedServiceTypes.length === 0) {
                             setSelectedServiceTypes(newSelectedTypes);
                         }
                    }
                }
            }

            // Auto-fill System Used (ระบบที่ใช้)
            if (!systemUsed && selectedAssessment.assessment_areas && selectedAssessment.assessment_areas.length > 0) {
                const systems = Array.from(new Set(
                    selectedAssessment.assessment_areas
                        .map((area: any) => area.service_system)
                        .filter(Boolean)
                ));

                if (systems.length > 0) {
                    const systemLabels = systems.map((s: any) => {
                        if (s === 'PREY') return 'ระบบเหยื่อ';
                        if (s === 'CHEMICAL') return 'ระบบสารเคมีกึ่งชีวภาพ';
                        return s;
                    });
                    // Select value has single options, if mixed we might need a better logic or 'ระบบเหยื่อ' as priority if exists?
                    // For now, if multiple, prioritize Bait > Chemical
                    if (systemLabels.includes('ระบบเหยื่อ')) {
                        setSystemUsed('ระบบเหยื่อ');
                    } else if (systemLabels.includes('ระบบสารเคมีกึ่งชีวภาพ')) {
                        setSystemUsed('ระบบสารเคมีกึ่งชีวภาพ');
                    } else {
                        setSystemUsed(systemLabels[0]);
                    }
                }
            }

            // Auto-fill Payment Terms / Installment - REMOVED

            // Check for Package
            if (selectedAssessment.package) {
                setUsePackagePricing(true);
                setPackageName(selectedAssessment.package.name);
                // Use Master Package Price instead of Assessment Total
                let masterPrice = 0;
                
                // Prioritize fetchedPackage (Master Data) over selectedAssessment.package
                // Because selectedAssessment.package might have stale or incomplete data (e.g. missing prices)
                const pkg = fetchedPackage || selectedAssessment.package;

                if (pkg) {
                    // Check for both property names just in case (backend inconsistency between finding by ID vs relation)
                    const pkgPrices = pkg.package_price || (pkg as any).package_prices;
                    
                    // Determine Area Size: Use form value (editable) or fallback to assessment area
                    // Parse "68.00 ตร.ม." -> 68.00
                    let areaSize = 0;
                    if (serviceArea) {
                        areaSize = parseFloat(serviceArea.replace(/[^0-9.]/g, '')) || 0;
                    } 
                    
                    if (areaSize === 0 && selectedAssessment.assessment_areas && selectedAssessment.assessment_areas.length > 0) {
                        areaSize = Number(selectedAssessment.assessment_areas[0].area_size) || 0;
                    }

                    if (areaSize > 0 && Array.isArray(pkgPrices) && pkgPrices.length > 0) {
                         // Sort by area_range ASC
                         const sortedPrices = [...pkgPrices].sort((a: any, b: any) => Number(a.area_range) - Number(b.area_range));
                         
                         // Find first tier where area_range >= area_size
                         const condition = sortedPrices.find((p: any) => Number(p.area_range) >= areaSize);
                         
                         if (condition) {
                             // Check for Termite service
                             // We check the assessment area categories to see if "Termite" service is required
                             let hasTermite = false;
                             
                             if (selectedAssessment.assessment_areas && selectedAssessment.assessment_areas.length > 0) {
                                 const area = selectedAssessment.assessment_areas[0];
                                 hasTermite = area.category_services?.some((c: any) => {
                                     if (c.name && /ปลวก|termite/i.test(c.name)) return true;
                                     const masterCat = fetchedCategories.find((cat: any) => cat.id === c.category_id);
                                     return masterCat && /ปลวก|termite/i.test(masterCat.name);
                                 }) || false;
                             }
                             
                             const priceWith = Number(condition.price_with_termite);
                             const priceWithout = Number(condition.price_without_termite);
                             
                             masterPrice = hasTermite 
                                ? (priceWith > 0 ? priceWith : priceWithout)
                                : (priceWithout > 0 ? priceWithout : priceWith);
                         }
                    }
                }
                
                // Fallback to assessment total if calculation failed or returned 0 (and we have no package data)
                if (masterPrice === 0 && selectedAssessment.total_price) {
                     masterPrice = Number(selectedAssessment.total_price);
                }

                setPackagePrice(masterPrice);

                // Auto-fill Contract Duration & Service Count from Package
                if (selectedAssessment.package.contract_period) {
                    setContractDuration(`${selectedAssessment.package.contract_period} ปี`);
                }
                if (selectedAssessment.package.visit_limit) {
                    setServiceCount(`${selectedAssessment.package.visit_limit} ครั้ง`);
                }

                // If using package pricing, we also populate items from areas if available (as additional items)
                if (mode === 'create' && (!items || items.length === 0)) {
                     // Check if there are items in assessment areas
                     if (selectedAssessment.assessment_areas && selectedAssessment.assessment_areas.length > 0) {
                        const newItems: QuotationItem[] = [];

                        selectedAssessment.assessment_areas.forEach(area => {
                            if (area.items && area.items.length > 0) {
                                // Map specific product items
                                area.items.forEach(item => {
                                    if (!item.product_id) return; // Skip items without product ID

                                    // Find master product price to ensure accuracy
                                    const masterProduct = products.find(p => p.id === item.product_id);
                                    const unitPrice = masterProduct
                                        ? (Number(masterProduct.price) || Number(masterProduct.cost_price) || 0)
                                        : (Number(item.product_price) || 0);

                                    newItems.push({
                                        id: crypto.randomUUID(),
                                        productId: item.product_id,
                                        description: item.product_name,
                                        quantity: Number(item.quantity) || 1,
                                        unit: 'ครั้ง',
                                        unitPrice: unitPrice,
                                        amount: (Number(item.quantity) || 1) * unitPrice,
                                    });
                                });
                            }
                        });

                        if (newItems.length > 0) {
                            setItems(newItems);
                        }
                    }
                }
            } else if (mode === 'create' && !initialValues?.items) {
                // Fallback: No package, map areas to items
                if (selectedAssessment.assessment_areas && selectedAssessment.assessment_areas.length > 0) {
                    const newItems: QuotationItem[] = [];

                    selectedAssessment.assessment_areas.forEach(area => {
                        if (area.items && area.items.length > 0) {
                            // Map specific product items
                            area.items.forEach(item => {
                                if (!item.product_id) return; // Skip items without product ID

                                // Find master product price to ensure accuracy (optional, but requested implicitly)
                                const masterProduct = products.find(p => p.id === item.product_id);
                                const unitPrice = masterProduct
                                    ? (Number(masterProduct.price) || Number(masterProduct.cost_price) || 0)
                                    : (Number(item.product_price) || 0);

                                newItems.push({
                                    id: crypto.randomUUID(),
                                    productId: item.product_id,
                                    description: item.product_name,
                                    quantity: Number(item.quantity) || 1,
                                    unit: 'ครั้ง',
                                    unitPrice: unitPrice,
                                    amount: (Number(item.quantity) || 1) * unitPrice,
                                });
                            });
                        }
                    });

                    setItems(newItems.length > 0 ? newItems : []);
                }
            }
        }
    }, [selectedAssessment, mode, categories, fetchedCategories, fetchedPackage, serviceArea]);

    // Update expiry date when validity days change
    useEffect(() => {
        if (quotationDate) {
            const date = new Date(quotationDate);
            date.setDate(date.getDate() + validityDays);
            setExpiresAt(date.toISOString().substring(0, 10));
        }
    }, [quotationDate, validityDays]);

    // Auto-fill customer info
    useEffect(() => {
        if (selectedCustomer) {
            // Fill address if empty or creating new
            if (!serviceLocation || mode === 'create') {
                if (!serviceLocation) {
                    const address = [
                        selectedCustomer.address_house_no,
                        selectedCustomer.road_line,
                        selectedCustomer.sub_district,
                        selectedCustomer.district,
                        selectedCustomer.province,
                        selectedCustomer.postal_code,
                    ]
                        .filter(Boolean)
                        .join(' ');
                    setServiceLocation(address);
                }
            }

            // Fill contact phone if empty
            if (!contactPhone) {
                setContactPhone(selectedCustomer.phone || '');
            }
        }
    }, [selectedCustomer]);

    // Handle item changes
    const handleItemChange = (
        id: string,
        field: keyof QuotationItem,
        value: string | number
    ) => {
        setItems((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;

                const updated = { ...item, [field]: value };

                // Recalculate amount
                if (field === 'quantity' || field === 'unitPrice') {
                    updated.amount = updated.quantity * updated.unitPrice;
                }

                return updated;
            })
        );
    };

    // Handle product selection
    const handleProductSelect = (itemId: string, productId: string) => {
        const product = products.find((p) => p.id === productId);
        setItems((prev) =>
            prev.map((item) => {
                if (item.id !== itemId) return item;

                if (product) {
                    const unitPrice = Number(product.cost_price) || 0;
                    return {
                        ...item,
                        productId: productId,
                        description: product.name,
                        unit: product.unit?.name || 'ครั้ง',
                        unitPrice: unitPrice,
                        amount: item.quantity * unitPrice,
                    };
                } else {
                    return {
                        ...item,
                        productId: '',
                        description: '',
                        unit: 'ครั้ง',
                        unitPrice: 0,
                        amount: 0,
                    };
                }
            })
        );
    };

    const addItem = () => {
        setItems((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                productId: '',
                description: '',
                quantity: 1,
                unit: 'ครั้ง',
                unitPrice: 0,
                amount: 0,
            },
        ]);
    };

    const removeItem = (id: string) => {
        if (items.length <= 1) return;
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const handlePackagePricingToggle = (e: ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        setUsePackagePricing(isChecked);

        if (isChecked) {
            // Auto-fill package info if available
            if (selectedAssessment?.package) {
                setPackageName(selectedAssessment.package.name);
                setPackagePrice(Number(selectedAssessment.total_price) || 0);
            }

            // Clear items for "Add-ons" (user adds manually)
            setItems([]);

        } else {
            // Restore items from assessment areas if available
            if (selectedAssessment?.assessment_areas && selectedAssessment.assessment_areas.length > 0) {
                const newItems: QuotationItem[] = [];

                selectedAssessment.assessment_areas.forEach(area => {
                    if (area.items && area.items.length > 0) {
                        // Map specific product items
                        area.items.forEach(item => {
                            if (!item.product_id) return; // Skip items without product ID

                            // Find master product price to ensure accuracy (optional, but requested implicitly)
                            const masterProduct = products.find(p => p.id === item.product_id);
                            const unitPrice = masterProduct
                                ? (Number(masterProduct.price) || Number(masterProduct.cost_price) || 0)
                                : (Number(item.product_price) || 0);

                            newItems.push({
                                id: crypto.randomUUID(),
                                productId: item.product_id,
                                description: item.product_name,
                                quantity: Number(item.quantity) || 1,
                                unit: 'ครั้ง',
                                unitPrice: unitPrice,
                                amount: (Number(item.quantity) || 1) * unitPrice,
                            });
                        });
                    }
                });

                setItems(newItems.length > 0 ? newItems : items);
            }
        }
    };

    // Calculate totals
    const subtotal = useMemo(() => {
        const itemsTotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        return itemsTotal + (usePackagePricing ? packagePrice : 0);
    }, [items, usePackagePricing, packagePrice]);

    const vatAmount = useMemo(() => {
        return includeVat ? subtotal * vatRate : 0;
    }, [subtotal, includeVat]);

    const netTotal = useMemo(() => {
        return subtotal + vatAmount;
    }, [subtotal, vatAmount]);

    // Recalculate installments - REMOVED
    useEffect(() => {
       // Logic removed
       setInstallments([]);
    }, []);

    const handleInstallmentChange = (index: number, field: string, value: any) => {
        // Logic removed
    };


    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!selectedCustomerId || !selectedCustomer) {
            alert('กรุณาเลือกลูกค้า');
            return;
        }

        if (!buildingType) {
            alert('กรุณาระบุประเภทสิ่งปลูกสร้าง (Building Type is required)');
            return;
        }
        if (!serviceType) {
            alert('กรุณาระบุประเภทบริการ (Service Type is required)');
            return;
        }

        // Validation: If no items AND no package, alert
        const hasValidItems = items.some((item) => item.description && item.amount > 0);
        if (!hasValidItems && (!usePackagePricing || packagePrice <= 0)) {
            alert('กรุณาเพิ่มรายการสินค้าหรือเลือกแพ็กเกจ');
            return;
        }

        // Validation: If installments enabled, check dates
        /*
        if (isInstallment) {
            const hasInvalidDate = installments.some(inst => !inst.service_date);
            if (hasInvalidDate) {
                alert('กรุณาระบุวันที่เข้าบริการสำหรับทุกงวด (Installment Dates are required)');
                return;
            }
        }
        */

        // Prepare items: If usePackagePricing is true, add it as the first item
        let finalItems = items.map((item, index) => ({
            sequence: index + 1, // temporary, will fix below
            product_id: item.productId || null,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unitPrice,
            amount: item.amount,
        }));

        if (usePackagePricing) {
            const packageItem = {
                sequence: 1,
                product_id: null,
                description: `แพ็กเกจ: ${packageName || 'บริการหลัก'}`,
                quantity: 1,
                unit: 'งาน/แพ็กเกจ',
                unit_price: packagePrice,
                amount: packagePrice,
            };
            // Add to start
            finalItems = [packageItem, ...finalItems];
        } else {
            // Filter out empty lines if any (optional, but good practice)
            finalItems = finalItems.filter(i => i.description || i.amount > 0);
        }

        // Re-sequence
        finalItems = finalItems.map((item, idx) => ({ ...item, sequence: idx + 1 }));

        const quotationData = {
            ...initialValues, // preserve ID and other fields if editing
            assessment_id: selectedAssessmentId || undefined,
            customer_id: selectedCustomerId,
            customer_name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
            created_at: quotationDate,
            expires_at: expiresAt,
            status: initialValues?.status || Status.Draft,
            total: netTotal,
            revision: mode === 'revise' ? (initialValues?.revision || 0) + 1 : (initialValues?.revision || 1),
            google_map_link: selectedCustomer.google_map_link || '',
            payment_terms: paymentTerms,
            service_location: serviceLocation,
            building_type: buildingType,
            service_area: serviceArea,
            service_system: serviceSystem,
            system_used: systemUsed,
            service_type: serviceType,
            notes: notes,
            contract_duration: contractDuration,
            service_count: serviceCount,
            subtotal: subtotal,
            vat_amount: vatAmount,
            include_vat: includeVat,
            items: finalItems,
            installments: [], // Installments are now handled in Contract
        };

        await onSubmit(quotationData);
    };

    // Helper for Section Header
    const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <div className="p-1.5 bg-green-50 rounded-lg text-green-600">
                <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800 text-lg">{title}</h3>
        </div>
    );

    return (
        <form id="quotation-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. General Information */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <SectionHeader icon={DocumentTextIcon} title="ข้อมูลทั่วไป" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                ลูกค้า <span className="text-red-500">*</span>
                            </label>
                            <SearchableSelect
                                value={selectedCustomerId}
                                onChange={setSelectedCustomerId}
                                onSearchChange={handleCustomerSearch}
                                options={fetchedCustomers.map(c => ({
                                    value: c.id,
                                    label: `${c.first_name} ${c.last_name}`,
                                    description: c.phone
                                }))}
                                placeholder="ค้นหาลูกค้า..."
                                disabled={isReadOnly}
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <FormField label="เบอร์ติดต่อ (Contact Phone)">
                                <Input
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                    placeholder="ระบุเบอร์ติดต่อ..."
                                    disabled={isReadOnly}
                                />
                            </FormField>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                             <label className="block text-sm font-medium text-slate-700 mb-1">
                                อ้างอิงใบประเมิน
                            </label>
                            <SearchableSelect
                                value={selectedAssessmentId}
                                onChange={setSelectedAssessmentId}
                                onSearchChange={handleAssessmentSearch}
                                options={assessmentOptions}
                                placeholder="เลือกใบประเมิน (ถ้ามี)"
                                disabled={isReadOnly}
                            />
                        </div>

                        <FormField label="วันที่เสนอราคา">
                            <Input
                                type="date"
                                value={quotationDate}
                                onChange={(e) => setQuotationDate(e.target.value)}
                                disabled={isReadOnly}
                                required
                            />
                        </FormField>

                        <FormField label="ยืนราคา (วัน)">
                             <Input
                                type="number"
                                value={validityDays}
                                onChange={(e) => setValidityDays(Number(e.target.value))}
                                disabled={isReadOnly}
                                min={1}
                            />
                        </FormField>

                        <FormField label="ใช้ได้ถึงวันที่">
                            <Input
                                type="date"
                                value={expiresAt}
                                disabled={true}
                                className="bg-slate-50"
                            />
                        </FormField>
                    </div>
                </div>

                {/* 2. Address Information */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <SectionHeader icon={HomeIcon} title="ข้อมูลที่อยู่" />
                    
                    <div className="space-y-4">
                        <FormField label="สถานที่ให้บริการ">
                            <Textarea
                                value={serviceLocation}
                                onChange={(e) => setServiceLocation(e.target.value)}
                                disabled={isReadOnly}
                                rows={4}
                                placeholder="ที่อยู่สำหรับเข้าให้บริการ..."
                                required
                            />
                        </FormField>
                        
                        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                             <h4 className="text-sm font-semibold text-yellow-800 mb-2">Google Map</h4>
                             {selectedCustomer?.google_map_link ? (
                                 <a 
                                    href={selectedCustomer.google_map_link} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                                 >
                                    <MapPinIcon className="w-4 h-4" /> เปิดแผนที่ลูกค้า
                                 </a>
                             ) : (
                                 <span className="text-sm text-slate-500">ไม่พบลิงก์แผนที่ในข้อมูลลูกค้า</span>
                             )}
                        </div>
                    </div>
                </div>

                {/* 3. Service Details */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
                    <SectionHeader icon={MapIcon} title="รายละเอียดการบริการ" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FormField label="ประเภทสิ่งปลูกสร้าง">
                            <Select
                                value={buildingType}
                                onChange={(e) => setBuildingType(e.target.value)}
                                disabled={isReadOnly}
                                required
                            >
                                <option value="">เลือกประเภทสิ่งปลูกสร้าง</option>
                                <option value="HOUSE">บ้าน</option>
                                <option value="OFFICE">ออฟฟิศ</option>
                            </Select>
                        </FormField>

                        <FormField label="ระบบที่ใช้บริการ">
                            <Select
                                value={serviceSystem}
                                onChange={(e) => setServiceSystem(e.target.value)}
                                disabled={isReadOnly}
                            >
                                <option value="">เลือกระบบบริการ</option>
                                <option value="CHEMICAL">สารเคมีกชีวภาพ</option>
                                <option value="PREY">เหยื่อ</option>                         
                            </Select>
                        </FormField>

                         <div className="col-span-1 md:col-span-2 lg:col-span-3">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                ประเภทบริการ (Service Type) <span className="text-red-500">*</span>
                            </label>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {serviceTypeOptions.map((option) => (
                                        <label key={option.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-2 rounded transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={selectedServiceTypes.includes(option.value)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedServiceTypes([...selectedServiceTypes, option.value]);
                                                    } else {
                                                        setSelectedServiceTypes(selectedServiceTypes.filter(t => t !== option.value));
                                                    }
                                                }}
                                                disabled={isReadOnly}
                                                className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                                            />
                                            <span className="text-sm text-slate-700">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                                {selectedServiceTypes.length === 0 && (
                                    <p className="text-xs text-red-500 mt-2">กรุณาเลือกอย่างน้อย 1 รายการ</p>
                                )}
                            </div>
                        </div>

                        <FormField label="ระยะเวลาสัญญา">
                            <Input
                                value={contractDuration}
                                onChange={(e) => setContractDuration(e.target.value)}
                                disabled={isReadOnly}
                                placeholder="เช่น 1 ปี"
                            />
                        </FormField>

                        <FormField label="จำนวนครั้งเข้าบริการ">
                             <Select
                                value={serviceCount}
                                onChange={(e) => setServiceCount(e.target.value)}
                                disabled={isReadOnly}
                            >
                                <option value="">เลือกจำนวนครั้ง</option>
                                {serviceCountOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </Select>
                        </FormField>
                    </div>
                </div>

                {/* 4. Assessment Area Details */}
                {selectedAssessment?.assessment_areas && selectedAssessment.assessment_areas.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
                        <SectionHeader icon={ClipboardDocumentListIcon} title="รายละเอียดพื้นที่ประเมิน" />
                        
                        <div className="overflow-hidden border rounded-lg border-slate-200">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">พื้นที่</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ประเภท</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">ขนาด (ตร.ม.)</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">รายละเอียด</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {selectedAssessment.assessment_areas.map((area, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{area.area_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{area.building_type || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">{(Number(area.area_size) || 0).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {area.items && area.items.length > 0 ? (
                                                    <ul className="list-disc list-inside text-xs text-slate-500">
                                                        {area.items.map((item, i) => (
                                                            <li key={i}>{item.product_name} (x{item.quantity})</li>
                                                        ))}
                                                    </ul>
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Total Row */}
                                    <tr className="bg-slate-50 font-semibold">
                                        <td colSpan={2} className="px-6 py-3 text-right text-sm text-slate-700">รวมพื้นที่ทั้งหมด</td>
                                        <td className="px-6 py-3 text-right text-sm text-slate-900">
                                            {selectedAssessment.assessment_areas.reduce((sum, a) => sum + (Number(a.area_size) || 0), 0).toLocaleString()}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 5. Items & Pricing */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
                     <SectionHeader icon={CurrencyDollarIcon} title="รายการสินค้าและบริการ" />

                     {selectedAssessment?.package && (
                        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="usePackagePricing"
                                    checked={usePackagePricing}
                                    onChange={handlePackagePricingToggle}
                                    disabled={isReadOnly}
                                    className="h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <div>
                                    <label htmlFor="usePackagePricing" className="font-semibold text-green-900 cursor-pointer">
                                        ใช้ราคาตามแพ็กเกจ ({packageName})
                                    </label>
                                    <p className="text-sm text-green-700">
                                        ราคา: {packagePrice.toLocaleString()} บาท (รวมบริการมาตรฐาน)
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-green-600 bg-white px-2 py-1 rounded border border-green-200">
                                    แนะนำ
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {!selectedAssessmentId && items.map((item, index) => {
                            // Find product name for display
                            const product = products.find(p => p.id === item.productId);
                            const productName = product ? `${product.code} - ${product.name}` : item.description;

                            return (
                                <div key={item.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50 relative group">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                        <div className="md:col-span-1 flex items-center justify-center bg-white h-10 w-10 rounded-full border border-slate-200 text-slate-500 font-semibold text-sm">
                                            {index + 1}
                                        </div>
                                        
                                        <div className="md:col-span-4">
                                            <label className="text-xs font-medium text-slate-500 mb-1 block">สินค้า/บริการ</label>
                                            <SearchableSelect
                                                value={item.productId}
                                                onChange={(val) => handleProductSelect(item.id, val)}
                                                options={productOptions}
                                                placeholder="เลือกสินค้า..."
                                                disabled={isReadOnly || usePackagePricing}
                                            />
                                        </div>
                                        
                                        <div className="md:col-span-3">
                                            <label className="text-xs font-medium text-slate-500 mb-1 block">รายละเอียดเพิ่มเติม</label>
                                            <Input
                                                value={item.description}
                                                onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                                placeholder="รายละเอียด..."
                                                disabled={isReadOnly}
                                            />
                                        </div>

                                        <div className="md:col-span-2 grid grid-cols-2 gap-2">
                                                <div>
                                                <label className="text-xs font-medium text-slate-500 mb-1 block">จำนวน</label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                                                    disabled={isReadOnly}
                                                    className="text-center"
                                                />
                                                </div>
                                                <div>
                                                <label className="text-xs font-medium text-slate-500 mb-1 block">ราคา/หน่วย</label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={item.unitPrice}
                                                    onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                                                    disabled={isReadOnly}
                                                    className="text-right"
                                                />
                                                </div>
                                        </div>
                                        
                                        <div className="md:col-span-2 text-right">
                                            <label className="text-xs font-medium text-slate-500 mb-1 block">รวม</label>
                                            <div className="h-10 flex items-center justify-end px-3 font-semibold text-slate-900 bg-white rounded border border-slate-200">
                                                {item.amount.toLocaleString()}
                                            </div>
                                        </div>

                                        {!isReadOnly && items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeItem(item.id)}
                                                className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                title="ลบรายการ"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {!isReadOnly && !usePackagePricing && !selectedAssessmentId && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={addItem}
                                className="w-full border-dashed border-2 border-slate-300 text-slate-500 hover:text-green-600 hover:border-green-300 hover:bg-green-50"
                            >
                                <PlusIcon className="w-5 h-5 mr-2" /> เพิ่มรายการ
                            </Button>
                        )}
                    </div>

                    {/* Totals */}
                    <div className="mt-8 border-t border-slate-200 pt-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                            <div className="w-full md:w-1/2">
                                <label className="block text-sm font-medium text-slate-700 mb-2">หมายเหตุ</label>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    disabled={isReadOnly}
                                    placeholder="หมายเหตุเพิ่มเติม..."
                                />
                            </div>
                            
                            <div className="w-full md:w-1/3 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">รวมเป็นเงิน (Subtotal)</span>
                                    <span className="font-medium text-slate-900">{subtotal.toLocaleString()} บาท</span>
                                </div>
                                
                                <div className="flex justify-between items-center text-sm">
                                    <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                                        <input
                                            type="checkbox"
                                            checked={includeVat}
                                            onChange={(e) => setIncludeVat(e.target.checked)}
                                            disabled={isReadOnly}
                                            className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                                        />
                                        ภาษีมูลค่าเพิ่ม 7% (VAT)
                                    </label>
                                    <span className="font-medium text-slate-900">{vatAmount.toLocaleString()} บาท</span>
                                </div>
                                
                                <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                                    <span className="text-base font-bold text-slate-800">จำนวนเงินรวมทั้งสิ้น</span>
                                    <span className="text-xl font-bold text-green-600">{netTotal.toLocaleString()} บาท</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Installment Plan Preview - REMOVED */}
            </div>
        </form>
    );};
