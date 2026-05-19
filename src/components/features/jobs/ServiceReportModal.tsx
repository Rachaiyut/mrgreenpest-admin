import React, { useState, useEffect, useMemo, useRef } from 'react';
import Swal from '@/src/utils/swal';
import SignatureCanvas from 'react-signature-canvas';
import DatePicker from '@/src/components/common/BuddhistDatePicker';
import { Modal } from '../../common/Modal';
import { Textarea, Input } from '../../common/FormControls';
import { DropdownSelect } from '../../common';
import {
  FieldJob,
  ServiceReport,
} from '@/src/types/entity/service-report.interface';
import { User } from '@/src/types/entity/core.interface';
import { isFieldRole, isManagementRole } from '@/src/utils/role';
import { useCurrentUser } from '@/src/hooks/useCurrentUser';
import { Product } from '@/src/types/entity/product.interface';
import { JobStatus } from '@/src/types/enums/job';
import { formatThaiDate } from '../../../utils/date';
import { StatusBadge } from '../../common/StatusBadge';
import { Quotation } from '@/src/types';
import { QuotationApi } from '@/src/api';
import { AccountApi } from '@/src/api/account';
import { Account } from '@/src/types/entity/account.interface';
import { SearchableSelect } from '../../common/SearchableSelect';
import { QRCodeSVG } from 'qrcode.react';
import {
  CalendarIcon,
  DocumentIcon,
  CheckCircleIcon,
  CreditCardIcon,
} from '../../../assets/icons/Icons';
import { QuotationStatus } from '@/src/types/enums/quotaton';
import { useData } from '@/src/contexts/DataContext';

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
  ) => void;
  finalStatus: JobStatus;
  currentUser: User;
  contracts: any[];
  products: Product[];
  jobs?: FieldJob[];
  readOnly?: boolean;
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

type PestType = 'termite' | 'ant' | 'cockroach' | 'rat' | 'lizard' | 'mosquito' | 'other';

const getFileUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
    return path;
  }
  
  const backendBaseUrl = import.meta.env?.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).replace(/\/api\/?$/, '')
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
  readOnly = false,
}) => {
  const authUser = useCurrentUser();
  const { users } = useData();
  const userById = useMemo(
    () => new Map((users || []).map((u) => [u.id, u])),
    [users],
  );

  // Collect every technician assigned to this job from every available source
  // (job.technicians + primary/secondary + job_team_members + report's nested job)
  // and dedupe by id so no one is missed regardless of which payload populated which field.
  const allAssignedTechs = useMemo(() => {
    if (!job) return [] as User[];
    const reportJob = ((job.service_report as unknown as Record<string, unknown>)?.job) as Record<string, unknown> | undefined;
    const seen = new Set<string>();
    const out: User[] = [];
    const tryAdd = (u: unknown) => {
      if (!u || typeof u !== 'object') return;
      const obj = u as Record<string, unknown>;
      const key = (obj.id as string) || `${obj.first_name || ''} ${obj.last_name || ''}`.trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(u as User);
    };
    for (const t of (job.technicians || [])) tryAdd(t);
    tryAdd(job.primary_technician);
    tryAdd(job.secondary_technician);
    for (const m of (job.job_team_members || [])) tryAdd(m);
    tryAdd(reportJob?.primary_technician);
    tryAdd(reportJob?.secondary_technician);
    for (const m of ((reportJob?.job_team_members || []) as unknown[])) tryAdd(m);
    return out;
  }, [job]);

  // Map role_type / role to a Thai label for display under each technician
  const resolveTechRole = (tech: User | undefined, fullUser: User | undefined): string => {
    const ROLE_TYPE_LABEL: Record<string, string> = {
      FIELD_LEAD: 'หัวหน้าทีมช่าง',
      FIELD_TECH: 'ช่างปฏิบัติงาน',
      MANAGEMENT: 'ผู้บริหาร',
      EXECUTIVE: 'ผู้บริหารระดับสูง',
    };
    const rt = (tech as any)?.role_type || (fullUser as any)?.role_type;
    if (rt && ROLE_TYPE_LABEL[rt]) return ROLE_TYPE_LABEL[rt];
    const role = (tech as any)?.role || (fullUser as any)?.role;
    if (typeof role === 'string') return role;
    if (role && typeof role === 'object' && (role as any).name) return (role as any).name as string;
    return '';
  };

  const [reportState, setReportState] = useState<Partial<ServiceReport & {
    payment_amount?: string | number;
    payment_slip_url?: string | null;
    quotation_url?: string | null;
    service_other_text?: string;
    pest_other_text?: string;
  }>>({});
  
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [addDaysSelection, setAddDaysSelection] = useState<string>('');
  const [customDays, setCustomDays] = useState<string>('');

  const [activePestTab, setActivePestTab] = useState<PestType>('termite');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<{ id: string; url: string }[]>([]);
  const [paymentSlip, setPaymentSlip] = useState<File | null>(null);

  const customerSigRef = useRef<SignatureCanvas>(null);
  const technicianSigRef = useRef<SignatureCanvas>(null);
  const [isCustomerSigning, setIsCustomerSigning] = useState(false);
  const [isTechSigning, setIsTechSigning] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const MAX_FILES = 5;
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB — ต้องตรงกับ backend STORAGE_MAX_FILE_SIZE

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);

      // ตรวจขนาดไฟล์ก่อนเก็บเข้า state
      const oversize = newFiles.filter((f) => f.size > MAX_FILE_SIZE_BYTES);
      if (oversize.length > 0) {
        const listText = oversize
          .map((f) => `• ${f.name} (${(f.size / 1024 / 1024).toFixed(1)} MB)`)
          .join('<br>');
        Swal.fire({
          icon: 'error',
          title: 'ไฟล์ใหญ่เกินกำหนด',
          html: `จำกัดไฟล์ละไม่เกิน 10 MB<br><br>ไฟล์ต่อไปนี้เกินขนาด:<br>${listText}`,
        });
      }
      const acceptedBySize = newFiles.filter((f) => f.size <= MAX_FILE_SIZE_BYTES);
      if (acceptedBySize.length === 0 && e.target) {
        e.target.value = '';
        return;
      }

      const totalExisting = existingImages.length;
      setSelectedFiles((prev) => {
        const combined = [...prev, ...acceptedBySize];
        const remaining = MAX_FILES - totalExisting;
        if (combined.length > remaining) {
          Swal.fire({ icon: 'warning', title: 'จำกัดจำนวนรูป', text: `อัพโหลดได้สูงสุด ${MAX_FILES} รูป (มีอยู่แล้ว ${totalExisting} รูป)` });
          return combined.slice(0, remaining);
        }
        return combined;
      });
      if (errors.blueprint_images) setErrors((prev) => ({ ...prev, blueprint_images: '' }));

      // เคลียร์ input เพื่อให้ user เลือกไฟล์เดิมได้อีกรอบ
      if (e.target) e.target.value = '';
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
    const pkg = packageMapByName.get(c.servicePackage || '');
    const visitsRequired = (pkg as unknown as Record<string, number>)?.number_of_visits ?? 0;
    if (!visitsRequired) return undefined;
    const parseDurationMonths = (text?: string) => {
      if (!text) return 12;
      const num = parseInt(text.replace(/[^\d]/g, ''), 10) || 12;
      return text.includes('ปี') ? num * 12 : num;
    };
    const durationMonths = parseDurationMonths((pkg as unknown as Record<string, string>)?.contract_duration);
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
    if (isOpen && job) {
      const fetchQuotations = async () => {
        try {
          const res = await QuotationApi.getAll({
            limit: 10,
            customer_id: job.customer_id,
            status: `${QuotationStatus.DRAFT},${QuotationStatus.PENDING_APPROVAL},${QuotationStatus.APPROVED},${QuotationStatus.SIGNED}`,
            ...(isFieldRole(authUser?.roleType) ? { created_by: currentUser.id } : {}),
          } as Record<string, unknown>);
          let list: Quotation[] = res.data || [];

          // ถ้า report มี quotation_id อยู่แล้ว ให้ fetch มาใส่ใน list ด้วย (กันกรณี status ไม่ตรง)
          const existingQId = (job.service_report as { data?: ServiceReport })?.data?.quotation_id
            || (job.service_report as ServiceReport)?.quotation_id;
          if (existingQId && !list.some((q) => q.id === existingQId)) {
            try {
              const qRes = await QuotationApi.getById(existingQId);
              const existingQ = (qRes as unknown as { data?: Quotation })?.data || qRes;
              if (existingQ?.id) list = [existingQ as Quotation, ...list];
            } catch { /* quotation might have been deleted */ }
          }

          setQuotations(list);
        } catch (error) {
          console.error('Failed to fetch quotations:', error);
        }
      };

      fetchQuotations();
    }
  }, [isOpen, job]);

  const handleQuotationSearch = async (value: string) => {
    try {
      const res = await QuotationApi.getAll({
        limit: 10,
        customer_id: job?.customer_id,
        status: `${QuotationStatus.DRAFT},${QuotationStatus.PENDING_APPROVAL},${QuotationStatus.APPROVED},${QuotationStatus.SIGNED}`,
        search: value,
        ...(isFieldRole(authUser?.roleType) ? { created_by: currentUser.id } : {}),
      } as Record<string, unknown>);
      setQuotations(res.data);
    } catch (error) {
      console.error('Failed to search quotations:', error);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const fetchAccounts = async () => {
      try {
        const res = await AccountApi.getAll({ limit: 10, is_active: true });
        setAccounts(res.data || []);
      } catch (error) {
        console.error('Failed to fetch accounts:', error);
      }
    };
    fetchAccounts();
    setSelectedAccountId('');
  }, [isOpen]);

  const handleAccountSearch = async (value: string) => {
    try {
      const res = await AccountApi.getAll({
        limit: 10,
        is_active: true,
        search: value,
      });
      setAccounts(res.data || []);
    } catch (error) {
      console.error('Failed to search accounts:', error);
    }
  };

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) || null,
    [accounts, selectedAccountId],
  );

  useEffect(() => {
    if (isOpen && job) {
      let initialReport: Partial<ServiceReport & { payment_amount?: string | number, payment_slip_url?: string, quotation_url?: string }>;

      if (job.service_report) {
        const r = (job.service_report as { data?: ServiceReport }).data || (job.service_report as ServiceReport);
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

        const serviceOtherText = r.service_other === 'Other' ? '' : (r.service_other || '');

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
          service_types: types,
          service_other_text: serviceOtherText,
          pest_other_text: d.pest_other || '',
          service_actions: actions,
          check_in_time: r.time_in || (job.actual_start_time ? new Date(job.actual_start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''),
          check_out_time: r.time_out || (job.actual_end_time ? new Date(job.actual_end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''),
          next_appointment: {
            notes: r.work_note || '',
            reasons: nextReasons,
            scheduled_at: r.next_service_schedule,
            customer_confirmed_at: (r as unknown as Record<string, string>).customer_appointment_date || null,
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
          mosquito: {
            spray_chemical: d.mosquito_spray_chemical,
            fogging: d.mosquito_fogging,
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
              injectSoil: !!r.is_op_underground,
              sprayGarden: !!r.is_op_spray,
              changeWood: !!d.termite_change_wood,
              changeLid: !!d.termite_change_lid,
              addFocusBait: !!d.termite_add_focus_bait,
              injectShaft: !!d.termite_inject_shaft,
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
          check_out_time: job.actual_end_time
            ? new Date(job.actual_end_time).toLocaleTimeString('th-TH', {
              hour: '2-digit',
              minute: '2-digit',
            })
            : '',
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
          customer_sign_name: (job as unknown as Record<string, string>).customerName || job.customer?.first_name ? `${job.customer?.first_name || ''} ${job.customer?.last_name || ''}`.trim() : '',
          technician_sign_name: job.primary_technician ? `${job.primary_technician.first_name || ''} ${job.primary_technician.last_name || ''}`.trim() : (currentUser ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() : ''),
          next_appointment: {
            notes: '',
            reasons: [],
            scheduled_at: recommendedNextIso,
            customer_confirmed_at: null,
          },
          status: JobStatus.Draft,
        };
      }

      setReportState(initialReport);

      // Pre-fill "บัญชีรับโอน" from the SR's existing payment (or from a
      // top-level account_id if the backend ever attaches one). Without this
      // the dropdown blanks out every time the user reopens the SR for edit.
      const reportForAccount = (job.service_report as { data?: ServiceReport })?.data
        || (job.service_report as ServiceReport | undefined);
      const persistedAccountId =
        reportForAccount?.account_id
        || reportForAccount?.payment?.account_id
        || '';
      setSelectedAccountId(persistedAccountId);

      // Load existing blueprint images — resolve signed URLs for entries that have id but no url
      const r = job.service_report as unknown as Record<string, unknown>;
      const reportData = (r?.data || r) as Record<string, unknown>;
      const rawImages = (reportData?.operation_images || []) as { id: string; url: string }[];
      setSelectedFiles([]);

      (async () => {
        const { StorageApi } = await import('@/src/api/storage');
        const resolved: { id: string; url: string }[] = [];
        for (const img of rawImages) {
          if (img.url) {
            resolved.push(img);
          } else if (img.id) {
            try {
              const result = await StorageApi.getSignedUrl(img.id);
              if (result?.url) resolved.push({ id: img.id, url: result.url });
            } catch {
              // skip images that can't be resolved
            }
          }
        }
        setExistingImages(resolved);
      })();
    }
  }, [isOpen, job, recommendedNextIso]);

  if (!isOpen || !job) return null;

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();

    const totalImages = existingImages.length + selectedFiles.length;
    if (totalImages < 2) {
      setErrors((prev) => ({ ...prev, blueprint_images: `กรุณาแนบรูปการปฏิบัติงานอย่างน้อย 2 รูป (ตอนนี้มี ${totalImages} รูป)` }));
      setTimeout(() => {
        const el = document.querySelector('.text-red-500.text-xs');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    let nextStatus = reportState.status || JobStatus.Draft;
    if (!isManagementRole(authUser?.roleType) && nextStatus === JobStatus.Draft) {
      nextStatus = JobStatus.PendingApproval;
    }

    const finalReportData = {
      ...reportState,
      status: nextStatus,
      job_id: job.id,
      customer_id: job.customer_id,
      // Persist "บัญชีรับโอน" through SR → backend forwards to payments.account_id
      account_id: selectedAccountId || undefined,
      payment_amount: reportState.payment_amount ? Number(reportState.payment_amount) : 0,
      report_date: new Date().toISOString(),
      customer_name: (job as unknown as Record<string, string>).customerName || (job as unknown as Record<string, string>).customer_name,

      is_service_termite: reportState.service_types?.includes('กำจัดปลวก'),
      is_service_ant_roach: reportState.service_types?.some((t) =>
        ['กำจัดมด', 'กำจัดแมลงสาบ'].includes(t)
      ),
      is_service_rodent: reportState.service_types?.includes('กำจัดหนู'),
      is_service_mosquito: reportState.service_types?.includes('กำจัดยุง'),
      service_other: reportState.service_types?.includes('กำจัดอื่นๆ')
        ? reportState.service_other_text || ''
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
        !!reportState.termite?.actions?.injectPipes?.enabled ||
        !!reportState.termite?.actions?.injectShaft,

      is_op_check: reportState.service_actions?.includes('ตรวจเช็ค'),

      is_op_underground: !!reportState.termite?.actions?.injectSoil,

      is_op_renew: reportState.service_actions?.includes('ต่อสัญญา'),

      is_op_spray: reportState.service_actions?.includes('สเปรย์') || !!reportState.termite?.actions?.sprayGarden,
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
      customer_appointment_date: reportState.next_appointment?.customer_confirmed_at || null,
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
        // มด — ส่งเฉพาะเมื่อเลือกกำจัดมด
        ...(reportState.service_types?.includes('กำจัดมด') || reportState.service_types?.some(t => ['กำจัดมด', 'กำจัดแมลงสาบ'].includes(t)) ? {
          ant_bait: reportState.ant?.apply_gel || false,
          ant_spray_bio: reportState.ant?.sprayBio || false,
          ant_around_building: reportState.ant?.aroundBuilding || false,
          ant_in_shaft: reportState.ant?.inShaft || false,
          ant_inside_building: reportState.ant?.insideBuilding || false,
        } : {}),

        // แมลงสาบ
        ...(reportState.service_types?.some(t => ['กำจัดมด', 'กำจัดแมลงสาบ'].includes(t)) ? {
          roach_bait: reportState.cockroach?.apply_gel || false,
        } : {}),

        // หนู
        ...(reportState.service_types?.includes('กำจัดหนู') ? {
          rat_glue_trap: reportState.rat?.glue_traps || false,
          rat_mechanical_trap: reportState.rat?.mechanical_traps || false,
          rat_bait_station: reportState.rat?.bait_stations || false,
          rat_refill_bait: reportState.rat?.refill_bait || false,
        } : {}),

        // จิ้งจก
        ...(reportState.service_types?.includes('กำจัดจิ้งจก') ? {
          lizard_trap: reportState.lizard?.place_traps || false,
        } : {}),

        // ยุง
        ...(reportState.service_types?.includes('กำจัดยุง') ? {
          mosquito_spray_chemical: (reportState as Record<string, Record<string, boolean>>).mosquito?.spray_chemical || false,
          mosquito_fogging: (reportState as Record<string, Record<string, boolean>>).mosquito?.fogging || false,
        } : {}),

        pest_other: reportState.pest_other_text || null,

        // ปลวก — ส่งเฉพาะเมื่อเลือกกำจัดปลวก
        ...(reportState.service_types?.includes('กำจัดปลวก') ? {
          termite_status: reportState.termite?.status,
          termite_install_stations_count:
            reportState.termite?.actions?.installStations?.count || null,
          termite_add_bait_count: reportState.termite?.actions?.addBait?.count || null,
          termite_found_enabled:
            reportState.termite?.actions?.foundTermites?.enabled || false,
          termite_found_count: reportState.termite?.actions?.foundTermites?.count || null,
          termite_place_boxes_enabled:
            reportState.termite?.actions?.placeBoxes?.enabled || false,
          termite_place_boxes_count:
            reportState.termite?.actions?.placeBoxes?.count || null,
          termite_place_boxes_area:
            reportState.termite?.actions?.placeBoxes?.area || null,
          termite_inject_pipes_count:
            reportState.termite?.actions?.injectPipes?.count || null,
          termite_change_wood: !!reportState.termite?.actions?.changeWood,
          termite_change_lid: !!reportState.termite?.actions?.changeLid,
          termite_add_focus_bait: !!reportState.termite?.actions?.addFocusBait,
          termite_inject_shaft: !!reportState.termite?.actions?.injectShaft,
          termite_other: reportState.termite?.actions?.other || null,
        } : {}),
      },
      // ลายเซ็น
      customer_signature: customerSigRef.current && !customerSigRef.current.isEmpty()
        ? customerSigRef.current.toDataURL('image/png')
        : reportState.customer_signature || undefined,
      customer_sign_name: reportState.customer_sign_name,
      technician_signature: technicianSigRef.current && !technicianSigRef.current.isEmpty()
        ? technicianSigRef.current.toDataURL('image/png')
        : reportState.technician_signature || undefined,
      technician_sign_name: reportState.technician_sign_name,
    } as ServiceReport;
    onSubmit(
      job.id,
      finalReportData,
      finalStatus,
      reportState.quotation_id,
      selectedFiles,
      paymentSlip || null,
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
          : (prev as unknown as Record<string, string[]>)[field] || [];
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
    pest: 'ant' | 'cockroach' | 'rat' | 'lizard' | 'termite' | 'mosquito',
    key: string,
    value: any
  ) => {
    setReportState((prev) => ({
      ...prev,
      [pest]: { ...((prev[pest as keyof typeof prev] as Record<string, unknown>) || {}), [key]: value },
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

      let newActionValue: unknown;
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

  const applyAddDaysToScheduled = (days: number) => {
    if (!Number.isFinite(days) || days <= 0) return;
    const base = new Date();
    base.setHours(12, 0, 0, 0);
    base.setDate(base.getDate() + days);
    setReportState((prev) => ({
      ...prev,
      next_appointment: {
        ...(prev.next_appointment || { notes: '', reasons: [] }),
        scheduled_at: base.toISOString(),
      },
    }));
  };

  const handleAddDaysSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setAddDaysSelection(value);
    if (value === 'custom') return;
    setCustomDays('');
    const days = parseInt(value, 10);
    if (!isNaN(days)) applyAddDaysToScheduled(days);
  };

  const handleCustomDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    setCustomDays(raw);
    const days = parseInt(raw, 10);
    if (!isNaN(days) && days > 0) applyAddDaysToScheduled(days);
  };

  const hasExistingReport = !!job?.service_report;
  const title = readOnly
    ? 'รายละเอียดใบรายงานบริการ'
    : finalStatus === JobStatus.Cancelled
      ? 'บันทึกเหตุผลการยกเลิก'
      : hasExistingReport
        ? 'แก้ไขใบรายงานบริการ'
        : 'บันทึกรายงานบริการ';

  const isManagement = isManagementRole(authUser?.roleType);
  const isPending = reportState.status === JobStatus.PendingApproval;
  const isDraft = reportState.status === JobStatus.Draft;

  const submitButtonText = isDraft ? 'ส่งเพื่ออนุมัติ' : 'บันทึกการเปลี่ยนแปลง';

  const renderTermiteForm = (): React.ReactElement => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 p-3 sm:p-4 bg-yellow-50 rounded-xl border border-yellow-100">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 animate-fadeIn">
          {/* Station Section */}
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
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
                  <span className="text-xs text-slate-500 w-10 text-left">จุด</span>
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
                  <span className="text-xs text-slate-500 w-10 text-left">กล่อง</span>
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
                  <span className="text-xs text-slate-500 w-10 text-left">กล่อง</span>
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
                  <span className="text-xs text-slate-500 w-10 text-left">จุด</span>
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
          <div className="col-span-1 md:col-span-2 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
            <h6 className="font-semibold text-slate-700 mb-3 border-b pb-2">
              การวางกล่อง (Termite Box)
            </h6>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <label className="flex items-center gap-2 shrink-0 h-9">
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
                <span className="text-sm">วางกล่อง</span>
              </label>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm text-slate-600">จำนวน:</span>
                <input
                  type="number"
                  placeholder="0"
                  className="w-16 h-9 text-center text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
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
              <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 min-w-0">
                <span className="text-sm text-slate-600 shrink-0">บริเวณ:</span>
                <input
                  type="text"
                  className="flex-1 min-w-0 h-9 text-sm px-3 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
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


  const renderAntForm = (): React.ReactElement => (
    <div className="space-y-4 p-3 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
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
          placeholder="กรอกจุดที่พบหรือการดำเนินการอื่นๆ..."
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
          placeholder="กรอกจุดที่พบหรือการดำเนินการอื่นๆ..."
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
          placeholder="กรอกจุดที่พบหรือการดำเนินการอื่นๆ..."
          value={reportState.lizard?.other || ''}
          onChange={(e) =>
            handlePestDataChange('lizard', 'other', e.target.value)
          }
          className="h-10"
        />
      </div>
    </div>
  );

  const renderMosquitoForm = (): React.ReactElement => (
    <div className="space-y-4 p-3 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
          <input
            type="checkbox"
            className="w-5 h-5 text-primary rounded"
            checked={reportState.mosquito?.spray_chemical ?? false}
            onChange={(e) =>
              handlePestDataChange('mosquito', 'spray_chemical', e.target.checked)
            }
          />
          <span className="font-medium">ใส่สารป้องกัน</span>
        </label>
        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
          <input
            type="checkbox"
            className="w-5 h-5 text-primary rounded"
            checked={reportState.mosquito?.fogging ?? false}
            onChange={(e) =>
              handlePestDataChange('mosquito', 'fogging', e.target.checked)
            }
          />
          <span className="font-medium">ใช้เครื่องพ่น</span>
        </label>
      </div>
    </div>
  );

  const renderRatForm = (): React.ReactElement => (
    <div className="space-y-4 p-3 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
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
          placeholder="กรอกจุดที่พบหรือการดำเนินการอื่นๆ..."
          value={reportState.rat?.other || ''}
          onChange={(e) => handlePestDataChange('rat', 'other', e.target.value)}
          className="h-10"
        />
      </div>
    </div>
  );

  const renderOtherForm = (): React.ReactElement => (
    <div className="space-y-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
      <label className="block text-sm font-medium text-slate-700 mb-1">กรอกรายละเอียด</label>
      <Textarea
        placeholder="กรอกประเภทแมลงและวิธีการดำเนินการ..."
        rows={3}
        value={reportState.pest_other_text || ''}
        onChange={(e) =>
          setReportState((prev) => ({ ...prev, pest_other_text: e.target.value }))
        }
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
    mosquito: { label: 'ยุง', render: renderMosquitoForm },
    other: { label: 'อื่นๆ', render: renderOtherForm },
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="5xl"
      footer={
        readOnly ? (
          <div className="flex justify-end w-full">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 transition-all"
            >
              ปิด
            </button>
          </div>
        ) : (
          <div className="flex justify-between items-center gap-4 w-full">
            <div className="text-sm text-slate-500">
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
              {isManagement && isPending && (
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
        )
      }
    >
      <form
        id="service-report-form"
        onSubmit={handleSubmit}
        className={`space-y-6 ${readOnly ? 'pointer-events-none opacity-70 [&_input[type=text]]:!bg-slate-100 [&_input[type=text]]:!text-slate-500 [&_input[type=text]]:!border-slate-300 [&_input[type=number]]:!bg-slate-100 [&_input[type=number]]:!text-slate-500 [&_input[type=number]]:!border-slate-300 [&_input[type=search]]:!bg-slate-100 [&_input[type=search]]:!text-slate-500 [&_input[type=search]]:!border-slate-300 [&_textarea]:!bg-slate-100 [&_textarea]:!text-slate-500 [&_textarea]:!border-slate-300 [&_select]:!bg-slate-100 [&_select]:!text-slate-500 [&_select]:!border-slate-300 [&_[ring-1]]:!bg-slate-100 [&_[ring-1]]:!text-slate-500 [&_.relative>div[class*=ring]]:!bg-slate-100 [&_.relative>div[class*=ring]]:!text-slate-500' : ''}`}
      >
        {/* Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
              <DocumentIcon className="w-5 h-5 text-primary shrink-0" />
              ข้อมูลงานบริการ
            </h3>
            <StatusBadge status={reportState.status || JobStatus.Draft} />
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-sm">
            <div>
              <dt className="text-slate-500 mb-1">ลูกค้า</dt>
              <dd className="font-semibold text-slate-900 text-base">
                {(job as unknown as Record<string, string>).customerName || (job as unknown as Record<string, string>).customer_name}
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
                {(() => {
                  const allTechs = allAssignedTechs;
                  if (allTechs.length === 0) return 'ไม่มีช่างเทคนิค';
                  return (
                    <div className="flex flex-wrap items-center gap-3">
                      {allTechs.map((t: any) => {
                        const fullUser = (t.id && userById.get(t.id)) as User | undefined;
                        const avatarUrl = fullUser?.url || t.url || null;
                        const displayName = t.name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || '-';
                        const initial = (t.nick_name || t.first_name || '?').toString().charAt(0).toUpperCase();
                        const roleLabel = resolveTechRole(t, fullUser);
                        return (
                          <div key={t.id || displayName} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full pl-1 pr-3 py-1">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={displayName}
                                className="w-7 h-7 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center border border-primary/20">
                                {initial}
                              </div>
                            )}
                            <span className="text-sm font-medium text-slate-800">{displayName}</span>
                            {roleLabel && (
                              <span className="text-[11px] font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                                {roleLabel}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </dd>
            </div>
          </div>
        </div>

        {/* Technician Photos */}
        {(() => {
          const allTechs = allAssignedTechs;
          if (allTechs.length === 0) return null;
          return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
              <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
                <DocumentIcon className="w-5 h-5 text-primary" />
                ช่างที่เข้าปฏิบัติงาน
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {allTechs.map((t: any) => {
                  const fullUser = (t.id && userById.get(t.id)) as User | undefined;
                  const avatarUrl = fullUser?.url || t.url || null;
                  const displayName = t.name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || '-';
                  const nickName = t.nick_name || fullUser?.nick_name || '';
                  const initial = (nickName || t.first_name || '?').toString().charAt(0).toUpperCase();
                  const roleLabel = resolveTechRole(t, fullUser);
                  return (
                    <div key={t.id || displayName} className="flex flex-col items-center text-center">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl object-cover border border-slate-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(avatarUrl, '_blank')}
                        />
                      ) : (
                        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-primary/10 text-primary text-3xl font-bold flex items-center justify-center border border-primary/20">
                          {initial}
                        </div>
                      )}
                      <p className="mt-2 text-sm font-semibold text-slate-800 truncate w-full">{displayName}</p>
                      {nickName && <p className="text-xs text-slate-500 truncate w-full">({nickName})</p>}
                      {roleLabel && (
                        <span className="mt-1 inline-block text-[11px] font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                          {roleLabel}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Global Service Checkboxes (Types & Actions) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="font-semibold text-slate-800 mb-3">ประเภทบริการ</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2">
              {ALL_SERVICE_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-primary transition-colors">
                  <input
                    type="checkbox"
                    className="rounded text-primary focus:ring-primary shrink-0"
                    checked={reportState.service_types?.includes(type)}
                    onChange={() => handleMultiSelect('service_types', type)}
                  />
                  <span className="whitespace-nowrap">{type}</span>
                </label>
              ))}
            </div>
            {reportState.service_types?.includes('กำจัดอื่นๆ') && (
              <input
                type="text"
                placeholder="กรอกประเภทบริการอื่นๆ..."
                value={reportState.service_other_text || ''}
                onChange={(e) => setReportState((prev) => ({ ...prev, service_other_text: e.target.value }))}
                className="mt-3 w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10"
              />
            )}
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="font-semibold text-slate-800 mb-3">การบริการ</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2">
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

        {/* Pest Detail Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4">
            <h3 className="text-sm sm:text-md font-bold text-slate-800 flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-primary shrink-0" />
              การปฏิบัติงาน การบริการ ปัญหาที่พบ และข้อเสนอแนะ
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
          <div className="p-4 sm:p-6 bg-slate-50/50">
            {pestRenderConfig[activePestTab]?.render?.() || <div className="text-slate-400 text-center py-8">เลือก tab ด้านบนเพื่อดูรายละเอียด</div>}
          </div>
        </div>

        {/* Next Appointment */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
          <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            นัดหมายครั้งต่อไป
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">นัดหมายครั้งต่อไป</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <DatePicker
                    selected={reportState.next_appointment?.scheduled_at ? new Date(reportState.next_appointment.scheduled_at) : null}
                    onChange={(date: Date | null) =>
                      setReportState((prev) => ({
                        ...prev,
                        next_appointment: {
                          ...(prev.next_appointment || { notes: '', reasons: [] }),
                          scheduled_at: date ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0).toISOString() : undefined,
                        },
                      }))
                    }
                    // minDate={new Date()}
                    dateFormat="dd/MM/yyyy"
                    locale="th"
                    placeholderText="dd/mm/yyyy"
                    portalId="root"
                    popperClassName="!z-[9999]"
                    disabled={readOnly}
                    className={`w-full pr-3 py-2 rounded-md shadow-sm focus:outline-none text-sm h-10 ${readOnly ? 'bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed' : 'bg-white border border-slate-300 focus:ring-primary focus:border-primary'}`}
                    wrapperClassName="w-full"
                  />
                </div>
                {addDaysSelection === 'custom' ? (
                  <div className="w-1/3 relative flex items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={customDays}
                      onChange={handleCustomDaysChange}
                      placeholder="กรอกวัน"
                      autoFocus
                      className="w-full text-sm pr-16 pl-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary h-10"
                    />
                    <span className="absolute right-9 text-xs text-slate-400 pointer-events-none">วัน</span>
                    <button
                      type="button"
                      onClick={() => { setAddDaysSelection(''); setCustomDays(''); }}
                      className="absolute right-2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                      title="กลับไปเลือกจากรายการ"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <DropdownSelect
                    value={addDaysSelection}
                    onChange={(v) => handleAddDaysSelect({ target: { value: v } } as React.ChangeEvent<HTMLSelectElement>)}
                    placeholder="+ เพิ่มวัน"
                    disabled={readOnly}
                    options={[
                      { value: '3', label: '3 วัน' },
                      { value: '5', label: '5 วัน' },
                      { value: '7', label: '7 วัน' },
                      { value: '15', label: '15 วัน' },
                      { value: '20', label: '20 วัน' },
                      { value: '30', label: '30 วัน' },
                      { value: '60', label: '60 วัน' },
                      { value: '90', label: '90 วัน' },
                      { value: 'custom', label: 'อื่นๆ' },
                    ]}
                    className="w-1/3 text-sm"
                  />
                )}
              </div>
              <div className="mt-5">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  วันที่ลูกค้านัดหมาย
                </label>
                <div className="relative">
                  <DatePicker
                    selected={reportState.next_appointment?.customer_confirmed_at ? new Date(reportState.next_appointment.customer_confirmed_at) : null}
                    onChange={(date: Date | null) =>
                      setReportState((prev) => ({
                        ...prev,
                        next_appointment: {
                          ...(prev.next_appointment || { notes: '', reasons: [] }),
                          customer_confirmed_at: date
                            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                            : null,
                        },
                      }))
                    }
                    // minDate={new Date()}
                    dateFormat="dd/MM/yyyy"
                    locale="th"
                    placeholderText="dd/mm/yyyy"
                    isClearable={!readOnly}
                    portalId="root"
                    popperClassName="!z-[9999]"
                    disabled={readOnly}
                    className={`w-full pr-3 py-2 rounded-md shadow-sm focus:outline-none text-sm h-10 ${readOnly ? 'bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed' : 'bg-white border border-emerald-300 focus:ring-emerald-400 focus:border-emerald-400'}`}
                    wrapperClassName="w-full"
                  />
                </div>
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
          <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
            <DocumentIcon className="w-5 h-5 text-primary" />
            รูปการปฎิบัติงาน เเละ Station <span className="text-red-500">*</span>
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="blueprint-upload"
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-colors ${(existingImages.length + selectedFiles.length) >= MAX_FILES ? 'border-slate-200 bg-slate-100 cursor-not-allowed opacity-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer'}`}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-4 text-slate-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                  </svg>
                  <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">คลิกเพื่ออัพโหลด</span> หรือลากไฟล์มาวาง</p>
                  <p className="text-xs text-slate-500">PNG, JPG (MAX. 10MB) — สูงสุด {MAX_FILES} รูป ({existingImages.length + selectedFiles.length}/{MAX_FILES})</p>
                </div>
                <input
                  id="blueprint-upload"
                  type="file"
                  className="hidden"
                  multiple
                  onChange={handleFileChange}
                  accept="image/*"
                  disabled={(existingImages.length + selectedFiles.length) >= MAX_FILES}
                />
              </label>
            </div>
            
            {/* 👇 5. แสดงรูปภาพ Blueprint เดิมที่มีในระบบ หรือที่อัปโหลดใหม่ */}
            {(selectedFiles.length > 0 || existingImages.length > 0) && (
              <div className="space-y-3 pt-2">
                <p className="text-sm font-medium text-slate-700">รูปภาพที่แนบ ({existingImages.length + selectedFiles.length}/{MAX_FILES})</p>
                <div className="flex flex-wrap gap-4">

                  {/* แสดงรูปจาก entity_type (ใหม่) */}
                  {existingImages.map((img, idx) => (
                    <div key={`existing-${img.id}`} className="relative w-28 h-28 rounded-xl border border-slate-200 overflow-hidden shadow-sm group bg-slate-50">
                      <img src={img.url} alt={`Blueprint ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const { StorageApi } = await import('@/src/api/storage');
                            await StorageApi.remove(img.id);
                            setExistingImages((prev) => prev.filter((i) => i.id !== img.id));
                          } catch (e) { console.error('Failed to delete image:', e); }
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="ลบรูปภาพนี้"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
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
            {errors.blueprint_images && <p className="text-red-500 text-xs mt-1 font-medium">{errors.blueprint_images}</p>}
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
          <h3 className="text-md font-bold text-slate-800 mb-4">หมายเหตุเพิ่มเติม</h3>
          <Textarea
            rows={3}
            value={reportState.notes || ''}
            onChange={(e) => setReportState((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="บันทึกข้อความถึงทีมงาน..."
          />
        </div>

        {/* Payment Info Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50/50 px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2.5">
              <div className="p-1.5 bg-white border border-slate-200 rounded-md text-green-600 shadow-sm">
                <CreditCardIcon className="w-4 h-4" />
              </div>
              ข้อมูลการชำระเงิน
            </h3>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
              <div className="flex flex-col gap-4">
                {/* Standalone invoice card — only when QR card is not shown */}
                {job.invoice && !(reportState.payment_condition === 'TRANSFER' && selectedAccount?.qr_code) && (
                  <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50/30 rounded-2xl border border-green-200/60 p-6 shadow-sm flex flex-col justify-center">
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
                )}
                {reportState.payment_condition === 'TRANSFER' && selectedAccount?.qr_code ? (
                  <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 rounded-2xl border border-emerald-200/60 p-5 shadow-sm h-full flex flex-col">
                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
                    {/* Header */}
                    <div className="relative flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500 text-white shadow-sm">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                        </div>
                        <span className="text-sm font-semibold text-emerald-900">สแกนเพื่อชำระ</span>
                      </div>
                      <span className="bg-white text-emerald-700 px-2.5 py-1 rounded-md text-xs font-semibold shadow-sm border border-emerald-100 max-w-[140px] truncate" title={selectedAccount.bank_name}>
                        {selectedAccount.bank_name}
                      </span>
                    </div>

                    {/* Invoice reference (when service report links to an invoice) */}
                    {job.invoice && (
                      <div className="relative mb-4 flex items-center justify-between gap-3 bg-white/70 rounded-lg px-4 py-3 border border-emerald-100 shadow-sm">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xs uppercase tracking-wider text-emerald-700/70 font-medium shrink-0">ใบแจ้งหนี้</span>
                          <span className="text-base font-bold text-emerald-800 truncate" title={job.invoice.code}>
                            {job.invoice.code}
                          </span>
                        </div>
                        {job.invoice.term && (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-100/80 text-emerald-800 px-2.5 py-1 rounded-md text-xs font-semibold shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            งวดที่ {job.invoice.term}{job.invoice.installment_id ? ' (ผ่อน)' : ''}
                          </span>
                        )}
                      </div>
                    )}

                    {/* QR with corner brackets */}
                    <div className="relative flex-1 flex items-center justify-center">
                      <div className="bg-white rounded-2xl p-4 shadow-sm relative">
                        <span className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-emerald-500 rounded-tl-md" />
                        <span className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-emerald-500 rounded-tr-md" />
                        <span className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-emerald-500 rounded-bl-md" />
                        <span className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-emerald-500 rounded-br-md" />
                        <QRCodeSVG value={selectedAccount.qr_code} size={160} level="M" />
                      </div>
                    </div>

                    {/* Account details */}
                    <div className="relative mt-4 pt-3 border-t border-emerald-200/60 space-y-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[11px] uppercase tracking-wider text-emerald-700/70 font-medium shrink-0 mt-0.5">ชื่อบัญชี</span>
                        <span className="text-sm font-semibold text-slate-800 truncate text-right" title={selectedAccount.account_name}>
                          {selectedAccount.account_name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] uppercase tracking-wider text-emerald-700/70 font-medium">เลขบัญชี</span>
                        <span className="text-sm font-mono font-semibold text-slate-700 tabular-nums">
                          {selectedAccount.account_number}
                        </span>
                      </div>
                      {(() => {
                        const amount = job.invoice?.total ?? Number(reportState.payment_amount || 0);
                        return amount > 0 ? (
                          <div className="mt-2 flex items-center justify-between bg-emerald-500 text-white rounded-lg px-3 py-2 shadow-sm">
                            <span className="text-xs font-medium">จำนวนที่ต้องชำระ</span>
                            <span className="text-base font-bold tabular-nums">
                              {Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                            </span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                ) : !job.invoice ? (
                  <div className="bg-slate-50 rounded-2xl p-8 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 h-full min-h-[200px]">
                    <CreditCardIcon className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-sm font-medium">
                      {reportState.payment_condition === 'TRANSFER'
                        ? 'เลือกบัญชีโอนเพื่อแสดง QR'
                        : 'ไม่มีข้อมูลใบแจ้งหนี้'}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-4">
                  <label className="text-sm font-bold text-slate-800">ช่องทางการชำระเงิน</label>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">(รับเงินหน้างาน)</span>
                </div>
                <div className="flex flex-col gap-5">
                  <DropdownSelect
                    value={reportState.payment_condition || ''}
                    onChange={(v) => {
                      const condition = v;
                      setReportState((prev) => ({
                        ...prev,
                        payment_condition: condition as ServiceReport['payment_condition'],
                        payment_amount: condition && !prev.payment_amount && job.invoice ? job.invoice.total : (condition ? prev.payment_amount : ''),
                        payment_installment_count: job.invoice?.term || prev.payment_installment_count,
                      }));
                    }}
                    placeholder="-- ยังไม่ได้รับชำระ / วางบิล --"
                    disabled={readOnly}
                    options={[
                      { value: 'CASH', label: 'เงินสด' },
                      { value: 'TRANSFER', label: 'โอนเงิน' },
                      { value: 'CREDIT_CARD', label: 'บัตรเครดิต' },
                      { value: 'CHEQUE', label: 'เช็ค' },
                    ]}
                    className="w-full text-sm"
                  />

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
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">บัญชีรับโอน</label>
                          <SearchableSelect
                            value={selectedAccountId}
                            onChange={(v) => setSelectedAccountId(v)}
                            onSearchChange={handleAccountSearch}
                            options={accounts.map((a) => ({
                              value: a.id,
                              label: `${a.account_number} - ${a.bank_name} (${a.account_name})`,
                            }))}
                            placeholder="ค้นหาบัญชี (พิมพ์เพื่อค้นหา)"
                            disabled={readOnly}
                            className="w-full"
                          />
                        </div>
                      )}

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
                          <span>พร้อมบันทึกยอดเงินจำนวน {Number(reportState.payment_amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท เข้าระบบ</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reference Document Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50/50 px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2.5">
              <div className="p-1.5 bg-white border border-slate-200 rounded-md text-blue-600 shadow-sm">
                <DocumentIcon className="w-4 h-4" />
              </div>
              เอกสารอ้างอิง & ลายเซ็น
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
                disabled={readOnly}
                className="w-full"
              />
            </div>

            {/* ลายเซ็นลูกค้า */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                ลายเซ็นลูกค้า
              </label>
              <div className="border-2 border-slate-200 rounded-lg overflow-hidden bg-white">
                {reportState.customer_signature && !isCustomerSigning ? (
                  <img src={reportState.customer_signature} alt="ลายเซ็นลูกค้า" className="w-full h-[160px] object-contain bg-white cursor-pointer" onClick={() => setIsCustomerSigning(true)} title="คลิกเพื่อเซ็นใหม่" />
                ) : (
                  <SignatureCanvas
                    ref={customerSigRef}
                    canvasProps={{ className: 'w-full h-[160px]' }}
                    penColor="black"
                    backgroundColor="rgb(255, 255, 255)"
                  />
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <Input
                  value={reportState.customer_sign_name || ''}
                  onChange={(e) => setReportState(prev => ({ ...prev, customer_sign_name: e.target.value }))}
                  placeholder="ชื่อผู้เซ็น (ลูกค้า)"
                  className="flex-1 mr-2"
                  disabled={readOnly}
                />
                <button
                  type="button"
                  onClick={() => {
                    customerSigRef.current?.clear();
                    setIsCustomerSigning(true);
                    setReportState(prev => ({ ...prev, customer_signature: undefined }));
                  }}
                  className="text-xs text-red-500 hover:text-red-700 px-3 py-2 border border-red-200 rounded-md hover:bg-red-50 transition-colors whitespace-nowrap"
                >
                  ล้างลายเซ็น
                </button>
              </div>
            </div>

            {/* ลายเซ็นช่างเทคนิค */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                ลายเซ็นช่างเทคนิค
              </label>
              <div className="border-2 border-slate-200 rounded-lg overflow-hidden bg-white">
                {reportState.technician_signature && !isTechSigning ? (
                  <img src={reportState.technician_signature} alt="ลายเซ็นช่างเทคนิค" className="w-full h-[160px] object-contain bg-white cursor-pointer" onClick={() => setIsTechSigning(true)} title="คลิกเพื่อเซ็นใหม่" />
                ) : (
                  <SignatureCanvas
                    ref={technicianSigRef}
                    canvasProps={{ className: 'w-full h-[160px]' }}
                    penColor="black"
                    backgroundColor="rgb(255, 255, 255)"
                  />
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <Input
                  value={reportState.technician_sign_name || ''}
                  onChange={(e) => setReportState(prev => ({ ...prev, technician_sign_name: e.target.value }))}
                  placeholder="ชื่อผู้เซ็น (ช่างเทคนิค)"
                  className="flex-1 mr-2"
                  disabled={readOnly}
                />
                <button
                  type="button"
                  onClick={() => {
                    technicianSigRef.current?.clear();
                    setIsTechSigning(true);
                    setReportState(prev => ({ ...prev, technician_signature: undefined }));
                  }}
                  className="text-xs text-red-500 hover:text-red-700 px-3 py-2 border border-red-200 rounded-md hover:bg-red-50 transition-colors whitespace-nowrap"
                >
                  ล้างลายเซ็น
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};