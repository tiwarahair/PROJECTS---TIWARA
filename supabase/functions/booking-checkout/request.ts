import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);

const isUkMobile = (value: string) => /^7\d{9}$/.test(value.replace(/\D/g, "").replace(/^44/, "").replace(/^0/, ""));

export const requestSchema = z.object({
  hold: z.object({ id: z.uuid(), secret: z.string().min(1).max(100) }),
  contact: z.object({
    first: text(60).min(1),
    last: text(60).min(1),
    email: z.email().max(254),
    phone: z.string().refine(isUkMobile),
  }),
  notes: text(500),
  allergies: text(1000),
  clearAllergies: z.boolean().default(false),
  requireCvc: z.boolean().default(false),
  address: z
    .object({
      line1: text(120).min(1),
      line2: text(120),
      town: text(80),
      postcode: text(10).min(1),
      notes: text(300),
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  turnstileToken: z.string().min(1).max(2048),
});

export type Contact = z.infer<typeof requestSchema>["contact"];
