import { useState, useRef, useEffect, type FC } from 'react';

interface TruncateTextProps {
  text: string;
  maxWidth?: number;
  className?: string;
}

/**
 * แสดงข้อความแบบ truncate (...) เมื่อยาวเกิน
 * - Hover แสดง tooltip ข้อมูลเต็ม
 * - Click tooltip เพื่อ copy
 */
export const TruncateText: FC<TruncateTextProps> = ({ text, maxWidth = 180, className = '' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textRef.current) {
      setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
    }
  }, [text]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <span
      className="relative inline-block"
      style={{ maxWidth }}
      onMouseEnter={() => isTruncated && setShowTooltip(true)}
      onMouseLeave={() => { setShowTooltip(false); setCopied(false); }}
    >
      <span
        ref={textRef}
        className={`block overflow-hidden text-ellipsis whitespace-nowrap ${className}`}
        style={{ maxWidth }}
      >
        {text}
      </span>

      {showTooltip && (
        <div
          ref={tooltipRef}
          className="absolute z-50 bottom-full left-0 mb-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg shadow-lg max-w-xs whitespace-normal break-words cursor-pointer"
          onClick={handleCopy}
          title="คลิกเพื่อคัดลอก"
        >
          {text}
          <div className="text-xs mt-1 text-slate-300">
            {copied ? 'คัดลอกแล้ว' : 'คลิกเพื่อคัดลอก'}
          </div>
          <div className="absolute top-full left-4 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800" />
        </div>
      )}
    </span>
  );
};
