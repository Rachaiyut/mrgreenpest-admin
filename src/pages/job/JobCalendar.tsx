// ===== React =====
import { useMemo, useState } from "react";

// ===== External Libraries =====
import { Button } from "antd";

// ===== Types =====
import { FieldJob } from "@/src/types";

// ===== Assets =====
import { ChevronLeftIcon, ChevronRightIcon } from "@/src/assets/icons/Icons";

const JobCalendar: React.FC<{
  jobs: FieldJob[];
  onJobClick: (job: FieldJob) => void;
}> = ({ jobs, onJobClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };
  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };
  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  const monthYearString = currentDate.toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
  });

  const daysOfWeek = [
    'อาทิตย์',
    'จันทร์',
    'อังคาร',
    'พุธ',
    'พฤหัสฯ',
    'ศุกร์',
    'เสาร์',
  ];

  const calendarGrid = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid = [];

    // Days from previous month
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    for (let i = 0; i < firstDayOfMonth; i++) {
      const date = new Date(
        year,
        month - 1,
        daysInPrevMonth - firstDayOfMonth + 1 + i
      );
      grid.push({ date, isCurrentMonth: false, isToday: false });
    }

    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const isToday = date.getTime() === today.getTime();
      grid.push({ date, isCurrentMonth: true, isToday });
    }

    // Days from next month
    const gridEndIndex = grid.length;
    const remainingCells = 7 - (gridEndIndex % 7);
    if (remainingCells < 7) {
      for (let i = 1; i <= remainingCells; i++) {
        const date = new Date(year, month + 1, i);
        grid.push({ date, isCurrentMonth: false, isToday: false });
      }
    }

    return grid;
  }, [currentDate]);

  const getJobStatusStyle = (status: string) => {
    const statusUpper = String(status || '').toUpperCase();
    if (statusUpper === 'IN_PROGRESS' || statusUpper === 'INPROGRESS')
      return 'bg-amber-50 text-amber-700 border-l-amber-500';
    if (statusUpper === 'COMPLETED' || statusUpper === 'COMPLETE')
      return 'bg-green-50 text-green-700 border-l-green-500';
    if (statusUpper === 'CANCELLED')
      return 'bg-red-50 text-red-600 border-l-red-500';
    if (statusUpper === 'PENDING' || statusUpper === 'PLANNED')
      return 'bg-blue-50 text-blue-700 border-l-blue-500';
    return 'bg-primary/5 text-primary border-l-primary';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Calendar Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800">
            {monthYearString}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrevMonth}
            variant="link"
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 h-auto"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </Button>
          <Button
            onClick={handleGoToToday}
            className="text-sm font-semibold text-slate-600 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm h-auto"
          >
            วันนี้
          </Button>
          <Button
            onClick={handleNextMonth}
            variant="link"
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 h-auto"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden">
          {/* Day Headers */}
          {daysOfWeek.map((day, i) => (
            <div
              key={day}
              className={`text-center py-3 text-sm font-semibold uppercase tracking-wider ${i === 0 ? 'bg-red-50/50 text-red-400' : i === 6 ? 'bg-blue-50/50 text-blue-400' : 'bg-slate-50 text-slate-500'}`}
            >
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarGrid.map((day, index) => {
            const jobsOnDay = jobs
              .filter((job) => {
                const jobDate = new Date(job.start_time);
                return (
                  jobDate.getFullYear() === day.date.getFullYear() &&
                  jobDate.getMonth() === day.date.getMonth() &&
                  jobDate.getDate() === day.date.getDate()
                );
              })
              .sort(
                (a, b) =>
                  new Date(a.start_time).getTime() -
                  new Date(b.start_time).getTime()
              );

            const dayOfWeek = day.date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            return (
              <div
                key={index}
                className={`relative min-h-[120px] p-2 flex flex-col ${
                  day.isCurrentMonth
                    ? isWeekend
                      ? 'bg-slate-50/50'
                      : 'bg-white'
                    : 'bg-slate-100/50'
                } ${day.isToday ? 'ring-2 ring-primary ring-inset' : ''}`}
              >
                <time
                  dateTime={day.date.toISOString().substring(0, 10)}
                  className={`text-sm font-semibold mb-1 ${
                    day.isToday
                      ? 'bg-primary text-white rounded-full h-7 w-7 flex items-center justify-center mx-auto'
                      : day.isCurrentMonth
                        ? dayOfWeek === 0
                          ? 'text-red-400'
                          : dayOfWeek === 6
                            ? 'text-blue-400'
                            : 'text-slate-700'
                        : 'text-slate-300'
                  }`}
                >
                  {day.date.getDate()}
                </time>
                <div className="flex-grow overflow-y-auto space-y-1 scrollbar-thin">
                  {jobsOnDay.slice(0, 3).map((job) => (
                    <div
                      key={job.id}
                      onClick={() => onJobClick(job)}
                      className={`px-2 py-1 rounded text-xs cursor-pointer hover:shadow-sm transition-shadow border-l-2 ${getJobStatusStyle(job.api_status || job.status)}`}
                    >
                      <p className="font-semibold truncate">
                        <span className="text-[10px] opacity-70 mr-1">
                          {new Date(job.start_time)
                            .toTimeString()
                            .substring(0, 5)}
                        </span>
                        {job.customerName}
                      </p>
                    </div>
                  ))}
                  {jobsOnDay.length > 3 && (
                    <div className="text-xs text-center text-slate-400 font-medium pt-1">
                      +{jobsOnDay.length - 3} งาน
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default JobCalendar