import React, { forwardRef } from 'react';
import DatePicker, { type ReactDatePickerProps } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

/**
 * Wrapper around react-datepicker that displays years in Buddhist Era (พ.ศ.)
 * All date values remain in CE (ค.ศ.) — only the display is converted.
 */

const toBuddhistYear = (year: number) => year + 543;

const BuddhistCustomInput = forwardRef<HTMLInputElement, any>(
  ({ value, onClick, onChange, placeholder, className, disabled, required }, ref) => {
    // Convert displayed year from CE to BE
    const buddhistValue = value
      ? value.replace(/(\d{4})/, (_: string, y: string) => String(toBuddhistYear(parseInt(y))))
      : '';

    return (
      <input
        ref={ref}
        value={buddhistValue}
        onClick={onClick}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        required={required}
        readOnly
      />
    );
  }
);

BuddhistCustomInput.displayName = 'BuddhistCustomInput';

const BuddhistDatePicker: React.FC<ReactDatePickerProps> = (props) => {
  return (
    <DatePicker
      {...props}
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
        />
      }
    />
  );
};

export default BuddhistDatePicker;
