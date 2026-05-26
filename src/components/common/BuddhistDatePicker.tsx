import React, { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import { offset, shift } from '@floating-ui/react';
import 'react-datepicker/dist/react-datepicker.css';

const toBuddhistYear = (year: number) => year + 543;

const CalendarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zM14.25 15h.008v.008H14.25V15zm0 2.25h.008v.008H14.25v-.008zM16.5 15h.008v.008H16.5V15zm0 2.25h.008v.008H16.5v-.008z"
    />
  </svg>
);

const BuddhistCustomInput = forwardRef<HTMLInputElement, any>(
  ({ value, onClick, onChange, placeholder, className, disabled, required, showCalendarIcon }, ref) => {
    const buddhistValue = value
      ? value.replace(/(\d{4})/, (_: string, y: string) => String(toBuddhistYear(parseInt(y))))
      : '';

    const input = (
      <input
        ref={ref}
        value={buddhistValue}
        onClick={onClick}
        onChange={onChange}
        placeholder={placeholder}
        className={`${showCalendarIcon ? 'pl-9 ' : ''}${className || ''}`}
        disabled={disabled}
        required={required}
        readOnly
      />
    );

    if (!showCalendarIcon) return input;

    return (
      <div className="relative w-full">
        <CalendarIcon />
        {input}
      </div>
    );
  }
);

BuddhistCustomInput.displayName = 'BuddhistCustomInput';

type BuddhistDatePickerProps = React.ComponentProps<typeof DatePicker> & {
  showCalendarIcon?: boolean;
};

const BuddhistDatePicker: React.FC<BuddhistDatePickerProps> = ({ showCalendarIcon = true, ...props }) => {
  return (
    <DatePicker
      {...props}
      popperPlacement="bottom-start"
      popperProps={{ middleware: [offset(5), shift({ padding: 8 })] }}
      renderCustomHeader={({
        date,
        changeYear,
        changeMonth,
        decreaseMonth,
        increaseMonth,
        prevMonthButtonDisabled,
        nextMonthButtonDisabled,
      }) => {
        const months = [
          'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
          'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
          'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
        ];

        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

        return (
          <div className="flex items-center justify-between px-2 py-1">
            <button
              type="button"
              onClick={decreaseMonth}
              disabled={prevMonthButtonDisabled}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
            >
              ‹
            </button>
            <div className="flex gap-1">
              <select
                value={date.getMonth()}
                onChange={({ target: { value } }) => changeMonth(parseInt(value))}
                className="text-sm font-medium border border-gray-200 rounded px-1 py-0.5 focus:outline-none"
              >
                {months.map((month, i) => (
                  <option key={month} value={i}>
                    {month}
                  </option>
                ))}
              </select>
              <select
                value={date.getFullYear()}
                onChange={({ target: { value } }) => changeYear(parseInt(value))}
                className="text-sm font-medium border border-gray-200 rounded px-1 py-0.5 focus:outline-none"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {toBuddhistYear(year)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={increaseMonth}
              disabled={nextMonthButtonDisabled}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
            >
              ›
            </button>
          </div>
        );
      }}
      customInput={
        <BuddhistCustomInput
          placeholder={props.placeholderText}
          className={props.className}
          disabled={props.disabled}
          required={props.required}
          showCalendarIcon={showCalendarIcon}
        />
      }
    />
  );
};

export default BuddhistDatePicker;
