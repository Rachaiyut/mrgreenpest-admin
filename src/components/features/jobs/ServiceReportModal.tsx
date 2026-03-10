import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { Textarea, Input, Select } from '../../common/FormControls';
import {
  FieldJob,
  ServiceReport,
} from '@/src/types/entity/field-job.interface';
import { User, UserRole } from '@/src/types/entity/core.interface';
import { Product } from '@/src/types/entity/product.interface';
import { Quotation } from '@/src/types/entity/financial.interface';
import { JobStatus } from '@/src/types/enums/job';
import { QuotationStatus } from '@/src/types/enums/financial';
import { formatThaiDate } from '../../../utils/date';
import { StatusBadge } from '../../common/StatusBadge';
import { Assessment } from '@/src/types';
import { QuotationApi } from '@/src/api';
import { SearchableSelect } from '../../common/SearchableSelect';
import {
  CalendarIcon,
  DocumentIcon,
  CheckCircleIcon,
  CreditCardIcon,
} from '../../../assets/icons/Icons';

interface ServiceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: FieldJob | null;
  onSubmit: (
    jobId: string,
    reportData: ServiceReport,
    finalStatus: JobStatus,
    quotationId?: string,
    files?: File[],
    paymentSlip?: File | null,
    quotationFile?: File | null,
  ) => void;
  finalStatus: JobStatus;
  currentUser: User;
  contracts: any[];
  products: Product[];
  jobs?: FieldJob[];
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

const getFileUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
    return path;
  }
  
  const backendBaseUrl = (import.meta as any).env?.VITE_API_URL 
    ? (import.meta as any).env.VITE_API_URL.replace(/\/api\/?$/, '') 
    : 'http://localhost:3000';
    
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${backendBaseUrl}/${cleanPath}`;
};

export const ServiceReportModal: React.FC<ServiceReportModalProps> = ({
  isOpen,
  onClose,
  job,
  onSubmit,
  finalStatus,
  currentUser,
  contracts,
  products = [],
  jobs = [],
}) => {
  const [reportState, setReportState] = useState<Partial<ServiceReport & { 
    payment_amount?: string | number;
    payment_slip_url?: string | null;
    quotation_url?: string | null;
    blueprint_url?: string | null;
  }>>({});
  
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');

  const [activePestTab, setActivePestTab] = useState<PestType>('termite');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [paymentSlip, setPaymentSlip] = useState<File | null>(null);
  const [quotationFile, setQuotationFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const packageMapByName = useMemo(
    () =>
      new Map(
        (products || [])
          .filter(
            (p: any) => p.type === 'บริการ' || p.category?.type === 'SERVICE'
          )
          .map((p) => [p.name, p])
      ),
    [products]
  );

  const recommendedNextIso = useMemo(() => {
    if (!job || !job.contract_id) return undefined;
    const c = (contracts || []).find((ct) => ct.id === job.contract_id);
    if (!c) return undefined;
    const pkg = packageMapByName.get(c.servicePackage || '') as any;
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
    const completedVisits = (jobs || []).filter(
      (j) =>
        j.contract_id === c.id &&
        (j.status as unknown as JobStatus) === JobStatus.Completed
    ).length;
    const nextScheduled = (jobs || [])
      .filter(
        (j) =>
          j.contract_id === c.id &&
          [
            JobStatus.InProgress,
            JobStatus.Planned,
            JobStatus.Scheduled,
          ].includes(j.status as unknown as JobStatus)
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
    if (isOpen) {
      const fetchQuotations = async () => {
        try {
          const res = await QuotationApi.getAll({
            limit: 10,
            status: QuotationStatus.DRAFT,
          });
          setQuotations(res.data);
        } catch (error) {
          console.error('Failed to fetch quotations:', error);
        }
      };

      fetchQuotations();
    }
  }, [isOpen]);

  const handleQuotationSearch = async (value: string) => {
    try {
      const res = await QuotationApi.getAll({
        limit: 10,
        status: QuotationStatus.DRAFT,
        search: value,
      });
      setQuotations(res.data);
    } catch (error) {
      console.error('Failed to search quotations:', error);
    }
  };

  useEffect(() => {
    if (isOpen && job) {
      let initialReport: Partial<ServiceReport & { payment_amount?: string | number, payment_slip_url?: string, quotation_url?: string, blueprint_url?: string }>;

      if (job.service_report) {
        const r = (job.service_report as any).data || (job.service_report as any);
        const d = r.service_report_pest_detail || {};

        const types: string[] = [];
        if (r.is_service_termite) types.push('กำจัดปลวก');
        if (r.is_service_ant_roach) {
          types.push('กำจัดมด');
          types.push('กำจัดแมลงสาบ');
        }
        if (r.is_service_rodent) types.push('กำจัดหนู');
        if (r.is_service_mosquito) types.push('กำจัดยุง');
        if (r.service_other) types.push('กำจัดอื่นๆ');

        const actions: string[] = [];
        if (r.is_op_station) actions.push('ฝังสถานี');
        if (r.is_op_refill) actions.push('เติมเหยื่อ');
        if (r.is_op_chemical) actions.push('อัดน้ำยา');
        if (r.is_op_check) actions.push('ตรวจเช็ค');
        if (r.is_op_renew) actions.push('ต่อสัญญา');
        if (r.is_op_underground) actions.push('อัดลงดิน');
        if (r.is_op_spray) actions.push('สเปรย์');
        if (r.is_op_fogging) actions.push('พ่นหมอกควัน');
        if (r.is_op_powder) actions.push('โรยผง');
        if (r.is_op_bait) actions.push('วางเหยื่อ');
        if (r.is_op_trap) actions.push('วางกับดัก');

        const nextReasons: string[] = [];
        if (r.is_next_refill) nextReasons.push('วางเหยื่อ');
        if (r.is_next_chemical) nextReasons.push('ฉีดปลวก');
        if (r.is_next_check) nextReasons.push('ตรวจเช็ค');
        if (r.is_next_renew) nextReasons.push('ครบรอบบริการ');

        if (r.next_service_purpose) {
          const purposes = r.next_service_purpose
            .split(',')
            .map((s: string) => s.trim());
          purposes.forEach((p: string) => {
            if (!nextReasons.includes(p)) nextReasons.push(p);
          });
        }

        initialReport = {
          ...r,
          payment_amount: r.payment_amount || job?.invoice?.total || '', 
          quotation_id: r.quotation_id,
          payment_slip_url: r.payment_slip_url || null,
          quotation_url: r.quotation_url || null,
          blueprint_url: r.blueprint_url || null,
          service_types: types,
          service_actions: actions,
          check_in_time: r.time_in,
          check_out_time: r.time_out,
          next_appointment: {
            notes: r.work_note || '',
            reasons: nextReasons,
            scheduled_at: r.next_service_schedule,
          },
          // 👇 แก้ไขการโยนค่าให้ตรงกับ Model
          ant: {
            apply_gel: d.ant_bait,
            sprayBio: d.ant_spray_bio,
            aroundBuilding: d.ant_around_building,
            inShaft: d.ant_in_shaft,
            insideBuilding: d.ant_inside_building,
            other: d.pest_other,
          },
          cockroach: {
            apply_gel: d.roach_bait,
            other: d.pest_other,
          },
          rat: {
            glue_traps: d.rat_glue_trap,
            mechanical_traps: d.rat_mechanical_trap,
            bait_stations: d.rat_bait_station,
            refill_bait: d.rat_refill_bait,
            other: d.pest_other,
          },
          lizard: {
            place_traps: d.lizard_trap,
            other: d.pest_other,
          },
          termite: {
            status:
              d.termite_status || (r.is_service_termite ? 'present' : 'absent'),
            actions: {
              installStations: {
                enabled: r.is_op_station,
                count: d.termite_install_stations_count,
              },
              addBait: {
                enabled: r.is_op_refill,
                count: d.termite_add_bait_count,
              },
              foundTermites: {
                enabled: d.termite_found_enabled,
                count: d.termite_found_count,
              },
              placeBoxes: {
                enabled: d.termite_place_boxes_enabled,
                count: d.termite_place_boxes_count,
                area: d.termite_place_boxes_area,
              },
              injectPipes: {
                enabled: r.is_op_chemical,
                count: d.termite_inject_pipes_count,
              },
              injectSoil: { enabled: r.is_op_underground },
              sprayGarden: { enabled: r.is_op_spray },
              changeWood: { enabled: d.termite_change_wood },
              changeLid: { enabled: d.termite_change_lid },
              addFocusBait: { enabled: d.termite_add_focus_bait },
              injectShaft: { enabled: d.termite_inject_shaft },
              other: d.termite_other,
            },
          },
        };
      } else {
        initialReport = {
          created_at: new Date().toISOString().substring(0, 10),
          payment_amount: job?.invoice?.total || '', 
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
          ant: { apply_gel: false, sprayBio: false, aroundBuilding: false, inShaft: false, insideBuilding: false }, // ตั้งค่าเริ่มต้น
          cockroach: { apply_gel: false },
          rat: {
            glue_traps: false,
            mechanical_traps: false,
            bait_stations: false,
            refill_bait: false,
            other: '',
          },
          lizard: { place_traps: false },
          next_appointment: {
            notes: '',
            reasons: [],
            scheduled_at: recommendedNextIso,
          },
          status: JobStatus.Draft,
        };
      }

      setReportState(initialReport);
    }
  }, [isOpen, job, recommendedNextIso]);

  if (!isOpen || !job) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let nextStatus = reportState.status || JobStatus.Draft;
    if (currentUser.role !== UserRole.ADMIN && nextStatus === JobStatus.Draft) {
      nextStatus = JobStatus.PendingApproval;
    }

    const finalReportData = {
      ...reportState,
      status: nextStatus,
      job_id: job.id,
      customer_id: job.customer_id,
      payment_amount: reportState.payment_amount ? Number(reportState.payment_amount) : 0, 
      report_date: new Date().toISOString(),
      customer_name: (job as any).customerName || (job as any).customer_name,

      is_service_termite: reportState.service_types?.includes('กำจัดปลวก'),
      is_service_ant_roach: reportState.service_types?.some((t) =>
        ['กำจัดมด', 'กำจัดแมลงสาบ'].includes(t)
      ),
      is_service_rodent: reportState.service_types?.includes('กำจัดหนู'),
      is_service_mosquito: reportState.service_types?.includes('กำจัดยุง'),
      service_other: reportState.service_types?.includes('กำจัดอื่นๆ')
        ? 'Other'
        : null,

      time_in: reportState.check_in_time,
      time_out: reportState.check_out_time,

      is_op_station:
        reportState.service_actions?.includes('ฝังสถานี') ||
        reportState.termite?.actions?.installStations?.enabled,

      is_op_refill:
        reportState.service_actions?.includes('เติมเหยื่อ') ||
        reportState.termite?.actions?.addBait?.enabled ||
        reportState.rat?.refill_bait,

      is_op_chemical:
        reportState.service_actions?.includes('อัดน้ำยา') ||
        reportState.termite?.actions?.injectPipes?.enabled ||
        reportState.termite?.actions?.injectShaft?.enabled,

      is_op_check: reportState.service_actions?.includes('ตรวจเช็ค'),

      is_op_underground: reportState.termite?.actions?.injectSoil?.enabled,

      is_op_renew: reportState.service_actions?.includes('ต่อสัญญา'),

      is_op_spray: reportState.service_actions?.includes('สเปรย์') || reportState.termite?.actions?.sprayGarden?.enabled,
      is_op_fogging: reportState.service_actions?.includes('พ่นหมอกควัน'),
      is_op_gel: reportState.ant?.apply_gel || reportState.cockroach?.apply_gel,
      is_op_powder: reportState.service_actions?.includes('โรยผง'),
      is_op_bait: reportState.rat?.bait_stations,
      is_op_trap:
        reportState.lizard?.place_traps ||
        reportState.rat?.glue_traps ||
        reportState.rat?.mechanical_traps,

      op_other: null,

      work_note: reportState.notes,
      next_service_schedule: reportState.next_appointment?.scheduled_at,
      next_service_purpose: reportState.next_appointment?.reasons?.join(', '),
      is_next_refill:
        reportState.next_appointment?.reasons?.includes('เติมเหยื่อ') ||
        reportState.next_appointment?.reasons?.includes('วางเหยื่อ'),
      is_next_chemical:
        reportState.next_appointment?.reasons?.includes('ฉีดปลวก'),
      is_next_check:
        reportState.next_appointment?.reasons?.includes('ตรวจเช็ค'),
      is_next_station: reportState.next_appointment?.reasons?.includes('ฝังสถานี'), // 👇 แก้ไขให้ส่งเป็น is_next_station
      is_next_renew:
        reportState.next_appointment?.reasons?.includes('ครบรอบบริการ'),

      pest_detail: {
        ant_bait: reportState.ant?.apply_gel || false,
        // 👇 ย้ายข้อมูลจาก Termite มาไว้ Ant ให้ตรงกับ DTO
        ant_spray_bio: reportState.ant?.sprayBio || false,
        ant_around_building: reportState.ant?.aroundBuilding || false,
        ant_in_shaft: reportState.ant?.inShaft || false,
        ant_inside_building: reportState.ant?.insideBuilding || false,

        roach_bait: reportState.cockroach?.apply_gel || false,
        rat_glue_trap: reportState.rat?.glue_traps || false,
        rat_mechanical_trap: reportState.rat?.mechanical_traps || false,
        rat_bait_station: reportState.rat?.bait_stations || false,
        rat_refill_bait: reportState.rat?.refill_bait || false,
        lizard_trap: reportState.lizard?.place_traps || false,
        pest_other:
          reportState.ant?.other ||
          reportState.cockroach?.other ||
          reportState.rat?.other ||
          reportState.lizard?.other,

        termite_status: reportState.termite?.status,
        termite_install_stations_count:
          reportState.termite?.actions?.installStations?.count,
        termite_add_bait_count: reportState.termite?.actions?.addBait?.count,
        termite_found_enabled:
          reportState.termite?.actions?.foundTermites?.enabled,
        termite_found_count: reportState.termite?.actions?.foundTermites?.count,
        termite_place_boxes_enabled:
          reportState.termite?.actions?.placeBoxes?.enabled,
        termite_place_boxes_count:
          reportState.termite?.actions?.placeBoxes?.count,
        termite_place_boxes_area:
          reportState.termite?.actions?.placeBoxes?.area,
        termite_inject_pipes_count:
          reportState.termite?.actions?.injectPipes?.count,
        termite_change_wood: reportState.termite?.actions?.changeWood,
        termite_change_lid: reportState.termite?.actions?.changeLid,
        termite_add_focus_bait: reportState.termite?.actions?.addFocusBait,
        termite_inject_shaft: reportState.termite?.actions?.injectShaft,
        termite_other: reportState.termite?.actions?.other,
      },
    } as ServiceReport;
    onSubmit(
      job.id,
      finalReportData,
      finalStatus,
      reportState.quotation_id,
      selectedFiles,
      paymentSlip || null,
      quotationFile || null
    );
  };

  const handleApprove = () => {
    const finalReportData = {
      ...reportState,
      status: JobStatus.Completed,
    } as ServiceReport;
    onSubmit(
      job.id,
      finalReportData,
      finalStatus,
      reportState.quotation_id,
      selectedFiles,
      paymentSlip,
    );
  };

  const handleMultiSelect = (
    field: 'service_types' | 'service_actions' | 'next_appointment_reasons',
    value: string
  ) => {
    setReportState((prev) => {
      const currentValues =
        field === 'next_appointment_reasons'
          ? prev.next_appointment?.reasons || []
          : (prev as any)[field] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v: string) => v !== value)
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
      [pest]: { ...(prev[pest as keyof typeof prev] || {}), [key]: value },
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
      : `บันทึกรายงานบริการ: ${job.code || 'N/A'}`;

  const isAdmin = currentUser.role === UserRole.ADMIN;
  const isPending = reportState.status === JobStatus.PendingApproval;
  const isDraft = reportState.status === JobStatus.Draft;

  const submitButtonText = isDraft ? 'ส่งเพื่ออนุมัติ' : 'บันทึกการเปลี่ยนแปลง';

  const renderTermiteForm = (): React.ReactElement => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 mb-4 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
        <span className="text-sm font-semibold text-yellow-800 w-full">
          สถานะปลวก:
        </span>
        <label className="flex items-center gap-2 text-green-800 cursor-pointer">
          <input
            type="radio"
            name="termiteStatus"
            value="present"
            className="w-4 h-4 text-primary"
            checked={reportState.termite?.status === 'present'}
            onChange={() =>
              handlePestDataChange('termite', 'status', 'present')
            }
          />{' '}
          <span className="font-medium">มีปลวก</span>
        </label>
        <label className="flex items-center gap-2 text-green-800 cursor-pointer">
          <input
            type="radio"
            name="termiteStatus"
            value="reduced"
            className="w-4 h-4 text-primary"
            checked={reportState.termite?.status === 'reduced'}
            onChange={() =>
              handlePestDataChange('termite', 'status', 'reduced')
            }
          />{' '}
          <span className="font-medium">มี แต่ปริมาณลดลง</span>
        </label>
        <label className="flex items-center gap-2 text-green-800 cursor-pointer">
          <input
            type="radio"
            name="termiteStatus"
            value="absent"
            className="w-4 h-4 text-primary"
            checked={reportState.termite?.status === 'absent'}
            onChange={() => handlePestDataChange('termite', 'status', 'absent')}
          />{' '}
          <span className="font-medium">ไม่มี</span>
        </label>
      </div>

      {reportState.termite?.status !== 'absent' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
          {/* Station Section */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h6 className="font-semibold text-slate-700 mb-3 border-b pb-2">
              ระบบสถานี/เหยื่อ
            </h6>
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={
                      !!reportState.termite?.actions?.installStations?.enabled
                    }
                    onChange={(e) =>
                      handleTermiteActionChange(
                        'installStations',
                        'enabled',
                        e.target.checked
                      )
                    }
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>ฝังสถานี</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="0"
                    className="w-16 h-8 text-center border rounded"
                    value={
                      reportState.termite?.actions?.installStations?.count || ''
                    }
                    onChange={(e) =>
                      handleTermiteActionChange(
                        'installStations',
                        'count',
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                  />
                  <span className="text-xs text-slate-500">จุด</span>
                </div>
              </label>
              <label className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
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
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>เติมเหยื่อ</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="0"
                    className="w-16 h-8 text-center border rounded"
                    value={reportState.termite?.actions?.addBait?.count || ''}
                    onChange={(e) =>
                      handleTermiteActionChange(
                        'addBait',
                        'count',
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                  />
                  <span className="text-xs text-slate-500">กล่อง</span>
                </div>
              </label>
              <label className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={
                      !!reportState.termite?.actions?.foundTermites?.enabled
                    }
                    onChange={(e) =>
                      handleTermiteActionChange(
                        'foundTermites',
                        'enabled',
                        e.target.checked
                      )
                    }
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>พบปลวกกินเหยื่อ</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="0"
                    className="w-16 h-8 text-center border rounded"
                    value={
                      reportState.termite?.actions?.foundTermites?.count || ''
                    }
                    onChange={(e) =>
                      handleTermiteActionChange(
                        'foundTermites',
                        'count',
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                  />
                  <span className="text-xs text-slate-500">กล่อง</span>
                </div>
              </label>
              <label className="flex items-center gap-2">
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
                  className="rounded text-primary focus:ring-primary"
                />
                <span>เปลี่ยนไม้สถานี</span>
              </label>
              <label className="flex items-center gap-2">
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
                  className="rounded text-primary focus:ring-primary"
                />
                <span>เปลี่ยนฝาสถานี</span>
              </label>
              <label className="flex items-center gap-2">
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
                  className="rounded text-primary focus:ring-primary"
                />
                <span>เติมสาร focus</span>
              </label>
            </div>
          </div>

          {/* Chemical/Spray Section */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h6 className="font-semibold text-slate-700 mb-3 border-b pb-2">
              ระบบน้ำยา/สเปรย์
            </h6>
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={
                      !!reportState.termite?.actions?.injectPipes?.enabled
                    }
                    onChange={(e) =>
                      handleTermiteActionChange(
                        'injectPipes',
                        'enabled',
                        e.target.checked
                      )
                    }
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>อัดเข้าท่อ</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="0"
                    className="w-16 h-8 text-center border rounded"
                    value={
                      reportState.termite?.actions?.injectPipes?.count || ''
                    }
                    onChange={(e) =>
                      handleTermiteActionChange(
                        'injectPipes',
                        'count',
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                  />
                  <span className="text-xs text-slate-500">จุด</span>
                </div>
              </label>
              <label className="flex items-center gap-2">
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
                  className="rounded text-primary focus:ring-primary"
                />
                <span>อัดลงดินรอบบ้าน</span>
              </label>
              <label className="flex items-center gap-2">
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
                  className="rounded text-primary focus:ring-primary"
                />
                <span>อัดเข้าช่องชาร์ป</span>
              </label>
              <label className="flex items-center gap-2">
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
                  className="rounded text-primary focus:ring-primary"
                />
                <span>สเปรย์สวน</span>
              </label>
            </div>
          </div>

          {/* Box Placement */}
          <div className="col-span-1 md:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h6 className="font-semibold text-slate-700 mb-3 border-b pb-2">
              การวางกล่อง (Termite Box)
            </h6>
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex items-center gap-2 mb-2">
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
                  className="rounded text-primary focus:ring-primary"
                />
                <span>วางกล่อง</span>
              </label>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">จำนวน:</span>
                <input
                  type="number"
                  placeholder="0"
                  className="w-16 h-8 text-center border rounded"
                  value={reportState.termite?.actions?.placeBoxes?.count || ''}
                  onChange={(e) =>
                    handleTermiteActionChange(
                      'placeBoxes',
                      'count',
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                />
              </div>
              <div className="flex items-center gap-2 flex-1 mb-2">
                <span className="text-sm">บริเวณ:</span>
                <Input
                  type="text"
                  className="h-8 flex-1"
                  placeholder="เช่น ใต้ซิงค์, ห้องเก็บของ"
                  value={reportState.termite?.actions?.placeBoxes?.area || ''}
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

          <div className="col-span-1 md:col-span-2">
            <Input
              type="text"
              placeholder="รายละเอียดอื่นๆ เพิ่มเติม..."
              value={reportState.termite?.actions?.other || ''}
              onChange={(e) => handleTermiteOtherChange(e.target.value)}
              className="h-10"
            />
          </div>
        </div>
      )}
    </div>
  );

  // 👇 ย้าย Checkbox มด มาอยู่ที่ฟังก์ชันนี้แล้ว
  const renderAntForm = (): React.ReactElement => (
    <div className="space-y-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
          <input
            type="checkbox"
            className="w-5 h-5 text-primary rounded"
            checked={reportState.ant?.apply_gel ?? false}
            onChange={(e) =>
              handlePestDataChange('ant', 'apply_gel', e.target.checked)
            }
          />
          <span className="font-medium">หยอดเหยื่อ (Gel Bait)</span>
        </label>
        
        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
          <input
            type="checkbox"
            className="w-5 h-5 text-primary rounded"
            checked={reportState.ant?.sprayBio ?? false}
            onChange={(e) =>
              handlePestDataChange('ant', 'sprayBio', e.target.checked)
            }
          />
          <span className="font-medium">สเปรย์น้ำยาชีวภาพ</span>
        </label>

        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
          <input
            type="checkbox"
            className="w-5 h-5 text-primary rounded"
            checked={reportState.ant?.aroundBuilding ?? false}
            onChange={(e) =>
              handlePestDataChange('ant', 'aroundBuilding', e.target.checked)
            }
          />
          <span className="font-medium">รอบอาคาร</span>
        </label>

        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
          <input
            type="checkbox"
            className="w-5 h-5 text-primary rounded"
            checked={reportState.ant?.inShaft ?? false}
            onChange={(e) =>
              handlePestDataChange('ant', 'inShaft', e.target.checked)
            }
          />
          <span className="font-medium">ช่องชาร์ป</span>
        </label>

        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
          <input
            type="checkbox"
            className="w-5 h-5 text-primary rounded"
            checked={reportState.ant?.insideBuilding ?? false}
            onChange={(e) =>
              handlePestDataChange('ant', 'insideBuilding', e.target.checked)
            }
          />
          <span className="font-medium">ภายในอาคาร</span>
        </label>
      </div>

      <div className="pt-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          รายละเอียดอื่นๆ
        </label>
        <Input
          type="text"
          placeholder="ระบุจุดที่พบหรือการดำเนินการอื่นๆ..."
          value={reportState.ant?.other || ''}
          onChange={(e) => handlePestDataChange('ant', 'other', e.target.value)}
          className="h-10"
        />
      </div>
    </div>
  );

  const renderCockroachForm = (): React.ReactElement => (
    <div className="space-y-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
      <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
        <input
          type="checkbox"
          className="w-5 h-5 text-primary rounded"
          checked={reportState.cockroach?.apply_gel ?? false}
          onChange={(e) =>
            handlePestDataChange('cockroach', 'apply_gel', e.target.checked)
          }
        />
        <span className="font-medium">หยอดเหยื่อ (Gel Bait)</span>
      </label>
      <div className="pt-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          รายละเอียดอื่นๆ
        </label>
        <Input
          type="text"
          placeholder="ระบุจุดที่พบหรือการดำเนินการอื่นๆ..."
          value={reportState.cockroach?.other || ''}
          onChange={(e) =>
            handlePestDataChange('cockroach', 'other', e.target.value)
          }
          className="h-10"
        />
      </div>
    </div>
  );

  const renderLizardForm = (): React.ReactElement => (
    <div className="space-y-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
      <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
        <input
          type="checkbox"
          className="w-5 h-5 text-primary rounded"
          checked={reportState.lizard?.place_traps ?? false}
          onChange={(e) =>
            handlePestDataChange('lizard', 'place_traps', e.target.checked)
          }
        />
        <span className="font-medium">วางบ้านดักจิ้งจก แมลงคลาน</span>
      </label>
      <div className="pt-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          รายละเอียดอื่นๆ
        </label>
        <Input
          type="text"
          placeholder="ระบุจุดที่พบหรือการดำเนินการอื่นๆ..."
          value={reportState.lizard?.other || ''}
          onChange={(e) =>
            handlePestDataChange('lizard', 'other', e.target.value)
          }
          className="h-10"
        />
      </div>
    </div>
  );

  const renderRatForm = (): React.ReactElement => (
    <div className="space-y-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
          <input
            type="checkbox"
            className="w-5 h-5 text-primary rounded"
            checked={reportState.rat?.glue_traps ?? false}
            onChange={(e) =>
              handlePestDataChange('rat', 'glue_traps', e.target.checked)
            }
          />
          <span className="font-medium">วางถาดกาว</span>
        </label>
        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
          <input
            type="checkbox"
            className="w-5 h-5 text-primary rounded"
            checked={reportState.rat?.mechanical_traps ?? false}
            onChange={(e) =>
              handlePestDataChange('rat', 'mechanical_traps', e.target.checked)
            }
          />
          <span className="font-medium">วางเครื่องดักหนู</span>
        </label>
        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
          <input
            type="checkbox"
            className="w-5 h-5 text-primary rounded"
            checked={reportState.rat?.bait_stations ?? false}
            onChange={(e) =>
              handlePestDataChange('rat', 'bait_stations', e.target.checked)
            }
          />
          <span className="font-medium">วางสถานีดักหนู</span>
        </label>
        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
          <input
            type="checkbox"
            className="w-5 h-5 text-primary rounded"
            checked={reportState.rat?.refill_bait ?? false}
            onChange={(e) =>
              handlePestDataChange('rat', 'refill_bait', e.target.checked)
            }
          />
          <span className="font-medium">เติมเหยื่อสถานีดักหนู</span>
        </label>
      </div>
      <div className="pt-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          รายละเอียดอื่นๆ
        </label>
        <Input
          type="text"
          placeholder="ระบุจุดที่พบหรือการดำเนินการอื่นๆ..."
          value={reportState.rat?.other || ''}
          onChange={(e) => handlePestDataChange('rat', 'other', e.target.value)}
          className="h-10"
        />
      </div>
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
        <div className="flex justify-between w-full">
          <div className="text-sm text-slate-500 flex items-center">
            * กรุณาตรวจสอบข้อมูลก่อนบันทึก
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 transition-all"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              form="service-report-form"
              className="py-2.5 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              {submitButtonText}
            </button>
            {isAdmin && isPending && (
              <button
                type="button"
                onClick={handleApprove}
                className="py-2.5 px-5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                อนุมัติรายงาน
              </button>
            )}
          </div>
        </div>
      }
    >
      <form
        id="service-report-form"
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <DocumentIcon className="w-5 h-5 text-primary" />
              ข้อมูลงานบริการ
            </h3>
            <StatusBadge status={reportState.status || JobStatus.Draft} />
          </div>
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <dt className="text-slate-500 mb-1">ลูกค้า</dt>
              <dd className="font-semibold text-slate-900 text-base">
                {(job as any).customerName || (job as any).customer_name}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 mb-1">วันที่สร้าง</dt>
              <dd className="font-semibold text-slate-900">
                {formatThaiDate(reportState.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 mb-1">เวลาเข้า</dt>
              <dd className="font-semibold text-slate-900">
                {reportState.check_in_time || '-'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 mb-1">เวลาออก</dt>
              <dd className="font-semibold text-slate-900">
                {reportState.check_out_time || '-'}
              </dd>
            </div>

            <div className="col-span-2 md:col-span-2">
              <dt className="text-slate-500 mb-1">ช่างเทคนิค</dt>
              <dd className="font-semibold text-slate-900">
                {job.technicians.length > 0
                  ? job.technicians
                    .map(
                      (t) =>
                        t.name ||
                        (t as any).first_name + ' ' + (t as any).last_name
                    )
                    .join(', ')
                  : 'ไม่มีช่างเทคนิค'}
              </dd>
            </div>
          </div>
        </div>

        {/* Reference Document Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50/50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2.5">
              <div className="p-1.5 bg-white border border-slate-200 rounded-md text-blue-600 shadow-sm">
                <DocumentIcon className="w-4 h-4" />
              </div>
              เอกสารอ้างอิง
            </h3>
          </div>
          <div className="p-6 flex flex-col gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                ใบเสนอราคา
              </label>
              <SearchableSelect
                value={reportState.quotation_id || ''}
                onChange={(value) =>
                  setReportState((prev) => ({ ...prev, quotation_id: value }))
                }
                onSearchChange={handleQuotationSearch}
                options={quotations.map((q) => ({
                  value: q.id,
                  label: `${q.code} ${q.customer_name ? `- ${q.customer_name}` : ''} (${formatThaiDate(q.created_at)})`,
                }))}
                placeholder="ค้นหาใบเสนอราคา (พิมพ์เพื่อค้นหา)"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                แนบหลักฐานการเซ็นใบเสนอราคา
              </label>
              {!quotationFile && !reportState.quotation_url ? (
                <label
                  htmlFor="quotation-file-upload"
                  className="flex flex-col items-center justify-center w-full px-4 py-8 border-2 border-slate-200 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-blue-50/30 hover:border-blue-400 transition-all duration-200 group"
                >
                  <div className="flex flex-col items-center gap-2 text-slate-500 group-hover:text-blue-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <div className="text-center">
                      <span className="text-sm font-medium">คลิกเพื่ออัปโหลดไฟล์/รูปภาพ</span>
                      <p className="text-xs text-slate-400 mt-1">รองรับไฟล์ PDF, JPG, PNG ขนาดไม่เกิน 5MB</p>
                    </div>
                  </div>
                  <input
                    id="quotation-file-upload"
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setQuotationFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 shadow-sm rounded-lg">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-md shrink-0">
                      <DocumentIcon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col truncate">
                      {quotationFile ? (
                        <>
                          <span className="text-sm font-medium text-slate-700 truncate">{quotationFile.name}</span>
                          <span className="text-xs text-slate-500">
                            {(quotationFile.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </>
                      ) : (
                        <a href={getFileUrl(reportState.quotation_url)} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate">
                          ดูไฟล์หลักฐานเดิมที่แนบไว้
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setQuotationFile(null);
                      setReportState(prev => ({ ...prev, quotation_url: null, quotation_file_id: null }));
                    }}
                    className="shrink-0 ml-3 text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-md transition-colors focus:outline-none"
                    title="ลบไฟล์"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Info Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50/50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2.5">
              <div className="p-1.5 bg-white border border-slate-200 rounded-md text-green-600 shadow-sm">
                <CreditCardIcon className="w-4 h-4" />
              </div>
              ข้อมูลการชำระเงิน
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col">
                {job.invoice ? (
                  <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50/30 rounded-2xl border border-green-200/60 p-6 shadow-sm h-full flex flex-col justify-center">
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-green-500/5 rounded-full blur-2xl"></div>
                    <div className="relative z-10 flex flex-col gap-6">
                      <div className="flex items-center justify-between border-b border-green-200/60 pb-4">
                        <span className="text-green-800/80 font-medium text-sm">เลขที่ใบแจ้งหนี้</span>
                        <span className="bg-white text-green-700 px-3 py-1 rounded-md text-sm font-semibold shadow-sm border border-green-100">{job.invoice.code}</span>
                      </div>
                      <div>
                        <p className="text-green-700/80 text-sm mb-1.5 font-medium">ยอดชำระสุทธิ</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-green-700 tracking-tight">{job.invoice.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          <span className="text-green-700 font-medium">บาท</span>
                        </div>
                      </div>
                      {job.invoice.term && (
                        <div className="mt-2 inline-flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2 border border-green-100 w-fit">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                          <span className="text-sm font-semibold text-green-800">งวดที่ {job.invoice.term} {job.invoice.installment_id ? '(ผ่อนชำระ)' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl p-8 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 h-full min-h-[200px]">
                    <CreditCardIcon className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-sm font-medium">ไม่มีข้อมูลใบแจ้งหนี้</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-4">
                  <label className="text-sm font-bold text-slate-800">ช่องทางการชำระเงิน</label>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">(รับเงินหน้างาน)</span>
                </div>
                <div className="flex flex-col gap-5">
                  <Select
                    value={reportState.payment_condition || ''}
                    onChange={(e) => {
                      const condition = e.target.value;
                      setReportState((prev) => ({
                        ...prev,
                        payment_condition: condition as any,
                        payment_amount: condition && !prev.payment_amount && job.invoice ? job.invoice.total : (condition ? prev.payment_amount : ''),
                        payment_installment_count: job.invoice?.term || prev.payment_installment_count,
                      }));
                    }}
                    className="w-full text-sm border-slate-200 rounded-lg shadow-sm focus:border-green-500 focus:ring-green-500/20"
                  >
                    <option value="">-- ยังไม่ได้รับชำระ / วางบิล --</option>
                    <option value="CASH">เงินสด</option>
                    <option value="TRANSFER">โอนเงิน</option>
                    <option value="CREDIT_CARD">บัตรเครดิต</option>
                    <option value="CHEQUE">เช็ค</option>
                  </Select>

                  {reportState.payment_condition && (
                    <div className="flex flex-col gap-5 animate-in fade-in duration-300">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">จำนวนเงินที่รับ (บาท)</label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={reportState.payment_amount || ''}
                          onChange={(e) => setReportState((prev) => ({ ...prev, payment_amount: e.target.value }))}
                          className="w-full pl-4 pr-12 text-lg font-semibold text-green-700 border-slate-200 rounded-lg focus:border-green-500 focus:ring-green-500/20"
                        />
                      </div>

                      {reportState.payment_condition === 'TRANSFER' && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">แนบสลิปโอนเงิน</label>
                          {!paymentSlip && !reportState.payment_slip_url ? (
                            <label
                              htmlFor="payment-slip-upload"
                              className="flex flex-col items-center justify-center w-full px-4 py-6 border-2 border-green-200 border-dashed rounded-lg cursor-pointer bg-green-50/30 hover:bg-green-50/80 hover:border-green-400 transition-all duration-200 group"
                            >
                              <div className="flex flex-col items-center gap-2 text-green-600/60 group-hover:text-green-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                <div className="text-center">
                                  <span className="text-sm font-medium">คลิกเพื่ออัปโหลดสลิป</span>
                                  <p className="text-xs text-green-600/50 mt-1">รองรับไฟล์รูปภาพ JPG, PNG</p>
                                </div>
                              </div>
                              <input
                                id="payment-slip-upload"
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setPaymentSlip(e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          ) : (
                            <div className="relative inline-block w-fit border border-slate-200 rounded-xl overflow-hidden shadow-sm group">
                               <img 
                                  src={paymentSlip ? URL.createObjectURL(paymentSlip) : getFileUrl(reportState.payment_slip_url)} 
                                  alt="Payment Slip" 
                                  className="max-h-64 w-auto object-contain bg-slate-50"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x600/f8fafc/94a3b8?text=Image+Not+Found';
                                  }}
                               />
                               <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPaymentSlip(null);
                                      setReportState(prev => ({ ...prev, payment_slip_url: null, payment_slip_file_id: null }));
                                    }}
                                    className="px-3 py-1.5 bg-white text-red-500 rounded-lg text-sm font-semibold hover:bg-red-50 shadow-sm flex items-center gap-2 transform scale-95 group-hover:scale-100 transition-transform"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    ลบสลิป
                                  </button>
                               </div>
                            </div>
                          )}
                        </div>
                      )}
                      {reportState.payment_amount && (
                        <div className="flex items-center gap-2 text-xs font-medium text-green-600 bg-green-50/50 px-3 py-2 rounded-md border border-green-100">
                          <CheckCircleIcon className="w-4 h-4" />
                          <span>พร้อมบันทึกยอดเงินจำนวน {Number(reportState.payment_amount).toLocaleString()} บาท เข้าระบบ</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Service Result Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
            <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-primary" />
              ผลการสำรวจและดำเนินการ
            </h3>
          </div>
          <div className="flex overflow-x-auto p-2 gap-2 bg-white border-b border-slate-100 no-scrollbar">
            {(Object.keys(pestRenderConfig) as PestType[]).map((pest) => (
              <button
                key={pest}
                type="button"
                onClick={() => setActivePestTab(pest)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all ${activePestTab === pest
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                {pestRenderConfig[pest].label}
              </button>
            ))}
          </div>
          <div className="p-6 bg-slate-50/50 min-h-[300px]">
            {pestRenderConfig[activePestTab].render()}
          </div>
        </div>

        {/* Global Service Checkboxes (Types & Actions) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="font-semibold text-slate-800 mb-3">ประเภทบริการรวม</h4>
            <div className="grid grid-cols-2 gap-y-2">
              {ALL_SERVICE_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-primary transition-colors">
                  <input
                    type="checkbox"
                    className="rounded text-primary focus:ring-primary"
                    checked={reportState.service_types?.includes(type)}
                    onChange={() => handleMultiSelect('service_types', type)}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="font-semibold text-slate-800 mb-3">การดำเนินการรวม</h4>
            <div className="grid grid-cols-2 gap-y-2">
              {ALL_SERVICE_ACTIONS.map((action) => (
                <label key={action} className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-primary transition-colors">
                  <input
                    type="checkbox"
                    className="rounded text-primary focus:ring-primary"
                    checked={reportState.service_actions?.includes(action)}
                    onChange={() => handleMultiSelect('service_actions', action)}
                  />
                  <span>{action}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Next Appointment */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            นัดหมายครั้งต่อไป
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">วันนัดหมาย</label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  className="flex-1"
                  value={reportState.next_appointment?.scheduled_at ? reportState.next_appointment.scheduled_at.substring(0, 10) : ''}
                  onChange={(e) =>
                    setReportState((prev) => ({
                      ...prev,
                      next_appointment: {
                        ...(prev.next_appointment || { notes: '', reasons: [] }),
                        scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                      },
                    }))
                  }
                />
                <Select onChange={handleDateCalculation} className="w-1/3 text-sm" defaultValue="">
                  <option value="" disabled>+ เพิ่มวัน</option>
                  <option value="30">30 วัน</option>
                  <option value="60">60 วัน</option>
                  <option value="90">90 วัน</option>
                  <option value="180">180 วัน</option>
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">เหตุผลการนัด</label>
              <div className="flex flex-wrap gap-2">
                {['ติดตามผล', 'ครบรอบบริการ', 'ฉีดปลวก', 'วางเหยื่อ', 'ตรวจเช็ค', 'ฝังสถานี'].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => handleMultiSelect('next_appointment_reasons', reason)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${reportState.next_appointment?.reasons?.includes(reason)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-primary hover:text-primary'
                      }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">หมายเหตุการนัด</label>
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
            </div>
          </div>
        </div>

        {/* Blueprint Images */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
            <DocumentIcon className="w-5 h-5 text-primary" />
            รูปภาพ Blueprint
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="blueprint-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-4 text-slate-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                  </svg>
                  <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">คลิกเพื่ออัพโหลด</span> หรือลากไฟล์มาวาง</p>
                  <p className="text-xs text-slate-500">PNG, JPG (MAX. 10MB)</p>
                </div>
                <input
                  id="blueprint-upload"
                  type="file"
                  className="hidden"
                  multiple
                  onChange={handleFileChange}
                  accept="image/*"
                />
              </label>
            </div>
            
            {/* 👇 5. แสดงรูปภาพ Blueprint เดิมที่มีในระบบ หรือที่อัปโหลดใหม่ */}
            {(selectedFiles.length > 0 || reportState.blueprint_url) && (
              <div className="space-y-3 pt-2">
                <p className="text-sm font-medium text-slate-700">รูปภาพที่แนบ</p>
                <div className="flex flex-wrap gap-4">
                  
                  {/* แสดงรูปภาพ Blueprint เดิม (ถ้ามี) โดยรองรับกรณีมีหลาย URL คั่นด้วยลูกน้ำ */}
                  {reportState.blueprint_url && reportState.blueprint_url.split(',').filter(url => url.trim() !== '').map((url, idx) => (
                    <div key={`old-img-${idx}`} className="relative w-28 h-28 rounded-xl border border-slate-200 overflow-hidden shadow-sm group bg-slate-50">
                      <img 
                         src={getFileUrl(url.trim())} 
                         alt={`blueprint-old-${idx}`} 
                         className="w-full h-full object-cover" 
                         onError={(e) => {
                           // กรณีรูปโหลดไม่ได้ จะโชว์รูป placeholder แทนไอคอนแตกๆ
                           (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/f8fafc/94a3b8?text=Not+Found';
                         }}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            const newUrls = reportState.blueprint_url!.split(',').filter((_, i) => i !== idx).join(',');
                            setReportState(prev => ({ ...prev, blueprint_url: newUrls || null }));
                          }}
                          className="p-2 bg-white text-red-500 rounded-lg hover:bg-red-50 transform scale-95 group-hover:scale-100 transition-all"
                          title="ลบรูปภาพนี้"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* แสดงรายการไฟล์ใหม่ที่กำลังจะอัปโหลด */}
                  {selectedFiles.map((file, index) => {
                    const objectUrl = URL.createObjectURL(file);
                    return (
                      <div key={`new-img-${index}`} className="relative w-28 h-28 rounded-xl border-2 border-blue-400 border-dashed overflow-hidden shadow-sm group bg-blue-50/30">
                        <img src={objectUrl} alt={`blueprint-new-${index}`} className="w-full h-full object-cover" />
                        <div className="absolute top-1 left-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                          ใหม่
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== index))}
                            className="p-2 bg-white text-red-500 rounded-lg hover:bg-red-50 transform scale-95 group-hover:scale-100 transition-all"
                            title="ยกเลิกรูปภาพนี้"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-md font-bold text-slate-800 mb-4">หมายเหตุเพิ่มเติม (Internal Note)</h3>
          <Textarea
            rows={3}
            value={reportState.notes || ''}
            onChange={(e) => setReportState((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="บันทึกข้อความถึงทีมงาน..."
          />
        </div>
      </form>
    </Modal>
  );
};