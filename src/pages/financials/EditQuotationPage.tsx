import { useState, useEffect, useMemo } from 'react';
import type { FC, ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FormField,
  Input,
  Select,
  Button,
} from '../../components/common/FormControls';
import { Quotation, Status } from '../../types';
import { LeftArrowIcon } from '../../assets/icons/Icons';

interface EditQuotationPageProps {
  quotations: Quotation[];
  onUpdateQuotation: (quotation: Quotation) => void;
}

export const EditQuotationPage: FC<EditQuotationPageProps> = ({
  quotations,
  onUpdateQuotation,
}) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isReviseMode = searchParams.get('mode') === 'revise';

  const [formData, setFormData] = useState<Partial<Quotation>>({});
  const [quotation, setQuotation] = useState<Quotation | null>(null);

  useEffect(() => {
    const found = quotations.find((q) => q.id === id);
    if (found) {
      setQuotation(found);
      setFormData({
        ...found,
        status: isReviseMode ? Status.Revise : found.status,
        createdAt: found.createdAt
          ? new Date(found.createdAt).toISOString().substring(0, 10)
          : '',
        expiresAt: found.expiresAt
          ? new Date(found.expiresAt).toISOString().substring(0, 10)
          : '',
      });
    } else if (id) {
      // Handle not found if needed, or redirect
      alert('ไม่พบใบเสนอราคา');
      navigate('/quotations');
    }
  }, [id, quotations, navigate, isReviseMode]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (quotation) {
      const updatedData: Quotation = {
        ...quotation,
        ...formData,
        total: Number(formData.total) || quotation.total,
        status: isReviseMode
          ? Status.Revise
          : formData.status || quotation.status,
      };
      onUpdateQuotation(updatedData);
      navigate('/quotations');
    }
  };

  const revisionHistory = useMemo(() => {
    if (!quotation) return [];
    const baseId = quotation.id.split('-')[0];
    return quotations
      .filter((q) => q.id.startsWith(baseId))
      .sort((a, b) => b.revision - a.revision);
  }, [quotation, quotations]);

  if (!quotation) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/quotations')}>
          <LeftArrowIcon className="w-6 h-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isReviseMode
              ? `Revise ใบเสนอราคา: ${quotation.id}`
              : `แก้ไขสถานะ: ${quotation.id}`}
          </h1>
          {quotation.revision > 1 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
              Revise ครั้งที่ {quotation.revision - 1}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
            <form onSubmit={handleSave} className="space-y-6">
              <FormField label="ลูกค้า" htmlFor="customerName">
                <Input
                  id="customerName"
                  type="text"
                  value={formData.customerName || ''}
                  readOnly
                  className="bg-slate-100"
                />
              </FormField>

              {formData.assessmentId && (
                <FormField label="อ้างอิงใบประเมิน" htmlFor="assessmentId">
                  <Input
                    id="assessmentId"
                    type="text"
                    value={formData.assessmentId}
                    readOnly
                    className="bg-slate-100"
                  />
                </FormField>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="วันที่สร้าง" htmlFor="createdAt">
                  <Input
                    id="createdAt"
                    name="createdAt"
                    type="date"
                    value={formData.createdAt || ''}
                    onChange={handleChange}
                    required
                    readOnly={!isReviseMode}
                    className={!isReviseMode ? 'bg-slate-100' : ''}
                  />
                </FormField>
                <FormField label="หมดอายุวันที่" htmlFor="expiresAt">
                  <Input
                    id="expiresAt"
                    name="expiresAt"
                    type="date"
                    value={formData.expiresAt || ''}
                    onChange={handleChange}
                    required
                    readOnly={!isReviseMode}
                    className={!isReviseMode ? 'bg-slate-100' : ''}
                  />
                </FormField>
              </div>

              <FormField label="Link Google Map" htmlFor="googleMapLink">
                <Input
                  id="googleMapLink"
                  name="googleMapLink"
                  type="url"
                  value={formData.googleMapLink || ''}
                  onChange={handleChange}
                  placeholder="https://maps.app.goo.gl/..."
                  readOnly={!isReviseMode}
                  className={!isReviseMode ? 'bg-slate-100' : ''}
                />
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="สถานะ" htmlFor="status">
                  <Select
                    id="status"
                    name="status"
                    value={formData.status || ''}
                    onChange={handleChange}
                    disabled={isReviseMode}
                    className={
                      isReviseMode ? 'bg-slate-100 cursor-not-allowed' : ''
                    }
                  >
                    {/* Original/Current Status Option if it's not in the allowed list (to show current state) */}
                    {![
                      Status.UnderReview,
                      Status.PendingApproval,
                      Status.Approved,
                      Status.Closed,
                    ].includes(formData.status as Status) && (
                      <option value={formData.status}>{formData.status}</option>
                    )}

                    <option value={Status.UnderReview}>
                      {Status.UnderReview}
                    </option>
                    <option value={Status.PendingApproval}>
                      {Status.PendingApproval}
                    </option>
                    <option value={Status.Approved}>{Status.Approved}</option>
                    <option value={Status.Closed}>{Status.Closed}</option>
                  </Select>
                </FormField>
                <FormField label="ยอดรวม (บาท)" htmlFor="total">
                  <Input
                    id="total"
                    name="total"
                    type="number"
                    value={formData.total ?? ''}
                    onChange={handleChange}
                    required
                    step="0.01"
                    placeholder="0.00"
                    readOnly={!isReviseMode}
                    className={!isReviseMode ? 'bg-slate-100' : ''}
                  />
                </FormField>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  onClick={() => navigate('/quotations')}
                  className="py-2 px-6"
                  variant="outline"
                >
                  ยกเลิก
                </Button>
                <Button type="submit" className="py-2 px-6" variant="primary">
                  บันทึกการเปลี่ยนแปลง
                </Button>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              ประวัติการแก้ไข (Version History)
            </h3>
            <div className="flow-root">
              <ul role="list" className="-mb-8">
                {revisionHistory.map((item, itemIdx) => (
                  <li key={item.id}>
                    <div className="relative pb-8">
                      {itemIdx !== revisionHistory.length - 1 ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span
                            className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${item.id === quotation.id ? 'bg-primary' : 'bg-slate-400'}`}
                          >
                            <span className="text-white text-xs font-bold">
                              {item.revision}
                            </span>
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p
                              className={`text-sm ${item.id === quotation.id ? 'font-bold text-slate-900' : 'text-slate-500'}`}
                            >
                              {item.id}
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(item.createdAt).toLocaleDateString(
                                'th-TH'
                              )}
                            </p>
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-slate-500">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800`}
                            >
                              {item.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
