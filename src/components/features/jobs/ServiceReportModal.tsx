import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { Textarea, Input, Select } from '../../common/FormControls';
import { FieldJob, ServiceReport } from '@/src/types/entity/field-job.interface';
import { User, UserRole } from '@/src/types/entity/core.interface';
import { Product } from '@/src/types/entity/product.interface';
import { JobStatus } from '@/src/types/enums/job';
import { PaymentMethod } from '@/src/types/enums/financial';
import { formatThaiDate } from '../../../utils/date';
import { StatusBadge } from '../../common/StatusBadge';
import { Assessment } from '@/src/types';
import { 
  CalendarIcon, 
  DocumentIcon, 
  CheckCircleIcon,
  CreditCardIcon
} from '../../../assets/icons/Icons';

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
  currentUser: User;
  contracts: any[]; // Changed from Contract[] to any[] or remove import if unused. Contract was imported.
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
  const [reportState, setReportState] = useState<Partial<ServiceReport>>({});
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');

  const [activePestTab, setActivePestTab] = useState<PestType>('termite');

  const selectedAssessment = useMemo(() => {
    return assessments?.find((a) => a.id === selectedAssessmentId);
  }, [assessments, selectedAssessmentId]);

  const packageMapByName = useMemo(
    () =>
      new Map(
        (products || []).filter((p: any) => p.type === 'บริการ' || p.category?.type === 'SERVICE').map((p) => [p.name, p])
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
      (j) => j.contract_id === c.id && (j.status as unknown as JobStatus) === JobStatus.Completed
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
    if (isOpen && job) {
      let initialReport: Partial<ServiceReport>;

      if (job.service_report) {
        const r = job.service_report;
        const d = r.service_report_pest_detail || {};

        const types: string[] = [];
        if (r.is_service_termite) types.push('กำจัดปลวก');
        if (r.is_service_ant_roach) { types.push('กำจัดมด'); types.push('กำจัดแมลงสาบ'); }
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
          const purposes = r.next_service_purpose.split(',').map(s => s.trim());
          purposes.forEach(p => {
            if (!nextReasons.includes(p)) nextReasons.push(p);
          });
        }

        initialReport = {
          ...r,
          service_types: types,
          service_actions: actions,
          check_in_time: r.time_in,
          check_out_time: r.time_out,
          next_appointment: {
            notes: r.work_note || '',
            reasons: nextReasons,
            scheduled_at: r.next_service_schedule,
          },
          ant: {
            apply_gel: d.ant_bait,
            other: d.pest_other
          },
          cockroach: {
            apply_gel: d.roach_bait,
            other: d.pest_other
          },
          rat: {
            glue_traps: d.rat_glue_trap,
            mechanical_traps: d.rat_mechanical_trap,
            bait_stations: d.rat_bait_station,
            refill_bait: d.rat_refill_bait,
            other: d.pest_other
          },
          lizard: {
            place_traps: d.lizard_trap,
            other: d.pest_other
          },
          termite: {
            status: d.termite_status || (r.is_service_termite ? 'present' : 'absent'),
            actions: {
              installStations: { 
                enabled: r.is_op_station, 
                count: d.termite_install_stations_count 
              },
              addBait: { 
                enabled: r.is_op_refill, 
                count: d.termite_add_bait_count 
              },
              foundTermites: {
                enabled: d.termite_found_enabled,
                count: d.termite_found_count
              },
              placeBoxes: {
                enabled: d.termite_place_boxes_enabled,
                count: d.termite_place_boxes_count,
                area: d.termite_place_boxes_area
              },
              injectPipes: { 
                enabled: r.is_op_chemical, 
                count: d.termite_inject_pipes_count 
              },
              injectSoil: { enabled: r.is_op_underground },
              sprayGarden: { enabled: r.is_op_spray },
              changeWood: { enabled: d.termite_change_wood },
              changeLid: { enabled: d.termite_change_lid },
              addFocusBait: { enabled: d.termite_add_focus_bait },
              injectShaft: { enabled: d.termite_inject_shaft },
              sprayBio: { enabled: d.termite_spray_bio },
              aroundBuilding: { enabled: d.termite_around_building },
              inShaft: { enabled: d.termite_in_shaft },
              insideBuilding: { enabled: d.termite_inside_building },
              other: d.termite_other
            }
          }
        };
      } else {
        initialReport = {
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
      report_date: new Date().toISOString(),
      customer_name: (job as any).customerName || (job as any).customer_name,

      is_service_termite: reportState.service_types?.includes('กำจัดปลวก'),
      is_service_ant_roach: reportState.service_types?.some(t => ['กำจัดมด', 'กำจัดแมลงสาบ'].includes(t)),
      is_service_rodent: reportState.service_types?.includes('กำจัดหนู'),
      is_service_mosquito: reportState.service_types?.includes('กำจัดยุง'),
      service_other: reportState.service_types?.includes('กำจัดอื่นๆ') ? 'Other' : null,

      time_in: reportState.check_in_time,
      time_out: reportState.check_out_time,

      is_op_station: reportState.service_actions?.includes('ฝังสถานี') ||
        reportState.termite?.actions?.installStations?.enabled,

      is_op_refill: reportState.service_actions?.includes('เติมเหยื่อ') ||
        reportState.termite?.actions?.addBait?.enabled ||
        reportState.rat?.refill_bait,

      is_op_chemical: reportState.service_actions?.includes('อัดน้ำยา') ||
        reportState.termite?.actions?.injectPipes?.enabled ||
        reportState.termite?.actions?.injectShaft?.enabled,

      is_op_check: reportState.service_actions?.includes('ตรวจเช็ค'),

      is_op_underground: reportState.termite?.actions?.injectSoil?.enabled,

      is_op_renew: reportState.service_actions?.includes('ต่อสัญญา'),

      is_op_spray: reportState.termite?.actions?.sprayGarden?.enabled ||
        reportState.termite?.actions?.sprayBio?.enabled ||
        reportState.termite?.actions?.aroundBuilding?.enabled ||
        reportState.termite?.actions?.insideBuilding?.enabled,

      is_op_fogging: reportState.service_actions?.includes('พ่นหมอกควัน'),

      is_op_gel: reportState.ant?.apply_gel || reportState.cockroach?.apply_gel,

      is_op_powder: reportState.service_actions?.includes('โรยผง'),

      is_op_bait: reportState.rat?.bait_stations, 

      is_op_trap: reportState.lizard?.place_traps ||
        reportState.rat?.glue_traps ||
        reportState.rat?.mechanical_traps,

      op_other: null,

      work_note: reportState.notes,
      next_service_schedule: reportState.next_appointment?.scheduled_at,
      next_service_purpose: reportState.next_appointment?.reasons?.join(', '),
      is_next_refill: reportState.next_appointment?.reasons?.includes('เติมเหยื่อ') || reportState.next_appointment?.reasons?.includes('วางเหยื่อ'),
      is_next_chemical: reportState.next_appointment?.reasons?.includes('ฉีดปลวก'),
      is_next_check: reportState.next_appointment?.reasons?.includes('ตรวจเช็ค'),
      is_next_underground: reportState.next_appointment?.reasons?.includes('อัดลงดิน'),
      is_next_renew: reportState.next_appointment?.reasons?.includes('ครบรอบบริการ'),

      pest_detail: {
        ant_bait: reportState.ant?.apply_gel || false,
        roach_bait: reportState.cockroach?.apply_gel || false,
        rat_glue_trap: reportState.rat?.glue_traps || false,
        rat_mechanical_trap: reportState.rat?.mechanical_traps || false,
        rat_bait_station: reportState.rat?.bait_stations || false,
        rat_refill_bait: reportState.rat?.refill_bait || false,
        lizard_trap: reportState.lizard?.place_traps || false,
        pest_other: reportState.ant?.other || reportState.cockroach?.other || reportState.rat?.other || reportState.lizard?.other,
        
        termite_status: reportState.termite?.status,
        termite_install_stations_count: reportState.termite?.actions?.installStations?.count,
        termite_add_bait_count: reportState.termite?.actions?.addBait?.count,
        termite_found_enabled: reportState.termite?.actions?.foundTermites?.enabled,
        termite_found_count: reportState.termite?.actions?.foundTermites?.count,
        termite_place_boxes_enabled: reportState.termite?.actions?.placeBoxes?.enabled,
        termite_place_boxes_count: reportState.termite?.actions?.placeBoxes?.count,
        termite_place_boxes_area: reportState.termite?.actions?.placeBoxes?.area,
        termite_inject_pipes_count: reportState.termite?.actions?.injectPipes?.count,
        termite_change_wood: reportState.termite?.actions?.changeWood,
        termite_change_lid: reportState.termite?.actions?.changeLid,
        termite_add_focus_bait: reportState.termite?.actions?.addFocusBait,
        termite_inject_shaft: reportState.termite?.actions?.injectShaft,
        termite_spray_bio: reportState.termite?.actions?.sprayBio,
        termite_around_building: reportState.termite?.actions?.aroundBuilding,
        termite_in_shaft: reportState.termite?.actions?.inShaft,
        termite_inside_building: reportState.termite?.actions?.insideBuilding,
        termite_other: reportState.termite?.actions?.other,
      },
    } as ServiceReport;
    onSubmit(job.id, finalReportData, finalStatus);
  };

  const handleApprove = () => {
    const finalReportData = {
      ...reportState,
      status: JobStatus.Completed,
    } as ServiceReport;
    onSubmit(job.id, finalReportData, finalStatus);
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
      : `บันทึกรายงานบริการ: ${job.code || 'N/A'}`;

  const isAdmin = currentUser.role === UserRole.ADMIN;
  const isPending = reportState.status === JobStatus.PendingApproval;
  const isDraft = reportState.status === JobStatus.Draft;

  const submitButtonText = isDraft ? 'ส่งเพื่ออนุมัติ' : 'บันทึกการเปลี่ยนแปลง';

  const renderTermiteForm = (): React.ReactElement => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 mb-4 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
        <span className="text-sm font-semibold text-yellow-800 w-full">สถานะปลวก:</span>
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
             <h6 className="font-semibold text-slate-700 mb-3 border-b pb-2">ระบบสถานี/เหยื่อ</h6>
             <div className="space-y-3">
                <label className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={!!reportState.termite?.actions?.installStations?.enabled} onChange={(e) => handleTermiteActionChange('installStations', 'enabled', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                    <span>ฝังสถานี</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <input type="number" placeholder="0" className="w-16 h-8 text-center border rounded" value={reportState.termite?.actions?.installStations?.count || ''} onChange={(e) => handleTermiteActionChange('installStations', 'count', e.target.value ? parseInt(e.target.value) : undefined)} />
                     <span className="text-xs text-slate-500">จุด</span>
                  </div>
                </label>
                <label className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={!!reportState.termite?.actions?.addBait?.enabled} onChange={(e) => handleTermiteActionChange('addBait', 'enabled', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                    <span>เติมเหยื่อ</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <input type="number" placeholder="0" className="w-16 h-8 text-center border rounded" value={reportState.termite?.actions?.addBait?.count || ''} onChange={(e) => handleTermiteActionChange('addBait', 'count', e.target.value ? parseInt(e.target.value) : undefined)} />
                     <span className="text-xs text-slate-500">กล่อง</span>
                  </div>
                </label>
                <label className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={!!reportState.termite?.actions?.foundTermites?.enabled} onChange={(e) => handleTermiteActionChange('foundTermites', 'enabled', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                    <span>พบปลวกกินเหยื่อ</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <input type="number" placeholder="0" className="w-16 h-8 text-center border rounded" value={reportState.termite?.actions?.foundTermites?.count || ''} onChange={(e) => handleTermiteActionChange('foundTermites', 'count', e.target.value ? parseInt(e.target.value) : undefined)} />
                     <span className="text-xs text-slate-500">กล่อง</span>
                  </div>
                </label>
                 <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!reportState.termite?.actions?.changeWood} onChange={(e) => handleTermiteActionChange('changeWood', 'enabled', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                    <span>เปลี่ยนไม้สถานี</span>
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!reportState.termite?.actions?.changeLid} onChange={(e) => handleTermiteActionChange('changeLid', 'enabled', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                    <span>เปลี่ยนฝาสถานี</span>
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!reportState.termite?.actions?.addFocusBait} onChange={(e) => handleTermiteActionChange('addFocusBait', 'enabled', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                    <span>เติมสาร focus</span>
                </label>
             </div>
          </div>

          {/* Chemical/Spray Section */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <h6 className="font-semibold text-slate-700 mb-3 border-b pb-2">ระบบน้ำยา/สเปรย์</h6>
             <div className="space-y-3">
               <label className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={!!reportState.termite?.actions?.injectPipes?.enabled} onChange={(e) => handleTermiteActionChange('injectPipes', 'enabled', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                    <span>อัดเข้าท่อ</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <input type="number" placeholder="0" className="w-16 h-8 text-center border rounded" value={reportState.termite?.actions?.injectPipes?.count || ''} onChange={(e) => handleTermiteActionChange('injectPipes', 'count', e.target.value ? parseInt(e.target.value) : undefined)} />
                     <span className="text-xs text-slate-500">จุด</span>
                  </div>
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!reportState.termite?.actions?.injectSoil} onChange={(e) => handleTermiteActionChange('injectSoil', 'enabled', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                    <span>อัดลงดินรอบบ้าน</span>
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!reportState.termite?.actions?.injectShaft} onChange={(e) => handleTermiteActionChange('injectShaft', 'enabled', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                    <span>อัดเข้าช่องชาร์ป</span>
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!reportState.termite?.actions?.sprayGarden} onChange={(e) => handleTermiteActionChange('sprayGarden', 'enabled', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                    <span>สเปรย์สวน</span>
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!reportState.termite?.actions?.sprayBio} onChange={(e) => handleTermiteActionChange('sprayBio', 'enabled', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                    <span>สเปรย์น้ำยาชีวภาพ</span>
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!reportState.termite?.actions?.aroundBuilding} onChange={(e) => handleTermiteActionChange('aroundBuilding', 'enabled', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                    <span>รอบอาคาร</span>
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!reportState.termite?.actions?.insideBuilding} onChange={(e) => handleTermiteActionChange('insideBuilding', 'enabled', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                    <span>ภายในอาคาร</span>
                </label>
             </div>
          </div>

          {/* Box Placement */}
          <div className="col-span-1 md:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <h6 className="font-semibold text-slate-700 mb-3 border-b pb-2">การวางกล่อง (Termite Box)</h6>
             <div className="flex flex-wrap items-end gap-4">
                <label className="flex items-center gap-2 mb-2">
                  <input type="checkbox" checked={!!reportState.termite?.actions?.placeBoxes?.enabled} onChange={(e) => handleTermiteActionChange('placeBoxes', 'enabled', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                  <span>วางกล่อง</span>
                </label>
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">จำนวน:</span>
                     <input type="number" placeholder="0" className="w-16 h-8 text-center border rounded" value={reportState.termite?.actions?.placeBoxes?.count || ''} onChange={(e) => handleTermiteActionChange('placeBoxes', 'count', e.target.value ? parseInt(e.target.value) : undefined)} />
                </div>
                <div className="flex items-center gap-2 flex-1 mb-2">
                    <span className="text-sm">บริเวณ:</span>
                    <Input type="text" className="h-8 flex-1" placeholder="เช่น ใต้ซิงค์, ห้องเก็บของ" value={reportState.termite?.actions?.placeBoxes?.area || ''} onChange={(e) => handleTermiteActionChange('placeBoxes', 'area', e.target.value)} />
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

  const renderAntForm = (): React.ReactElement => (
    <div className="space-y-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
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
      <div className="pt-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียดอื่นๆ</label>
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
        <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียดอื่นๆ</label>
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
        <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียดอื่นๆ</label>
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
        <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียดอื่นๆ</label>
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
                    <dd className="font-semibold text-slate-900 text-base">{(job as any).customerName || (job as any).customer_name}</dd>
                </div>
                <div>
                    <dt className="text-slate-500 mb-1">วันที่สร้าง</dt>
                    <dd className="font-semibold text-slate-900">{formatThaiDate(reportState.created_at)}</dd>
                </div>
                <div>
                    <dt className="text-slate-500 mb-1">เวลาเข้า</dt>
                    <dd className="font-semibold text-slate-900">{reportState.check_in_time || '-'}</dd>
                </div>
                <div>
                    <dt className="text-slate-500 mb-1">เวลาออก</dt>
                    <dd className="font-semibold text-slate-900">{reportState.check_out_time || '-'}</dd>
                </div>
                
                <div className="col-span-2 md:col-span-2">
                    <dt className="text-slate-500 mb-1">ช่างเทคนิค</dt>
                    <dd className="font-semibold text-slate-900">
                        {job.technicians.length > 0
                        ? job.technicians
                            .map((t) => t.name || (t as any).first_name + ' ' + (t as any).last_name)
                            .join(', ')
                        : 'ไม่มีช่างเทคนิค'}
                    </dd>
                </div>
            </div>
        </div>

        {/* Payment Info Section - Moved out for better UI */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ring-1 ring-slate-100">
            {/* Header with Gradient */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2.5">
                    <div className="p-1.5 bg-white rounded-lg shadow-sm text-green-600">
                        <CreditCardIcon className="w-5 h-5" />
                    </div>
                    ข้อมูลการชำระเงิน
                 </h3>
            </div>
            
            <div className="p-6">
                <div className="flex flex-col md:flex-row gap-8 items-stretch">
                    {/* Invoice Details (if linked) */}
                    {job.invoice ? (
                        <div className="flex-1 w-full relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-white rounded-2xl transform transition-transform group-hover:scale-[1.01] duration-300 border border-green-100 shadow-sm"></div>
                            <div className="relative p-5 space-y-5">
                                <div className="flex items-center justify-between border-b border-green-100 pb-3">
                                    <span className="text-green-700 font-medium">เลขที่ใบแจ้งหนี้</span>
                                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-lg text-sm font-bold shadow-sm tracking-wide">
                                        {job.invoice.code}
                                    </span>
                                </div>
                                
                                <div>
                                    <div className="text-green-600 text-sm mb-1">ยอดชำระสุทธิ</div>
                                    <div className="flex items-end gap-2">
                                        <span className="text-3xl font-bold text-primary tracking-tight leading-none">
                                            {job.invoice.total?.toLocaleString()}
                                        </span>
                                        <span className="text-base font-medium text-green-700 pb-0.5">บาท</span>
                                    </div>
                                </div>

                                {job.invoice.term && (
                                    <div className="pt-2 flex items-center justify-between bg-green-50/50 rounded-lg p-2 border border-green-100">
                                        <span className="text-sm font-medium text-green-700">งวดการชำระ</span>
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white text-green-700 text-sm font-bold border border-green-200 shadow-sm">
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                            งวดที่ {job.invoice.term} {job.invoice.installment_id ? '(ผ่อนชำระ)' : ''}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 bg-green-50/50 rounded-2xl p-8 border-2 border-dashed border-green-200 flex flex-col items-center justify-center text-green-400 w-full min-h-[160px] gap-2">
                            <CreditCardIcon className="w-8 h-8 opacity-20" />
                            <span className="text-sm font-medium">ไม่มีข้อมูลใบแจ้งหนี้</span>
                        </div>
                    )}

                    {/* Payment Action */}
                    <div className="flex-1 w-full flex flex-col justify-center">
                        <label className="block text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                            ช่องทางการชำระเงิน <span className="text-slate-400 font-normal text-sm">(รับเงินหน้างาน)</span>
                        </label>
                        
                        <div className="space-y-4">
                            <div className="relative">
                                <Select 
                                    value={reportState.payment_condition || ''}
                                    onChange={(e) => setReportState(prev => ({ 
                                        ...prev, 
                                        payment_condition: e.target.value as any,
                                        payment_installment_count: job.invoice?.term || prev.payment_installment_count
                                    }))}
                                    className="h-14 text-base w-full pl-4 pr-10 bg-white border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-slate-900"
                                >
                                    <option value="">ยังไม่ได้รับชำระ / วางบิล</option>
                                    <option value="CASH">เงินสด</option>
                                    <option value="TRANSFER">โอนเงิน</option>
                                    <option value="CREDIT_CARD">บัตรเครดิต</option>
                                    <option value="CHEQUE">เช็ค</option>
                                </Select>
                            </div>
                            
                            <div className={`
                                transition-all duration-500 ease-in-out overflow-hidden
                                ${reportState.payment_condition ? 'max-h-20 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}
                            `}>
                                <div className="bg-green-50/80 border border-green-100 rounded-xl p-3 flex items-center gap-3 text-green-800">
                                    <div className="bg-white p-1.5 rounded-full shadow-sm">
                                        <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">บันทึกการรับชำระเงินแล้ว</p>
                                        <p className="text-xs text-green-600">ข้อมูลการเงินจะถูกอัปเดตเมื่อบันทึกรายงาน</p>
                                    </div>
                                </div>
                            </div>
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
             
             {/* Tabs Header */}
             <div className="flex overflow-x-auto p-2 gap-2 bg-white border-b border-slate-100 no-scrollbar">
                {(Object.keys(pestRenderConfig) as PestType[]).map((pest) => (
                    <button
                        key={pest}
                        type="button"
                        onClick={() => setActivePestTab(pest)}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                            activePestTab === pest
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        {pestRenderConfig[pest].label}
                    </button>
                ))}
             </div>

             {/* Tab Content */}
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
                            onChange={(e) => setReportState((prev) => ({
                                ...prev,
                                next_appointment: {
                                    ...(prev.next_appointment || { notes: '', reasons: [] }),
                                    scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                                },
                            }))}
                        />
                         <Select
                            onChange={handleDateCalculation}
                            className="w-1/3 text-sm"
                            defaultValue=""
                        >
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
                        {['ติดตามผล', 'ครบรอบบริการ', 'ฉีดปลวก', 'วางเหยื่อ', 'ตรวจเช็ค'].map((reason) => (
                            <button
                                key={reason}
                                type="button"
                                onClick={() => handleMultiSelect('next_appointment_reasons', reason)}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                                    reportState.next_appointment?.reasons?.includes(reason)
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
                        onChange={(e) => setReportState((prev) => ({
                            ...prev,
                            next_appointment: { ...(prev.next_appointment || { notes: '', reasons: [] }), notes: e.target.value },
                        }))}
                        placeholder="รายละเอียดเพิ่มเติม..."
                    />
                 </div>
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
