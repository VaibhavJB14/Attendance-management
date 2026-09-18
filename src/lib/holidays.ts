export interface Holiday {
  name: string;
  month: number; // 1-12
  day: number;
}

export const INDIAN_HOLIDAYS: Holiday[] = [
  { name: 'Republic Day', month: 1, day: 26 },
  { name: 'Independence Day', month: 8, day: 15 },
  { name: 'Gandhi Jayanti', month: 10, day: 2 },
  { name: 'Christmas', month: 12, day: 25 },
  { name: 'New Year', month: 1, day: 1 },
  { name: 'May Day', month: 5, day: 1 },
  // Note: Floating holidays like Diwali, Holi, Eid vary by year and usually require a dynamic calendar API.
  // We can add fixed-date holidays here.
];

export function checkIsHoliday(date: Date = new Date()): { isHoliday: boolean; name?: string } {
  // 1. Check if Sunday
  if (date.getDay() === 0) {
    return { isHoliday: true, name: 'Sunday (Weekend)' };
  }

  // 2. Check if Fixed Public Holiday
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const holiday = INDIAN_HOLIDAYS.find(h => h.month === month && h.day === day);
  if (holiday) {
    return { isHoliday: true, name: holiday.name };
  }

  return { isHoliday: false };
}
