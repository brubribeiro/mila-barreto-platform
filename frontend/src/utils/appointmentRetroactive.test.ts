import { describe, expect, it } from 'vitest';

import { brazilDateKey, isRetroactiveAppointmentSlot } from './appointmentRetroactive';

describe('isRetroactiveAppointmentSlot', () => {
  it('treats past calendar date in Brazil as retroactive', () => {
    const today = brazilDateKey(new Date());
    const yesterday = brazilDateKey(new Date(Date.now() - 86_400_000));

    expect(today).not.toEqual(yesterday);
    expect(
      isRetroactiveAppointmentSlot({
        date: yesterday,
        startTime: '23:59',
      }),
    ).toBe(true);
  });

  it('does not treat future date as retroactive', () => {
    const future = brazilDateKey(new Date(Date.now() + 7 * 86_400_000));

    expect(
      isRetroactiveAppointmentSlot({
        date: future,
        startTime: '09:00',
      }),
    ).toBe(false);
  });
});
