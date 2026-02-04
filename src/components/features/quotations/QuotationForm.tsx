import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../common/Card';
import {
    FormField,
    Input,
    Select,
    Button,
    Textarea,
} from '../../common/FormControls';
import { SearchableSelect } from '../../common/SearchableSelect';
import { PlusIcon, TrashIcon } from '../../../assets/icons/Icons';
import { useData } from '../../../contexts/DataContext';
import { Status } from '../../../types/entity/core.interface';
import { Assessment } from '../../../types/entity/assessment.interface';
import { Quotation } from '../../../types/entity/financial.interface';

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
    mode: 'create' | 'edit' | 'revise';
    initialValues?: Partial<Quotation>;
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
    assessmentId?: string | null;
}

export const QuotationForm: React.FC<QuotationFormProps> = ({
    mode,
    initialValues,
    onSubmit,
    onCancel,
    assessmentId,
}) => {
    const { customers, products, assessments } = useData();

    // Assessment reference
    const [selectedAssessmentId, setSelectedAssessmentId] = useState(
        assessmentId || initialValues?.assessment_id || ''
    );

    // Quotation info
    const [quotationDate, setQuotationDate] = useState(
        initialValues?.created_at ? new Date(initialValues.created_at).toISOString().substring(0, 10) : ''
    );
    const [validityDays, setValidityDays] = useState(30); // Default, logic to calc from existing expiry needed if edit
    const [expiresAt, setExpiresAt] = useState(
        initialValues?.expires_at ? new Date(initialValues.expires_at).toISOString().substring(0, 10) : ''
    );

    // Customer info
    const [selectedCustomerId, setSelectedCustomerId] = useState(initialValues?.customer_id || '');

    // Service info
    const [serviceLocation, setServiceLocation] = useState(initialValues?.service_location || '');
    const [serviceArea, setServiceArea] = useState(initialValues?.service_area || '');
    const [systemUsed, setSystemUsed] = useState(initialValues?.system_used || '');
    const [serviceType, setServiceType] = useState(initialValues?.service_type || '');
    const [paymentTerms, setPaymentTerms] = useState(
        initialValues?.payment_terms || 'ชำระเมื่อเข้าปฏิบัติงานครั้งแรกเสร็จเรียบร้อย'
    );
    const [notes, setNotes] = useState(initialValues?.notes || '');
    const [contractDuration, setContractDuration] = useState(initialValues?.contract_duration || '1 ปี');
    const [serviceCount, setServiceCount] = useState(initialValues?.service_count || '7 ครั้ง');

    // Line items
    const [items, setItems] = useState<QuotationItem[]>(
        initialValues?.items
            ?.filter((item: any) => !(item.unit === 'พื้นที่' && !item.product_id)) // Filter legacy artifacts from bug
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

    // VAT settings
    const [includeVat, setIncludeVat] = useState(initialValues?.include_vat ?? true);
    const vatRate = 0.07;

    // Product options for dropdown
    const productOptions = useMemo(() => {
        return products.map((p) => ({
            value: p.id,
            label: `${p.code} - ${p.name}`,
            description: p.unit?.name || '',
        }));
    }, [products]);

    // Assessment options for dropdown
    const assessmentOptions = useMemo(() => {
        return (assessments || []).map((a) => {
            const customerName = a.customer
                ? `${a.customer.first_name || ''} ${a.customer.last_name || ''}`.trim()
                : 'ไม่ระบุลูกค้า';
            return {
                value: a.id,
                label: `${a.code || 'No Code'} - ${customerName} [${a.status}]`,
                description: a.address || '',
            };
        });
    }, [assessments]);

    // Selected assessment details
    const selectedAssessment = useMemo(() => {
        return assessments?.find((a) => a.id === selectedAssessmentId);
    }, [assessments, selectedAssessmentId]);

    // Selected customer details
    const selectedCustomer = useMemo(() => {
        return customers.find((c) => c.id === selectedCustomerId);
    }, [customers, selectedCustomerId]);



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

            // Check for Package
            if (selectedAssessment.package) {
                setUsePackagePricing(true);
                setPackageName(selectedAssessment.package.name);
                // Use assessment total price as the package price (Base price)
                setPackagePrice(Number(selectedAssessment.total_price) || 0);

                // If using package pricing, we DON'T populate items from areas, 
                // we leave items empty for "Additional" products
                if (mode === 'create') {
                    setItems([]);
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
    }, [selectedAssessment, mode]);

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
        if (selectedCustomer && (!serviceLocation || mode === 'create')) {
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

    const handlePackagePricingToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
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


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCustomerId || !selectedCustomer) {
            alert('กรุณาเลือกลูกค้า');
            return;
        }

        // Validation: If no items AND no package, alert
        const hasValidItems = items.some((item) => item.description && item.amount > 0);
        if (!hasValidItems && (!usePackagePricing || packagePrice <= 0)) {
            alert('กรุณาเพิ่มรายการสินค้าหรือเลือกแพ็กเกจ');
            return;
        }

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
            service_area: serviceArea,
            system_used: systemUsed,
            service_type: serviceType,
            notes: notes,
            contract_duration: contractDuration,
            service_count: serviceCount,
            subtotal: subtotal,
            vat_amount: vatAmount,
            include_vat: includeVat,
            items: finalItems,
        };

        await onSubmit(quotationData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 pb-12">
            {/* Header / Meta Info */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-6 border-b pb-4">
                    ข้อมูลทั่วไป (General Information)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField label="วันที่ทำรายการ" htmlFor="quotation-date">
                        <Input
                            id="quotation-date"
                            type="date"
                            value={quotationDate}
                            onChange={(e) => setQuotationDate(e.target.value)}
                            required
                            className="bg-slate-50"
                        />
                    </FormField>
                    <FormField label="ยืนราคา (วัน)" htmlFor="validity-days">
                        <Input
                            id="validity-days"
                            type="number"
                            value={validityDays}
                            onChange={(e) => setValidityDays(Number(e.target.value))}
                            min={1}
                            required
                            className="bg-slate-50"
                        />
                    </FormField>
                    <FormField label="วันหมดอายุ" htmlFor="expires-at">
                        <Input
                            id="expires-at"
                            type="date"
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                            required
                            className="bg-slate-50"
                        />
                    </FormField>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100">
                    <FormField label="อ้างอิงใบประเมิน (Optional)" htmlFor="assessment-select">
                        <SearchableSelect
                            value={selectedAssessmentId}
                            onChange={(value) => setSelectedAssessmentId(value)}
                            placeholder="-- เลือกใบประเมินที่ต้องการอ้างอิง --"
                            options={assessmentOptions}
                        />
                    </FormField>
                    {selectedAssessment && (
                        <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-800">ข้อมูลจากใบประเมิน (Assessment Details)</h4>
                                        <p className="text-xs text-slate-500">{selectedAssessment.code}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-slate-500 block">ยอดรวมใบประเมิน</span>
                                    <span className="text-sm font-bold text-slate-700">
                                        ฿{Number(selectedAssessment.total_price || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-500 block mb-1">ลูกค้า:</span>
                                    <span className="font-medium text-slate-700">
                                        {selectedAssessment.customer?.first_name} {selectedAssessment.customer?.last_name}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block mb-1">สถานที่:</span>
                                    <span className="font-medium text-slate-700 clamp-1">
                                        {selectedAssessment.address}
                                    </span>
                                </div>
                            </div>

                            {/* Integrated Package Fields */}
                            {(selectedAssessment.package || usePackagePricing) && (
                                <div className="bg-white border border-slate-200 rounded-lg p-4 mt-2">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        <h5 className="text-sm font-bold text-slate-800">รายละเอียดแพ็กเกจ (Package)</h5>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">ชื่อแพ็กเกจ</label>
                                            <Input
                                                value={packageName}
                                                onChange={(e) => setPackageName(e.target.value)}
                                                className="bg-slate-50 border-slate-200 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">ราคาแพ็กเกจ</label>
                                            <Input
                                                type="number"
                                                value={packagePrice}
                                                onChange={(e) => setPackagePrice(Number(e.target.value))}
                                                className="bg-slate-50 border-slate-200 text-sm font-medium text-right"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Client & Service Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Customer Info */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-2 h-6 bg-primary rounded-full"></span>
                            ข้อมูลลูกค้า (Customer)
                        </h3>

                        <div className="space-y-4">
                            <FormField label="ลูกค้า" htmlFor="customer-select">
                                <SearchableSelect
                                    value={selectedCustomerId}
                                    onChange={setSelectedCustomerId}
                                    placeholder="ค้นหาและเลือกลูกค้า..."
                                    required
                                    options={customers.map((c) => ({
                                        value: c.id,
                                        label: `${c.code} - ${c.first_name} ${c.last_name}`,
                                        description: c.phone || '',
                                    }))}
                                />
                            </FormField>

                            <FormField label="เบอร์ติดต่อ" htmlFor="customer-phone">
                                <Input
                                    id="customer-phone"
                                    type="text"
                                    value={selectedCustomer?.phone || ''}
                                    disabled
                                    className="bg-slate-50 text-slate-500"
                                />
                            </FormField>

                            {selectedCustomer && (
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">ประเภท:</span>
                                        <span className="font-medium text-slate-700">{selectedCustomer.type}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Tax ID:</span>
                                        <span className="font-medium text-slate-700">{selectedCustomer.tax_id || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block mb-1">ที่อยู่ตาม ภ.พ.20:</span>
                                        <span className="font-medium text-slate-700">
                                            {[
                                                selectedCustomer.address_house_no,
                                                selectedCustomer.road_line,
                                                selectedCustomer.sub_district,
                                                selectedCustomer.district,
                                                selectedCustomer.province,
                                                selectedCustomer.postal_code
                                            ].filter(Boolean).join(' ')}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Service Location & Terms */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-2 h-6 bg-orange-500 rounded-full"></span>
                            รายละเอียกงานบริการ (Service Details)
                        </h3>

                        <div className="space-y-4">
                            <FormField label="สถานที่ให้บริการ" htmlFor="service-location">
                                <Textarea
                                    id="service-location"
                                    value={serviceLocation}
                                    onChange={(e) => setServiceLocation(e.target.value)}
                                    rows={3}
                                    placeholder="ระบุสถานที่ให้บริการ..."
                                    className="bg-slate-50"
                                />
                            </FormField>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="ประเภทบริการ" htmlFor="service-type">
                                    <Select
                                        id="service-type"
                                        value={serviceType}
                                        onChange={(e) => setServiceType(e.target.value)}
                                    >
                                        <option value="">-- ระบุ --</option>
                                        <option value="ควบคุมป้องกันกำจัดปลวก">กำจัดปลวก</option>
                                        <option value="ควบคุมป้องกันกำจัดมด">กำจัดมด</option>
                                        <option value="ควบคุมป้องกันกำจัดแมลงสาบ">กำจัดแมลงสาบ</option>
                                        <option value="ควบคุมป้องกันกำจัดหนู">กำจัดหนู</option>
                                        <option value="ควบคุมป้องกันกำจัดปลวก มด แมลงสาบ หนู">รวม (ปลวก/มด/แมลงสาบ/หนู)</option>
                                    </Select>
                                </FormField>
                                <FormField label="ระบบที่ใช้" htmlFor="system-used">
                                    <Select
                                        id="system-used"
                                        value={systemUsed}
                                        onChange={(e) => setSystemUsed(e.target.value)}
                                    >
                                        <option value="">-- ระบุ --</option>
                                        <option value="ระบบเหยื่อ">ระบบเหยื่อ</option>
                                        <option value="ระบบสารเคมีกึ่งชีวภาพ">ระบบสารเคมี</option>
                                        <option value="ระบบฉีดพ่น">ระบบฉีดพ่น</option>
                                    </Select>
                                </FormField>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="สัญญา" htmlFor="contract-duration">
                                    <Select
                                        id="contract-duration"
                                        value={contractDuration}
                                        onChange={(e) => setContractDuration(e.target.value)}
                                    >
                                        <option value="1 ปี">1 ปี</option>
                                        <option value="6 เดือน">6 เดือน</option>
                                        <option value="ครั้งเดียว">ครั้งเดียว</option>
                                    </Select>
                                </FormField>
                                <FormField label="เข้าบริการ" htmlFor="service-count">
                                    <Select
                                        id="service-count"
                                        value={serviceCount}
                                        onChange={(e) => setServiceCount(e.target.value)}
                                    >
                                        <option value="1 ครั้ง">1 ครั้ง</option>
                                        <option value="3 ครั้ง">3 ครั้ง</option>
                                        <option value="5 ครั้ง">5 ครั้ง</option>
                                        <option value="7 ครั้ง">7 ครั้ง</option>
                                        <option value="12 ครั้ง">12 ครั้ง</option>
                                    </Select>
                                </FormField>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Products/Services List */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">
                        รายการสินค้า/บริการอื่นๆ (Additional Items)
                    </h3>
                </div>

                {items.length > 0 && (
                    <div className="overflow-hidden rounded-lg border border-slate-300 mb-6">
                        <table className="min-w-full divide-y divide-slate-300">
                            <thead className="bg-slate-100">
                                <tr>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase w-12 border-r border-slate-300">#</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase border-r border-slate-300">รายการ (Description)</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase w-24 border-r border-slate-300">จำนวน</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase w-24 border-r border-slate-300">หน่วย</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase w-32 border-r border-slate-300">ราคา/หน่วย</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase w-40">รวม (Total)</th>
                                    <th className="px-2 py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {items.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-2 text-center text-sm text-slate-500 font-medium border-r border-slate-200 bg-slate-50/50">
                                            {index + 1}
                                        </td>
                                        <td className="px-4 py-2 border-r border-slate-200">
                                            <SearchableSelect
                                                value={item.productId}
                                                onChange={(value) => handleProductSelect(item.id, value)}
                                                placeholder="-- เลือกสินค้า --"
                                                options={productOptions}
                                            />
                                            {item.productId && (
                                                <div className="mt-1 text-xs text-slate-500 pl-1 font-mono">
                                                    {item.description}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 border-r border-slate-200">
                                            <div className="flex justify-center">
                                                <Input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                                                    min={1}
                                                    className="text-center w-20 h-9 font-mono text-slate-700"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-center text-sm text-slate-600 border-r border-slate-200">
                                            <span className="inline-block px-2 py-1 bg-slate-100 rounded text-xs">
                                                {item.unit || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 border-r border-slate-200">
                                            <Input
                                                type="number"
                                                value={item.unitPrice}
                                                onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                                                min={0}
                                                className="text-right h-9 font-mono text-slate-700"
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm font-bold text-slate-800 font-mono bg-slate-50/30">
                                            {item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            {items.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(item.id)}
                                                    className="text-slate-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded"
                                                    title="ลบรายการ"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex justify-start">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={addItem}
                        className="w-auto border-dashed border-2 border-slate-300 text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 py-2 px-6 flex items-center gap-2 transition-all font-medium"
                    >
                        <PlusIcon className="w-5 h-5" />
                        เพิ่มรายการสินค้า (Add Item)
                    </Button>
                </div>
            </div>


            {/* Terms & Totals Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-6 border-t border-slate-200">
                <div className="lg:col-span-7 space-y-6">
                    <FormField label="เงื่อนไขการชำระเงิน (Payment Terms)" htmlFor="payment-terms">
                        <Textarea
                            id="payment-terms"
                            value={paymentTerms}
                            onChange={(e) => setPaymentTerms(e.target.value)}
                            rows={3}
                            placeholder="ระบุเงื่อนไขการชำระเงิน..."
                            className="font-sans"
                        />
                    </FormField>
                    <FormField label="หมายเหตุ (Notes)" htmlFor="notes">
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            placeholder="ข้อความเพิ่มเติมถึงลูกค้า..."
                            className="font-sans"
                        />
                    </FormField>
                </div>

                {/* Grand Total Section */}
                <div className="lg:col-span-5">
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-300">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-slate-600">
                                <span className="text-sm font-medium">รวมเป็นเงิน (Subtotal)</span>
                                <span className="text-lg font-bold font-mono text-slate-800">
                                    {subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>

                            <div className="flex justify-between items-center py-3 border-b border-slate-300">
                                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none hover:text-slate-800">
                                    <input
                                        type="checkbox"
                                        checked={includeVat}
                                        onChange={(e) => setIncludeVat(e.target.checked)}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                    />
                                    ภาษีมูลค่าเพิ่ม 7% (VAT)
                                </label>
                                <span className={`text-base font-medium font-mono ${includeVat ? 'text-slate-800' : 'text-slate-400'}`}>
                                    {vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>

                            <div className="flex justify-between items-end pt-2">
                                <span className="text-lg font-bold text-slate-900">ยอดเงินสุทธิ (Net Total)</span>
                                <span className="text-3xl font-bold text-blue-700 font-mono tracking-tight">
                                    {netTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="text-right text-xs text-slate-500 pt-1">
                                (ราคารวมภาษีมูลค่าเพิ่มแล้ว)
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-end gap-4 pt-8 pb-4 border-t border-slate-200 mt-10">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    className="px-6 h-11 text-base font-medium text-slate-700 hover:bg-slate-50 border-slate-300 min-w-[120px]"
                >
                    ยกเลิก (Cancel)
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    className="px-8 h-11 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow transition-all min-w-[200px]"
                >
                    {mode === 'create' ? 'ยืนยันสร้างใบเสนอราคา (Create Quotation)' : 'บันทึกการแก้ไข (Save Changes)'}
                </Button>
            </div>
        </form>
    );
};
