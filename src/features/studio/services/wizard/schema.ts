import { z } from "zod";
import { getFieldFlagger } from "../../../../utils/validation";
import { parseNumber } from "../../core/format";

export interface WizardValues {
  name: string;
  typeId: string;
  price: string;
  durationHours: string;
  durationMinutes: string;
}

interface WizardChecks {
  isDetails: boolean;
  isPricing: boolean;
}

export const getWizardSchema = ({ isDetails, isPricing }: WizardChecks) =>
  z
    .object({
      name: z.string(),
      typeId: z.string(),
      price: z.string(),
      durationHours: z.string(),
      durationMinutes: z.string(),
    })
    .superRefine((values, context) => {
      const flag = getFieldFlagger(context);

      if (isDetails && !values.name.trim()) flag("name", "Name this service.");

      if (isDetails && !values.typeId)
        flag("typeId", "Choose the service type.");

      if (isPricing && !(parseNumber(values.price) > 0))
        flag("price", "Enter a price.");

      const minutes =
        parseNumber(values.durationHours) * 60 +
        parseNumber(values.durationMinutes);

      if (isPricing && !(minutes > 0))
        flag("durationHours", "Add how long it takes.");
    });
