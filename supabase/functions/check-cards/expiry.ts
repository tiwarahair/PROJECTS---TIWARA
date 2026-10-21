/** a card works until the end of its expiry month (UTC): it fails an appointment that starts after that. */
export const expiresBefore = (month: number, year: number, startsAt: string) =>
  Date.UTC(year, month, 1) <= Date.parse(startsAt);
