import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Textarea, Input, Select } from '../../common/FormControls';
import { FieldJob, ServiceReport } from '@/src/types/entity/field-job.interface';
import { Status, User, UserRole } from '@/src/types/entity/core.interface';
import { Quotation, Contract } from '@/src/types/entity/financial.interface';
import { Product } from '@/src/types/entity/product.interface';
import { JobStatus } from '@/src/types/enums/job.enum';
import { formatThaiDate } from '../../../constants';
import { StatusBadge } from '../../common/StatusBadge';

interface ServiceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: FieldJob | null;
  onSubmit: (
    jobId: string,
    reportData: ServiceReport,
    finalStatus: JobStatus,
    quotationId?: string
  ) => void;
  finalStatus: JobStatus;
  quotations: Quotation[];
  currentUser: User;
  contracts: Contract[];
  products: Product[];
  jobs: FieldJob[];
}

const ALL_SERVICE_TYPES = [
  'กำจัดปลวก',
  'กำจัดมด',
  'กำจัดแมลงสาบ',
  'กำจัดหนู',
  'กำจัดยุง',
  'กำจัดอื่นๆ',
];
const ALL_SERVICE_ACTIONS = [
  'วางกล่อง',
  'เติมเหยื่อ',
  'อัดน้ำยา',
  'ตรวจเช็ค',
  'ฝังสถานี',
  'ต่อสัญญา',
];

type PestType = 'termite' | 'ant' | 'cockroach' | 'rat' | 'lizard';

export const ServiceReportModal: React.FC<ServiceReportModalProps> = ({
  isOpen,
  onClose,
  job,
  onSubmit,
  finalStatus,
  quotations,
  currentUser,
  contracts,
  products,
  jobs,
}) => {
  const [reportState, setReportState] = useState<Partial<ServiceReport>>({});
  const [selectedQuotationId, setSelectedQuotationId] = useState('');

  const availableQuotations = useMemo(() => {
    if (!job) return [];
    return quotations.filter(
      (q) =>
        q.customer_id === job.customer_id &&
        (q.status === Status.Draft ||
          q.status === Status.Sent ||
          q.id === job.quotation_id)
    );
  }, [quotations, job]);

  const packageMapByName = useMemo(
    () =>
      new Map(
        products.filter((p) => p.type === 'บริการ').map((p) => [p.name, p])
      ),
    [products]
  );
  
  const recommendedNextIso = useMemo(() => {
    if (!job || !job.contract_id) return undefined;
    const c = contracts.find((ct) => ct.id === job.contract_id);
    if (!c) return undefined;
    const pkg = packageMapByName.get(c.service_package);
    const visitsRequired = pkg?.number_of_visits ?? 0;
    if (!visitsRequired) return undefined;
    const parseDurationMonths = (text?: string) => {
      if (!text) return 12;
      const num = parseInt(text.replace(/[^\d]/g, ''), 10) || 12;
      return text.includes('ปี') ? num * 12 : num;
    };
    const durationMonths = parseDurationMonths(pkg?.contract_duration);
    const intervalDays = Math.max(
      1,
      Math.round((durationMonths * 30) / visitsRequired)
    );
    const todayTs = Date.now();
    const completedVisits = jobs.filter(
      (j) => j.contract_id === c.id && j.status === JobStatus.Completed
    ).length;
    const nextScheduled = jobs
      .filter(
        (j) =>
          j.contract_id === c.id &&
          [JobStatus.InProgress, JobStatus.Planned, JobStatus.Scheduled].includes(
            j.status
          )
      )
      .sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
      .find((j) => new Date(j.start_time).getTime() >= todayTs);
    let nextDueTs: number | null = null;
    if (nextScheduled) {
      nextDueTs = new Date(nextScheduled.start_time).getTime();
    } else {
      const startTs = new Date(c.start_date).getTime();
      const nextIndex = Math.min(completedVisits, visitsRequired - 1);
      nextDueTs =
        startTs +
        (nextIndex + (completedVisits >= visitsRequired ? 0 : 1)) *
          intervalDays *
          24 *
          60 *
          60 *
          1000;
      const endTs = new Date(c.end_date).getTime();
      if (nextDueTs > endTs) nextDueTs = null;
    }
    return nextDueTs ? new Date(nextDueTs).toISOString() : undefined;
  }, [job, contracts, products, jobs, packageMapByName]);

  useEffect(() => {
    if (isOpen && job) {
      // If the job already has a draft report, load it. Otherwise, create a new one.
      const initialReport = job.service_report
        ? { ...job.service_report }
        : {
            created_at: new Date().toISOString().substring(0, 10),
            check_in_time: job.actual_start_time
              ? new Date(job.actual_start_time).toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '',
            check_out_time: new Date().toLocaleTimeString('th-TH', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            service_types: [],
            service_actions: [],
            termite: { status: 'absent' },
            ant: { apply_gel: false },
            cockroach: { apply_gel: false },
            rat: {
              glue_traps: false,
              mechanical_traps: false,
              bait_stations: false,
              refill_bait: false,
            },
            lizard: { place_traps: false },
            next_appointment: {
              notes: '',
              reasons: [],
              scheduled_at: recommendedNextIso,
            },
            status: JobStatus.Draft,
          };
      setReportState(initialReport);
      setSelectedQuotationId(job.quotation_id || '');
    }
  }, [isOpen, job, recommendedNextIso]);

  if (!isOpen || !job) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let nextStatus = reportState.status || JobStatus.Draft;
    // If a non-admin user saves a draft, it moves to PendingApproval
    if (currentUser.role !== UserRole.Admin && nextStatus === JobStatus.Draft) {
      nextStatus = JobStatus.PendingApproval;
    }

    const finalReportData = {
      ...reportState,
      status: nextStatus,
    } as ServiceReport;
    onSubmit(job.id, finalReportData, finalStatus, selectedQuotationId);
  };

  const handleApprove = () => {
    const finalReportData = {
      ...reportState,
      status: JobStatus.Completed, // Or Approved? Assuming Completed or InProgress depending on workflow. 
      // Wait, ServiceReport status is JobStatus. 
      // If approved, usually job status becomes Completed or similar.
      // But here we are setting REPORT status. 
      // Let's assume 'Approved' maps to something, but JobStatus doesn't have 'Approved'. 
      // It has 'Completed'. 
      // If the report is approved, maybe the job is completed.
    } as ServiceReport;
    // Actually the previous code used Status.Approved. 
    // If JobStatus doesn't have Approved, we should use Completed.
    // Let's use Completed.
    finalReportData.status = JobStatus.Completed;
    
    onSubmit(job.id, finalReportData, finalStatus, selectedQuotationId);
  };

  const handleMultiSelect = (
    field: 'service_types' | 'service_actions' | 'next_appointment_reasons',
    value: string
  ) => {
    setReportState((prev) => {
      const currentValues =
        field === 'next_appointment_reasons'
          ? prev.next_appointment?.reasons || []
          : prev[field] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];

      if (field === 'next_appointment_reasons') {
        return {
          ...prev,
          next_appointment: {
            ...(prev.next_appointment || { notes: '', reasons: [] }),
            reasons: newValues,
          },
        };
      }
      return { ...prev, [field]: newValues };
    });
  };

  const handlePestDataChange = (
    pest: 'ant' | 'cockroach' | 'rat' | 'lizard' | 'termite',
    key: string,
    value: any
  ) => {
    setReportState((prev) => ({
      ...prev,
      [pest]: { ...(prev[pest] || {}), [key]: value },
    }));
  };

  const handleTermiteActionChange = (
    action: string,
    field: 'enabled' | 'count' | 'area',
    value: any
  ) => {
    setReportState((prev) => {
      const objectActions = [
        'installStations',
        'placeBoxes',
        'addBait',
        'foundTermites',
        'injectPipes',
      ];
      const prevTermite = prev.termite || { status: 'absent' };
      const prevActions = prevTermite.actions || {};
      const prevActionValue = prevActions[action as keyof typeof prevActions];

      let newActionValue;
      if (objectActions.includes(action)) {
        newActionValue = {
          ...(typeof prevActionValue === 'object' && prevActionValue !== null
            ? prevActionValue
            : {}),
          [field]: value,
        };
      } else {
        if (field === 'enabled') {
          newActionValue = value;
        } else {
          newActionValue = prevActionValue;
        }
      }

      return {
        ...prev,
        termite: {
          ...prevTermite,
          actions: {
            ...prevActions,
            [action]: newActionValue,
          },
        },
      };
    });
  };

  const handleTermiteOtherChange = (value: string) => {
    setReportState((prev) => {
      const prevTermite = prev.termite || { status: 'absent' };
      const prevActions = prevTermite.actions || {};

      return {
        ...prev,
        termite: {
          ...prevTermite,
          actions: {
            ...prevActions,
            other: value,
          },
        },
      };
    });
  };

  const handleDateCalculation = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const days = parseInt(e.target.value, 10);
    if (!isNaN(days) && job) {
      const currentDate = new Date(job.start_time);
      currentDate.setDate(currentDate.getDate() + days);

      const thaiDate = currentDate.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const newNote = `ประมาณวันที่ ${thaiDate} (${days} วัน)`;

      setReportState((prev) => ({
        ...prev,
        next_appointment: {
          ...(prev.next_appointment || { notes: '', reasons: [] }),
          notes: newNote,
        },
      }));
    } else {
      setReportState((prev) => ({
        ...prev,
        next_appointment: {
          ...(prev.next_appointment || { notes: '', reasons: [] }),
          notes: '',
        },
      }));
    }
    e.target.value = '';
  };

  const title =
    finalStatus === JobStatus.Cancelled
      ? 'บันทึกเหตุผลการยกเลิก'
      : `บันทึกรายงานบริการ: ${job.id}`;

  const isAdmin = currentUser.role === UserRole.Admin;
  const isPending = reportState.status === JobStatus.PendingApproval;
  const isDraft = reportState.status === JobStatus.Draft;

  const submitButtonText = isDraft ? 'ส่งเพื่ออนุมัติ' : 'บันทึกการเปลี่ยนแปลง';

  const renderTermiteForm = (): React.ReactElement => (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-2">
        <label className="flex items-center gap-2 text-slate-800">
          <input
            type="radio"
            name="termiteStatus"
            value="present"
            checked={reportState.termite?.status === 'present'}
            onChange={() =>
              handlePestDataChange('termite', 'status', 'present')
            }
          />{' '}
          มี
        </label>
        <label className="flex items-center gap-2 text-slate-800">
          <input
            type="radio"
            name="termiteStatus"
            value="reduced"
            checked={reportState.termite?.status === 'reduced'}
            onChange={() =>
              handlePestDataChange('termite', 'status', 'reduced')
            }
          />{' '}
          มี แต่ปริมาณลดลง
        </label>
        <label className="flex items-center gap-2 text-slate-800">
          <input
            type="radio"
            name="termiteStatus"
            value="absent"
            checked={reportState.termite?.status === 'absent'}
            onChange={() => handlePestDataChange('termite', 'status', 'absent')}
          />{' '}
          ไม่มี
        </label>
      </div>
      {reportState.termite?.status !== 'absent' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 p-3 bg-slate-50 rounded">
          <label className="flex items-center gap-2 text-slate-800">
            <input
              type="checkbox"
              checked={!!reportState.termite?.actions?.installStations?.enabled}
              onChange={(e) =>
                handleTermiteActionChange(
                  'installStations',
                  'enabled',
                  e.target.checked
                )
              }
            />
            ฝังสถานี
            <div className="flex items-center gap-2">
              <Select
                className="w-24 h-9 !py-0"
                value={
                  reportState.termite?.actions?.installStations?.count || ''
                }
                onChange={(e) =>
                  handleTermiteActionChange(
                    'installStations',
                    'count',
                    e.target.value ? parseInt(e.target.value, 10) : undefined
                  )
                }
              >
                <option value="">จำนวน</option>
                {Array.from({ length: 50 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </Select>
              <span className="text-slate-700">จุด</span>
            </div>
          </label>
          <label className="flex items-center gap-2 text-slate-800">
            <input
              type="checkbox"
              checked={!!reportState.termite?.actions?.changeWood}
              onChange={(e) =>
                handleTermiteActionChange(
                  'changeWood',
                  'enabled',
                  e.target.checked
                )
              }
            />
            เปลี่ยนไม้สถานี
          </label>
          <label className="flex items-center gap-2 text-slate-800">
            <input
              type="checkbox"
              checked={!!reportState.termite?.actions?.changeLid}
              onChange={(e) =>
                handleTermiteActionChange(
                  'changeLid',
                  'enabled',
                  e.target.checked
                )
              }
            />
            เปลี่ยนฝาสถานี
          </label>
          <label className="flex items-center gap-2 text-slate-800">
            <input
              type="checkbox"
              checked={!!reportState.termite?.actions?.addFocusBait}
              onChange={(e) =>
                handleTermiteActionChange(
                  'addFocusBait',
                  'enabled',
                  e.target.checked
                )
              }
            />
            เติมสาร focus ล่อปลวก
          </label>

          <div className="md:col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-slate-800 flex-shrink-0">
              <input
                type="checkbox"
                checked={!!reportState.termite?.actions?.placeBoxes?.enabled}
                onChange={(e) =>
                  handleTermiteActionChange(
                    'placeBoxes',
                    'enabled',
                    e.target.checked
                  )
                }
              />
              <span>วางกล่อง</span>
            </label>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <Select
                  className="w-24 h-9 !py-0"
                  value={reportState.termite?.actions?.placeBoxes?.count || ''}
                  onChange={(e) =>
                    handleTermiteActionChange(
                      'placeBoxes',
                      'count',
                      e.target.value ? parseInt(e.target.value, 10) : undefined
                    )
                  }
                >
                  <option value="">จำนวน</option>
                  {Array.from({ length: 50 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </Select>
                <span className="text-slate-700">กล่อง</span>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="termite-area" className="text-slate-800">
                  บริเวณ
                </label>
                <Input
                  id="termite-area"
                  type="text"
                  className="h-9 w-48"
                  value={reportState.termite?.actions?.placeBoxes?.area || ''}
                  placeholder="เช่น ใต้ซิงค์, ห้องเก็บของ"
                  onChange={(e) =>
                    handleTermiteActionChange(
                      'placeBoxes',
                      'area',
                      e.target.value
                    )
                  }
                />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-slate-800">
            <input
              type="checkbox"
              checked={!!reportState.termite?.actions?.addBait?.enabled}
              onChange={(e) =>
                handleTermiteActionChange(
                  'addBait',
                  'enabled',
                  e.target.checked
                )
              }
            />
            เติมเหยื่อ
            <div className="flex items-center gap-2">
              <Select
                className="w-24 h-9 !py-0"
                value={reportState.termite?.actions?.addBait?.count || ''}
                onChange={(e) =>
                  handleTermiteActionChange(
                    'addBait',
                    'count',
                    e.target.value ? parseInt(e.target.value, 10) : undefined
                  )
                }
              >
                <option value="">จำนวน</option>
                {Array.from({ length: 50 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </Select>
              <span className="text-slate-700">กล่อง</span>
            </div>
          </label>
          <label className="flex items-center gap-2 text-slate-800">
            <input
              type="checkbox"
              checked={!!reportState.termite?.actions?.foundTermites?.enabled}
              onChange={(e) =>
                handleTermiteActionChange(
                  'foundTermites',
                  'enabled',
                  e.target.checked
                )
              }
            />
            พบปลวกกินเหยื่อ
            <div className="flex items-center gap-2">
              <Select
                className="w-24 h-9 !py-0"
                value={reportState.termite?.actions?.foundTermites?.count || ''}
                onChange={(e) =>
                  handleTermiteActionChange(
                    'foundTermites',
                    'count',
                    e.target.value ? parseInt(e.target.value, 10) : undefined
                  )
                }
              >
                <option value="">จำนวน</option>
                {Array.from({ length: 50 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </Select>
              <span className="text-slate-700">กล่อง</span>
            </div>
          </label>
          <label className="flex items-center gap-2 text-slate-800">
            <input
              type="checkbox"
              checked={!!reportState.termite?.actions?.injectSoil}
              onChange={(e) =>
                handleTermiteActionChange(
                  'injectSoil',
                  'enabled',
                  e.target.checked
                )
              }
            />
            อัดน้ำยารอบบ้าน
          </label>
          <label className="flex items-center gap-2 text-slate-800">
            <input
              type="checkbox"
              checked={!!reportState.termite?.actions?.injectPipes?.enabled}
              onChange={(e) =>
                handleTermiteActionChange(
                  'injectPipes',
                  'enabled',
                  e.target.checked
                )
              }
            />
            อัดน้ำยาเข้าท่อปลวก
            <div className="flex items-center gap-2">
              <Select
                className="w-24 h-9 !py-0"
                value={reportState.termite?.actions?.injectPipes?.count || ''}
                onChange={(e) =>
                  handleTermiteActionChange(
                    'injectPipes',
                    'count',
                    e.target.value ? parseInt(e.target.value, 10) : undefined
                  )
                }
              >
                <option value="">จำนวน</option>
                {Array.from({ length: 50 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </Select>
              <span className="text-slate-700">จุด</span>
            </div>
          </label>
          <label className="flex items-center gap-2 text-slate-800">
            <input
              type="checkbox"
              checked={!!reportState.termite?.actions?.injectShaft}
              onChange={(e) =>
                handleTermiteActionChange(
                  'injectShaft',
                  'enabled',
                  e.target.checked
                )
              }
            />
            อัดน้ำยาเข้าช่องชาร์ป
          </label>
          <label className="flex items-center gap-2 text-slate-800">
            <input
              type="checkbox"
              checked={!!reportState.termite?.actions?.sprayGarden}
              onChange={(e) =>
                handleTermiteActionChange(
                  'sprayGarden',
                  'enabled',
                  e.target.checked
                )
              }
            />
            สเปรย์น้ำยาภายในสวน
          </label>
          <label className="flex items-center gap-2 text-slate-800">
            <input
              type="checkbox"
              checked={!!reportState.termite?.actions?.sprayBio}
              onChange={(e) =>
                handleTermiteActionChange(
                  'sprayBio',
                  'enabled',
                  e.target.checked
                )
              }
            />
            สเปรย์น้ำยาชีวภาพ
          </label>
          <label className="flex items-center gap-2 text-slate-800">
            <input
              type="checkbox"
              checked={!!reportState.termite?.actions?.aroundBuilding}
              onChange={(e) =>
                handleTermiteActionChange(
                  'aroundBuilding',
                  'enabled',
                  e.target.checked
                )
              }
            />
            รอบอาคาร
          </label>
          <label className="flex items-center gap-2 text-slate-800">
            <input
              type="checkbox"
              checked={!!reportState.termite?.actions?.inShaft}
              onChange={(e) =>
                handleTermiteActionChange(
                  'inShaft',
                  'enabled',
                  e.target.checked
                )
              }
            />
            ช่องชาร์ป
          </label>
          <label className="flex items-center gap-2 text-slate-800">
            <input
              type="checkbox"
              checked={!!reportState.termite?.actions?.insideBuilding}
              onChange={(e) =>
                handleTermiteActionChange(
                  'insideBuilding',
                  'enabled',
                  e.target.checked
                )
              }
            />
            ภายในอาคาร
          </label>
          <div className="md:col-span-2">
            <Input
              type="text"
              placeholder="อื่นๆ..."
              value={reportState.termite?.actions?.other || ''}
              onChange={(e) => handleTermiteOtherChange(e.target.value)}
              className="h-9"
            />
          </div>
        </div>
      )}
    </div>
  );
  const renderAntForm = (): React.ReactElement => (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-slate-800">
        <input
          type="checkbox"
          checked={reportState.ant?.apply_gel ?? false}
          onChange={(e) =>
            handlePestDataChange('ant', 'apply_gel', e.target.checked)
          }
        />
        หยอดเหยื่อ
      </label>
      <Input
        type="text"
        placeholder="อื่นๆ..."
        value={reportState.ant?.other || ''}
        onChange={(e) => handlePestDataChange('ant', 'other', e.target.value)}
        className="h-9"
      />
    </div>
  );
  const renderCockroachForm = (): React.ReactElement => (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-slate-800">
        <input
          type="checkbox"
          checked={reportState.cockroach?.apply_gel ?? false}
          onChange={(e) =>
            handlePestDataChange('cockroach', 'apply_gel', e.target.checked)
          }
        />
        หยอดเหยื่อ
      </label>
      <Input
        type="text"
        placeholder="อื่นๆ..."
        value={reportState.cockroach?.other || ''}
        onChange={(e) =>
          handlePestDataChange('cockroach', 'other', e.target.value)
        }
        className="h-9"
      />
    </div>
  );
  const renderLizardForm = (): React.ReactElement => (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-slate-800">
        <input
          type="checkbox"
          checked={reportState.lizard?.place_traps ?? false}
          onChange={(e) =>
            handlePestDataChange('lizard', 'place_traps', e.target.checked)
          }
        />
        วางบ้านดักจิ้งจก แมลงคลาน
      </label>
      <Input
        type="text"
        placeholder="อื่นๆ..."
        value={reportState.lizard?.other || ''}
        onChange={(e) =>
          handlePestDataChange('lizard', 'other', e.target.value)
        }
        className="h-9"
      />
    </div>
  );
  const renderRatForm = (): React.ReactElement => (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="flex items-center gap-2 text-slate-800">
          <input
            type="checkbox"
            checked={reportState.rat?.glue_traps ?? false}
            onChange={(e) =>
              handlePestDataChange('rat', 'glue_traps', e.target.checked)
            }
          />
          วางถาดกาว
        </label>
        <label className="flex items-center gap-2 text-slate-800">
          <input
            type="checkbox"
            checked={reportState.rat?.mechanical_traps ?? false}
            onChange={(e) =>
              handlePestDataChange('rat', 'mechanical_traps', e.target.checked)
            }
          />
          วางเครื่องดักหนู
        </label>
        <label className="flex items-center gap-2 text-slate-800">
          <input
            type="checkbox"
            checked={reportState.rat?.bait_stations ?? false}
            onChange={(e) =>
              handlePestDataChange('rat', 'bait_stations', e.target.checked)
            }
          />
          วางสถานีดักหนู
        </label>
        <label className="flex items-center gap-2 text-slate-800">
          <input
            type="checkbox"
            checked={reportState.rat?.refill_bait ?? false}
            onChange={(e) =>
              handlePestDataChange('rat', 'refill_bait', e.target.checked)
            }
          />
          เติมเหยื่อสถานีดักหนู
        </label>
      </div>
      <Input
        type="text"
        placeholder="อื่นๆ..."
        value={reportState.rat?.other || ''}
        onChange={(e) => handlePestDataChange('rat', 'other', e.target.value)}
        className="h-9"
      />
    </div>
  );

  const pestRenderConfig: Record<
    PestType,
    { label: string; render: () => React.ReactElement }
  > = {
    termite: { label: 'ปลวก', render: renderTermiteForm },
    ant: { label: 'มด', render: renderAntForm },
    cockroach: { label: 'แมลงสาบ', render: renderCockroachForm },
    rat: { label: 'หนู', render: renderRatForm },
    lizard: { label: 'จิ้งจก', render: renderLizardForm },
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="5xl"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            form="service-report-form"
            className="py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
          >
            {submitButtonText}
          </button>
          {isAdmin && isPending && (
            <button
              type="button"
              onClick={handleApprove}
              className="py-2 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm"
            >
              อนุมัติรายงาน
            </button>
          )}
        </div>
      }
    >
      <form
        id="service-report-form"
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <div className="p-4 bg-slate-50 rounded-lg border grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6 text-sm">
          <div>
            <dt className="font-medium text-slate-500">วันที่สร้าง</dt>
            <dd className="mt-1 text-slate-900 font-semibold">
              {formatThaiDate(reportState.created_at)}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">ลูกค้า</dt>
            <dd className="mt-1 text-slate-900 font-semibold">
              {job.customer_name}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">เวลาเข้า</dt>
            <dd className="mt-1 text-slate-900 font-semibold">
              {reportState.check_in_time}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">เวลาออก</dt>
            <dd className="mt-1 text-slate-900 font-semibold">
              {reportState.check_out_time}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="font-medium text-slate-500">สถานะรายงาน</dt>
            <dd className="mt-1 font-semibold">
              <StatusBadge status={reportState.status || JobStatus.Draft} />
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="font-medium text-slate-500">
              ช่างเทคนิคที่ปฏิบัติงาน
            </dt>
            <dd className="mt-1 text-slate-900 font-semibold">
              {job.technicians.length > 0
                ? job.technicians.map((t) => t.first_name + ' ' + t.last_name).join(', ')
                : 'ไม่มีช่างเทคนิค'}
            </dd>
          </div>
        </div>

        <FormField label="อ้างอิงใบเสนอราคา (ถ้ามี)" htmlFor="quotation-ref">
          <Select
            id="quotation-ref"
            value={selectedQuotationId}
            onChange={(e) => setSelectedQuotationId(e.target.value)}
          >
            <option value="">-- ไม่ระบุ --</option>
            {availableQuotations.map((q) => (
              <option key={q.id} value={q.id}>
                {q.id} (ยอด: ฿{q.total.toLocaleString()})
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="ประเภทบริการ">
            <div className="grid grid-cols-2 gap-2 mt-1 border p-2 rounded-md">
              {ALL_SERVICE_TYPES.map((type) => (
                <label
                  key={type}
                  className="flex items-center space-x-2 text-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={reportState.service_types?.includes(type)}
                    onChange={() => handleMultiSelect('service_types', type)}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </FormField>
          <FormField label="การบริการ">
            <div className="grid grid-cols-2 gap-2 mt-1 border p-2 rounded-md">
              {ALL_SERVICE_ACTIONS.map((action) => (
                <label
                  key={action}
                  className="flex items-center space-x-2 text-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={reportState.service_actions?.includes(action)}
                    onChange={() => handleMultiSelect('service_actions', action)}
                  />
                  <span>{action}</span>
                </label>
              ))}
            </div>
          </FormField>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-md font-semibold text-slate-900 mb-4">
            ผลการสำรวจและดำเนินการ
          </h4>
          <div className="space-y-4">
            {Object.entries(pestRenderConfig).map(([key, config]) => (
              <div key={key} className="border rounded-lg p-4 bg-white">
                <h5 className="font-medium text-slate-800 mb-3 border-b pb-2">
                  {config.label}
                </h5>
                {config.render()}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-md font-semibold text-slate-900 mb-4">
            นัดหมายครั้งต่อไป
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="วันนัดหมาย">
              <div className="space-y-2">
                <Input
                  type="date"
                  value={
                    reportState.next_appointment?.scheduled_at
                      ? reportState.next_appointment.scheduled_at.substring(0, 10)
                      : ''
                  }
                  onChange={(e) =>
                    setReportState((prev) => ({
                      ...prev,
                      next_appointment: {
                        ...(prev.next_appointment || { notes: '', reasons: [] }),
                        scheduled_at: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : undefined,
                      },
                    }))
                  }
                />
                <Select
                  onChange={handleDateCalculation}
                  className="text-sm text-slate-600"
                  defaultValue=""
                >
                  <option value="" disabled>
                    คำนวณวันนัดอัตโนมัติ...
                  </option>
                  <option value="30">อีก 1 เดือน (30 วัน)</option>
                  <option value="60">อีก 2 เดือน (60 วัน)</option>
                  <option value="90">อีก 3 เดือน (90 วัน)</option>
                  <option value="180">อีก 6 เดือน (180 วัน)</option>
                </Select>
              </div>
            </FormField>
            <FormField label="เหตุผลการนัด">
              <div className="grid grid-cols-1 gap-2 mt-1 border p-2 rounded-md max-h-40 overflow-y-auto">
                {[
                  'ติดตามผล',
                  'ครบรอบบริการ',
                  'ฉีดปลวก',
                  'วางเหยื่อ',
                  'ตรวจเช็ค',
                ].map((reason) => (
                  <label
                    key={reason}
                    className="flex items-center space-x-2 text-slate-800"
                  >
                    <input
                      type="checkbox"
                      checked={reportState.next_appointment?.reasons?.includes(
                        reason
                      )}
                      onChange={() =>
                        handleMultiSelect('next_appointment_reasons', reason)
                      }
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </FormField>
            <div className="md:col-span-2">
              <FormField label="หมายเหตุการนัด">
                <Input
                  type="text"
                  value={reportState.next_appointment?.notes || ''}
                  onChange={(e) =>
                    setReportState((prev) => ({
                      ...prev,
                      next_appointment: {
                        ...(prev.next_appointment || { notes: '', reasons: [] }),
                        notes: e.target.value,
                      },
                    }))
                  }
                  placeholder="รายละเอียดเพิ่มเติม..."
                />
              </FormField>
            </div>
          </div>
        </div>

        <FormField label="หมายเหตุเพิ่มเติม">
          <Textarea
            rows={3}
            value={reportState.notes || ''}
            onChange={(e) =>
              setReportState((prev) => ({ ...prev, notes: e.target.value }))
            }
          />
        </FormField>
      </form>
    </Modal>
  );
};
