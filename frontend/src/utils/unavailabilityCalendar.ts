import type { EventInput } from '@fullcalendar/core';
import dayjs from 'dayjs';

import type { UnavailabilityCalendarItem } from '../types';

export function isFullDayUnavailability(startAt: string, endAt: string): boolean {
  const start = dayjs(startAt);
  const end = dayjs(endAt);
  return (
    start.isSame(start.startOf('day'), 'minute') &&
    end.isSame(end.endOf('day'), 'minute')
  );
}

function toLocalYmd(iso: string): string {
  return dayjs(iso).format('YYYY-MM-DD');
}

export function buildUnavailabilityCalendarEvents(
  items: UnavailabilityCalendarItem[],
  showProfessionalName: boolean,
): EventInput[] {
  return items.map((u) => {
    const fullDay = isFullDayUnavailability(u.startAt, u.endAt);
    const prefix = showProfessionalName ? `${u.user.name}: ` : '';
    const title = u.reason ? `${prefix}${u.reason}` : `${prefix}Indisponível`;

    return {
      id: `unavail-${u.id}`,
      title,
      start: fullDay ? toLocalYmd(u.startAt) : u.startAt,
      end: fullDay ? dayjs(u.endAt).add(1, 'day').format('YYYY-MM-DD') : u.endAt,
      allDay: fullDay,
      display: 'block',
      editable: false,
      durationEditable: false,
      overlap: true,
      backgroundColor: '#EAD4D4',
      borderColor: '#C25A4C',
      textColor: '#6E3B36',
      classNames: ['fc-unavailability'],
      extendedProps: { unavailability: u },
    };
  });
}

export function slotOverlapsUnavailability(
  start: Date,
  end: Date,
  items: UnavailabilityCalendarItem[],
): boolean {
  return items.some(
    (u) => new Date(u.startAt) < end && new Date(u.endAt) > start,
  );
}

export function filterUnavailabilityInRange(
  items: UnavailabilityCalendarItem[],
  fromIso: string,
  toIso: string,
): UnavailabilityCalendarItem[] {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  return items.filter((u) => new Date(u.startAt) < to && new Date(u.endAt) > from);
}
