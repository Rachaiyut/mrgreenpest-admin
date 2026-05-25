import React, { useEffect, useRef, useState } from 'react';

/**
 * Input ที่รับเฉพาะตัวเลขพร้อมจุดทศนิยม
 * — แก้ปัญหา controlled-input ที่ลบ "." ทิ้งตอน parseFloat
 *   (เช่น พิมพ์ "45." แล้ว display กลายเป็น "45" จุดหายไป)
 *
 * Strategy:
 * 1) เก็บ raw string ใน local state ตอนพิมพ์
 * 2) ใช้ ref เก็บค่าที่เพิ่ง emit เพื่อแยกว่า value ใหม่มาจาก
 *    การพิมพ์ของเราเอง หรือ parent set จากภายนอก
 * 3) Bypass Input wrapper เพื่อหลีกเลี่ยง side-effect ที่ format/strip ค่า
 */
type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> & {
  value: number | string | undefined | null;
  onChange: (value: number) => void;
  /** ทศนิยมสูงสุด (default 3) */
  maxDecimals?: number;
};

const toDraft = (v: number | string | undefined | null): string => {
  if (v === undefined || v === null || v === '') return '';
  const num = typeof v === 'number' ? v : parseFloat(String(v));
  if (!Number.isFinite(num)) return '';
  return String(num);
};

const toNumber = (v: number | string | undefined | null): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const num = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(num) ? num : null;
};

export const DecimalInput: React.FC<Props> = ({
  value,
  onChange,
  maxDecimals = 3,
  className,
  disabled,
  onBlur: propOnBlur,
  ...inputProps
}) => {
  const [draft, setDraft] = useState<string>(() => toDraft(value));
  const lastEmittedRef = useRef<number | null>(toNumber(value));

  useEffect(() => {
    const incoming = toNumber(value);
    // ถ้า value ที่เข้ามาคือค่าที่เราเพิ่ง emit → ไม่ต้อง re-sync draft
    if (incoming === lastEmittedRef.current) return;
    setDraft(toDraft(value));
    lastEmittedRef.current = incoming;
  }, [value]);

  const pattern = new RegExp(`^\\d*\\.?\\d{0,${maxDecimals}}$`);

  const emit = (num: number) => {
    lastEmittedRef.current = num;
    onChange(num);
  };

  return (
    <input
      {...inputProps}
      type="text"
      inputMode="decimal"
      disabled={disabled}
      value={draft}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '' || pattern.test(raw)) {
          setDraft(raw);
          if (raw === '' || raw === '.') {
            emit(0);
          } else {
            const num = parseFloat(raw);
            if (!Number.isNaN(num)) emit(num);
          }
        }
      }}
      onBlur={(e) => {
        const raw = draft;
        if (raw === '' || raw === '.') {
          setDraft('');
          emit(0);
        } else {
          const num = parseFloat(raw);
          if (!Number.isNaN(num)) {
            setDraft(String(num));
            lastEmittedRef.current = num;
          }
        }
        propOnBlur?.(e);
      }}
      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm h-10 ${
        disabled
          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
          : 'bg-white text-slate-900 border-slate-300'
      } ${className || ''}`}
    />
  );
};
