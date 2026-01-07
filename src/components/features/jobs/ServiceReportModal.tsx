import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { FormField, Textarea, Input, Select } from '../../common/FormControls';
import {
  FieldJob,
  Status,
  ServiceReport,
  Quotation,
  User,
  UserRole,
  Contract,
  Product,
} from '../../../types';
import { formatThaiDate } from '../../../constants';
import { StatusBadge } from '../../common/StatusBadge';

interface ServiceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: FieldJob | null;
  onSubmit: (
    jobId: string,
    reportData: ServiceReport,
    finalStatus: Status,
    quotationId?: string
  ) => void;
  finalStatus: Status;
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
        q.customerId === job.customerId &&
        (q.status === Status.Draft ||
          q.status === Status.Sent ||
          q.id === job.quotationId)
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
    if (!job || !job.contractId) return undefined;
    const c = contracts.find((ct) => ct.id === job.contractId);
    if (!c) return undefined;
    const pkg = packageMapByName.get(c.servicePackage);
    const visitsRequired = pkg?.numberOfVisits ?? 0;
    if (!visitsRequired) return undefined;
    const parseDurationMonths = (text?: string) => {
      if (!text) return 12;
      const num = parseInt(text.replace(/[^\d]/g, ''), 10) || 12;
      return text.includes('ปี') ? num * 12 : num;
    };
    const durationMonths = parseDurationMonths(pkg?.contractDuration);
    const intervalDays = Math.max(
      1,
      Math.round((durationMonths * 30) / visitsRequired)
    );
    const todayTs = Date.now();
    const completedVisits = jobs.filter(
      (j) => j.contractId === c.id && j.status === Status.Completed
    ).length;
    const nextScheduled = jobs
      .filter(
        (j) =>
          j.contractId === c.id &&
          [Status.InProgress, Status.Planned, Status.Scheduled].includes(
            j.status
          )
      )
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
      .find((j) => new Date(j.startTime).getTime() >= todayTs);
    let nextDueTs: number | null = null;
    if (nextScheduled) {
      nextDueTs = new Date(nextScheduled.startTime).getTime();
    } else {
      const startTs = new Date(c.startDate).getTime();
      const nextIndex = Math.min(completedVisits, visitsRequired - 1);
      nextDueTs =
        startTs +
        (nextIndex + (completedVisits >= visitsRequired ? 0 : 1)) *
          intervalDays *
          24 *
          60 *
          60 *
          1000;
      const endTs = new Date(c.endDate).getTime();
      if (nextDueTs > endTs) nextDueTs = null;
    }
    return nextDueTs ? new Date(nextDueTs).toISOString() : undefined;
  }, [job, contracts, products, jobs, packageMapByName]);

  useEffect(() => {
    if (isOpen && job) {
      // If the job already has a draft report, load it. Otherwise, create a new one.
      const initialReport = job.serviceReport
        ? { ...job.serviceReport }
        : {
            createdAt: new Date().toISOString().substring(0, 10),
            checkInTime: job.actualStartTime
              ? new Date(job.actualStartTime).toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '',
            checkOutTime: new Date().toLocaleTimeString('th-TH', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            serviceTypes: [],
            serviceActions: [],
            termite: { status: 'absent' },
            ant: { applyGel: false },
            cockroach: { applyGel: false },
            rat: {
              glueTraps: false,
              mechanicalTraps: false,
              baitStations: false,
              refillBait: false,
            },
            lizard: { placeTraps: false },
            nextAppointment: {
              notes: '',
              reasons: [],
              scheduledAt: recommendedNextIso,
            },
            status: Status.Draft,
          };
      setReportState(initialReport);
      setSelectedQuotationId(job.quotationId || '');
    }
  }, [isOpen, job, recommendedNextIso]);

  if (!isOpen || !job) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let nextStatus = reportState.status || Status.Draft;
    // If a non-admin user saves a draft, it moves to PendingApproval
    if (currentUser.role !== UserRole.Admin && nextStatus === Status.Draft) {
      nextStatus = Status.PendingApproval;
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
      status: Status.Approved,
    } as ServiceReport;
    onSubmit(job.id, finalReportData, finalStatus, selectedQuotationId);
  };

  const handleMultiSelect = (
    field: 'serviceTypes' | 'serviceActions' | 'nextAppointment_reasons',
    value: string
  ) => {
    setReportState((prev) => {
      const currentValues =
        field === 'nextAppointment_reasons'
          ? prev.nextAppointment?.reasons || []
          : prev[field] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];

      if (field === 'nextAppointment_reasons') {
        return {
          ...prev,
          nextAppointment: {
            ...(prev.nextAppointment || { notes: '', reasons: [] }),
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
      const currentDate = new Date(job.startTime);
      currentDate.setDate(currentDate.getDate() + days);

      const thaiDate = currentDate.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const newNote = `ประมาณวันที่ ${thaiDate} (${days} วัน)`;

      setReportState((prev) => ({
        ...prev,
        nextAppointment: {
          ...(prev.nextAppointment || { notes: '', reasons: [] }),
          notes: newNote,
        },
      }));
    } else {
      setReportState((prev) => ({
        ...prev,
        nextAppointment: {
          ...(prev.nextAppointment || { notes: '', reasons: [] }),
          notes: '',
        },
      }));
    }
    e.target.value = '';
  };

  const title =
    finalStatus === Status.Cancelled
      ? 'บันทึกเหตุผลการยกเลิก'
      : `บันทึกรายงานบริการ: ${job.id}`;

  const isAdmin = currentUser.role === UserRole.Admin;
  const isPending = reportState.status === Status.PendingApproval;
  const isDraft = reportState.status === Status.Draft;

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
          checked={reportState.ant?.applyGel ?? false}
          onChange={(e) =>
            handlePestDataChange('ant', 'applyGel', e.target.checked)
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
          checked={reportState.cockroach?.applyGel ?? false}
          onChange={(e) =>
            handlePestDataChange('cockroach', 'applyGel', e.target.checked)
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
          checked={reportState.lizard?.placeTraps ?? false}
          onChange={(e) =>
            handlePestDataChange('lizard', 'placeTraps', e.target.checked)
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
            checked={reportState.rat?.glueTraps ?? false}
            onChange={(e) =>
              handlePestDataChange('rat', 'glueTraps', e.target.checked)
            }
          />
          วางถาดกาว
        </label>
        <label className="flex items-center gap-2 text-slate-800">
          <input
            type="checkbox"
            checked={reportState.rat?.mechanicalTraps ?? false}
            onChange={(e) =>
              handlePestDataChange('rat', 'mechanicalTraps', e.target.checked)
            }
          />
          วางเครื่องดักหนู
        </label>
        <label className="flex items-center gap-2 text-slate-800">
          <input
            type="checkbox"
            checked={reportState.rat?.baitStations ?? false}
            onChange={(e) =>
              handlePestDataChange('rat', 'baitStations', e.target.checked)
            }
          />
          วางสถานีดักหนู
        </label>
        <label className="flex items-center gap-2 text-slate-800">
          <input
            type="checkbox"
            checked={reportState.rat?.refillBait ?? false}
            onChange={(e) =>
              handlePestDataChange('rat', 'refillBait', e.target.checked)
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
              {formatThaiDate(reportState.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">ลูกค้า</dt>
            <dd className="mt-1 text-slate-900 font-semibold">
              {job.customerName}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">เวลาเข้า</dt>
            <dd className="mt-1 text-slate-900 font-semibold">
              {reportState.checkInTime}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">เวลาออก</dt>
            <dd className="mt-1 text-slate-900 font-semibold">
              {reportState.checkOutTime}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="font-medium text-slate-500">สถานะรายงาน</dt>
            <dd className="mt-1 font-semibold">
              <StatusBadge status={reportState.status || Status.Draft} />
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="font-medium text-slate-500">
              ช่างเทคนิคที่ปฏิบัติงาน
            </dt>
            <dd className="mt-1 text-slate-900 font-semibold">
              {job.technicians.length > 0
                ? job.technicians.map((t) => t.name).join(', ')
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
                    checked={reportState.serviceTypes?.includes(type)}
                    onChange={() => handleMultiSelect('serviceTypes', type)}
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
                    checked={reportState.serviceActions?.includes(action)}
                    onChange={() => handleMultiSelect('serviceActions', action)}
                  />
                  <span>{action}</span>
                </label>
              ))}
            </div>
          </FormField>
        </div>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg space-y-5">
            {Object.keys(pestRenderConfig).map((pest) => (
              <div
                key={pest}
                className="border-b border-slate-200 last:border-b-0 pb-4 last:pb-0"
              >
                <h5 className="text-slate-800 font-semibold mb-3">
                  {pestRenderConfig[pest as PestType].label}
                </h5>
                <div className="pl-4">
                  {pestRenderConfig[pest as PestType].render()}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-lg font-semibold text-slate-800 mb-4">
            การเบิกใช้น้ำยา/อุปกรณ์ (Material Usage)
          </h4>
          <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
            <div className="flex gap-2 items-end">
              <div className="flex-grow">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  เลือกรายการ (สินค้า)
                </label>
                <Select id="material-select" className="w-full">
                  <option value="">-- เลือกรายการ --</option>
                  {products
                    .filter((p) => p.type === 'สินค้า')
                    .map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        data-name={p.name}
                        data-unit={p.unit}
                      >
                        {p.name} ({p.stock} {p.unit})
                      </option>
                    ))}
                </Select>
              </div>
              <div className="w-32">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  จำนวน
                </label>
                <Input
                  id="material-qty"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0.0"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const select = document.getElementById(
                    'material-select'
                  ) as HTMLSelectElement;
                  const qtyInput = document.getElementById(
                    'material-qty'
                  ) as HTMLInputElement;
                  const id = select.value;
                  const qty = parseFloat(qtyInput.value);
                  if (!id || !qty || qty <= 0) return;

                  const option = select.options[select.selectedIndex];
                  const name = option.getAttribute('data-name') || '';
                  const unit = option.getAttribute('data-unit') || '';

                  setReportState((prev) => {
                    const current = prev.materialsUsed || [];
                    const existing = current.find((m) => m.id === id);
                    if (existing) {
                      return {
                        ...prev,
                        materialsUsed: current.map((m) =>
                          m.id === id ? { ...m, quantity: m.quantity + qty } : m
                        ),
                      };
                    }
                    return {
                      ...prev,
                      materialsUsed: [
                        ...current,
                        { id, name, quantity: qty, unit },
                      ],
                    };
                  });

                  select.value = '';
                  qtyInput.value = '';
                }}
                className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark self-end mb-[2px]"
              >
                เพิ่ม
              </button>
            </div>

            {reportState.materialsUsed &&
            reportState.materialsUsed.length > 0 ? (
              <table className="min-w-full divide-y divide-slate-200 bg-white rounded border overflow-hidden">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                      รายการ
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">
                      จำนวน
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">
                      หน่วย
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">
                      ลบ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportState.materialsUsed.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-sm text-slate-800">
                        {item.name}
                      </td>
                      <td className="px-3 py-2 text-right text-sm text-slate-800">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-slate-500">
                        {item.unit}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setReportState((prev) => ({
                              ...prev,
                              materialsUsed: prev.materialsUsed?.filter(
                                (_, i) => i !== idx
                              ),
                            }));
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4 bg-white border border-dashed rounded">
                ยังไม่มีการระบุการใช้วัสดุ
              </p>
            )}
          </div>
        </div>

        <FormField label="เข้าทำครั้งถัดไป">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="w-48 flex-shrink-0">
                <Select onChange={handleDateCalculation}>
                  <option value="">คำนวณจากจำนวนวัน</option>
                  <option value="30">30 วัน</option>
                  <option value="60">60 วัน</option>
                  <option value="90">90 วัน</option>
                  <option value="120">120 วัน</option>
                  <option value="180">180 วัน</option>
                </Select>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  type="date"
                  value={
                    reportState.nextAppointment?.scheduledAt
                      ? new Date(reportState.nextAppointment.scheduledAt)
                          .toISOString()
                          .substring(0, 10)
                      : ''
                  }
                  onChange={(e) => {
                    const date = e.target.value;
                    const time = reportState.nextAppointment?.scheduledAt
                      ? new Date(reportState.nextAppointment.scheduledAt)
                          .toTimeString()
                          .substring(0, 5)
                      : '09:00';
                    const iso = date
                      ? new Date(`${date}T${time}`).toISOString()
                      : undefined;
                    setReportState((p) => ({
                      ...p,
                      nextAppointment: {
                        ...(p.nextAppointment || { notes: '', reasons: [] }),
                        scheduledAt: iso,
                      },
                    }));
                  }}
                />
                <Input
                  type="time"
                  value={
                    reportState.nextAppointment?.scheduledAt
                      ? new Date(reportState.nextAppointment.scheduledAt)
                          .toTimeString()
                          .substring(0, 5)
                      : ''
                  }
                  onChange={(e) => {
                    const time = e.target.value || '09:00';
                    const date = reportState.nextAppointment?.scheduledAt
                      ? new Date(reportState.nextAppointment.scheduledAt)
                          .toISOString()
                          .substring(0, 10)
                      : '';
                    const iso = date
                      ? new Date(`${date}T${time}`).toISOString()
                      : undefined;
                    setReportState((p) => ({
                      ...p,
                      nextAppointment: {
                        ...(p.nextAppointment || { notes: '', reasons: [] }),
                        scheduledAt: iso,
                      },
                    }));
                  }}
                />
                <Input
                  type="text"
                  className="flex-grow"
                  placeholder="หมายเหตุ เช่น สัปดาห์หน้า, นัดช่วงเช้า"
                  value={reportState.nextAppointment?.notes || ''}
                  onChange={(e) =>
                    setReportState((p) => ({
                      ...p,
                      nextAppointment: {
                        ...(p.nextAppointment || { notes: '', reasons: [] }),
                        notes: e.target.value,
                      },
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border p-2 rounded-md">
              {ALL_SERVICE_ACTIONS.map((reason) => (
                <label
                  key={reason}
                  className="flex items-center space-x-2 text-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={reportState.nextAppointment?.reasons?.includes(
                      reason
                    )}
                    onChange={() =>
                      handleMultiSelect('nextAppointment_reasons', reason)
                    }
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>
        </FormField>

        <div className="border-t pt-4">
          <h4 className="text-lg font-semibold text-slate-800 mb-4">
            หลักฐานการทำงาน (Proof of Service)
          </h4>

          {/* Images Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                รูปภาพก่อนเริ่มงาน (Before)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {reportState.images?.before?.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden border"
                  >
                    <img
                      src={img}
                      alt="Before"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newImages = [
                          ...(reportState.images?.before || []),
                        ];
                        newImages.splice(idx, 1);
                        setReportState((prev) => ({
                          ...prev,
                          images: {
                            ...(prev.images || { before: [], after: [] }),
                            before: newImages,
                          },
                        }));
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    // Mock Upload
                    const mockUrl = `https://picsum.photos/200?random=${Date.now()}`;
                    setReportState((prev) => ({
                      ...prev,
                      images: {
                        ...(prev.images || { before: [], after: [] }),
                        before: [...(prev.images?.before || []), mockUrl],
                      },
                    }));
                  }}
                  className="aspect-square bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-400"
                >
                  <span className="text-2xl">+</span>
                  <span className="text-xs">เพิ่มรูป</span>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                รูปภาพหลังจบงาน (After)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {reportState.images?.after?.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden border"
                  >
                    <img
                      src={img}
                      alt="After"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newImages = [
                          ...(reportState.images?.after || []),
                        ];
                        newImages.splice(idx, 1);
                        setReportState((prev) => ({
                          ...prev,
                          images: {
                            ...(prev.images || { before: [], after: [] }),
                            after: newImages,
                          },
                        }));
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    // Mock Upload
                    const mockUrl = `https://picsum.photos/200?random=${Date.now() + 1}`;
                    setReportState((prev) => ({
                      ...prev,
                      images: {
                        ...(prev.images || { before: [], after: [] }),
                        after: [...(prev.images?.after || []), mockUrl],
                      },
                    }));
                  }}
                  className="aspect-square bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-400"
                >
                  <span className="text-2xl">+</span>
                  <span className="text-xs">เพิ่มรูป</span>
                </button>
              </div>
            </div>
          </div>

          {/* Signatures Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4 bg-slate-50">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                ลายเซ็นลูกค้า (Customer Signature)
              </label>
              {reportState.signatures?.customer ? (
                <div className="text-center">
                  <div className="bg-white border text-center py-8 mb-2 rounded italic text-slate-500 font-serif text-2xl">
                    Signed
                  </div>
                  <p className="text-sm font-semibold">
                    {reportState.signatures.customerName}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setReportState((prev) => ({
                        ...prev,
                        signatures: {
                          ...(prev.signatures || {
                            customer: '',
                            customerName: '',
                            technician: '',
                            technicianName: '',
                          }),
                          customer: '',
                        },
                      }))
                    }
                    className="text-red-500 text-xs mt-2 underline"
                  >
                    ลบลายเซ็น
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="ชื่อผู้รับบริการ / ผู้เซ็น"
                    value={reportState.signatures?.customerName || ''}
                    onChange={(e) =>
                      setReportState((prev) => ({
                        ...prev,
                        signatures: {
                          ...(prev.signatures || {
                            customer: '',
                            customerName: '',
                            technician: '',
                            technicianName: '',
                          }),
                          customerName: e.target.value,
                        },
                      }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!reportState.signatures?.customerName) {
                        alert('กรุณาระบุชื่อผู้เซ็นก่อน');
                        return;
                      }
                      setReportState((prev) => ({
                        ...prev,
                        signatures: {
                          ...(prev.signatures || {
                            customer: '',
                            customerName: '',
                            technician: '',
                            technicianName: '',
                          }),
                          customer: 'data:mock_signature',
                        },
                      }));
                    }}
                    className="w-full py-8 bg-white border-2 border-dashed border-slate-300 rounded text-slate-400 hover:bg-slate-50"
                  >
                    คลิกเพื่อเซ็นชื่อลูกค้า
                  </button>
                </div>
              )}
            </div>
            <div className="border rounded-lg p-4 bg-slate-50">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                ลายเซ็นช่าง (Technician Signature)
              </label>
              {reportState.signatures?.technician ? (
                <div className="text-center">
                  <div className="bg-white border text-center py-8 mb-2 rounded italic text-slate-500 font-serif text-2xl">
                    Signed
                  </div>
                  <p className="text-sm font-semibold">
                    {reportState.signatures.technicianName}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setReportState((prev) => ({
                        ...prev,
                        signatures: {
                          ...(prev.signatures || {
                            customer: '',
                            customerName: '',
                            technician: '',
                            technicianName: '',
                          }),
                          technician: '',
                        },
                      }))
                    }
                    className="text-red-500 text-xs mt-2 underline"
                  >
                    ลบลายเซ็น
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="ชื่อช่างผู้ให้บริการ"
                    value={
                      reportState.signatures?.technicianName || currentUser.name
                    }
                    onChange={(e) =>
                      setReportState((prev) => ({
                        ...prev,
                        signatures: {
                          ...(prev.signatures || {
                            customer: '',
                            customerName: '',
                            technician: '',
                            technicianName: '',
                          }),
                          technicianName: e.target.value,
                        },
                      }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setReportState((prev) => ({
                        ...prev,
                        signatures: {
                          ...(prev.signatures || {
                            customer: '',
                            customerName: '',
                            technician: '',
                            technicianName: '',
                          }),
                          technicianName:
                            prev.signatures?.technicianName || currentUser.name,
                          technician: 'data:mock_signature',
                        },
                      }));
                    }}
                    className="w-full py-8 bg-white border-2 border-dashed border-slate-300 rounded text-slate-400 hover:bg-slate-50"
                  >
                    คลิกเพื่อเซ็นชื่อช่าง
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
