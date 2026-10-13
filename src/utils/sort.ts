/** Orders rows by their `sort` column. */
export const bySort = <T extends { sort: number }>(left: T, right: T) =>
  left.sort - right.sort;
