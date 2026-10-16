import { z } from "zod";

export interface TwoFactorValues {
  name: string;
  code: string;
}

interface TwoFactorRules {
  isNaming: boolean;
  deviceNames: string[];
}

export const getTwoFactorSchema = ({ isNaming, deviceNames }: TwoFactorRules) =>
  z
    .object({ name: z.string(), code: z.string() })
    .superRefine(({ name, code }, context) => {
      const flag = (path: keyof TwoFactorValues, message: string) =>
        context.addIssue({ code: "custom", path: [path], message });

      const trimmed = name.trim().toLowerCase();

      if (isNaming && !trimmed) return flag("name", "Name this device");

      if (isNaming && deviceNames.includes(trimmed))
        return flag("name", "You already have a device with this name");

      if (code.length < 6) flag("code", "Enter the 6-digit code");
    });
