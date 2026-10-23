export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export const getText = (value: unknown, key: string) => {
  const entry = isRecord(value) ? value[key] : undefined;

  return typeof entry === "string" ? entry : "";
};

export const getNumber = (value: unknown, key: string) => {
  const entry = isRecord(value) ? value[key] : undefined;

  return typeof entry === "number" ? entry : 0;
};
