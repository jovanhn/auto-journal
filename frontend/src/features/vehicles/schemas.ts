import { z } from 'zod';
import { Currency, type CreateVehicleRequest } from '@/shared/api/generated/model';
import {
  createVehicleBodyMakeMax,
  createVehicleBodyModelMax,
  createVehicleBodyNicknameMax,
  createVehicleBodyPlateMax,
  createVehicleBodyPurchasePriceAmountRegExp,
  createVehicleBodyYearMin,
} from '@/shared/api/generated/zod/vehicles/vehicles.zod';

/**
 * The Add/Edit vehicle form. Inputs hold text, so this schema re-declares the fields as strings (UI-only:
 * trimming, number parsing, messages); every limit comes from the contract's generated constants. Date
 * rules that depend on "today" are checked here for quick feedback and again by the server (BR-V2, BR-V3).
 */
const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} must be at most ${max} characters`);

/** Accepts `184320` and `184,320`. */
const wholeNumber = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .transform((value) => value.replace(/[,\s]/g, ''))
    .refine((value) => /^\d{1,9}$/.test(value), `${label} must be a whole number of 0 or more`)
    .transform(Number);

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const vehicleFormSchema = z.object({
  nickname: requiredText('Nickname', createVehicleBodyNicknameMax),
  make: requiredText('Make', createVehicleBodyMakeMax),
  model: requiredText('Model', createVehicleBodyModelMax),
  year: z
    .string()
    .trim()
    .min(1, 'Year is required')
    .refine((value) => /^\d{4}$/.test(value), 'Enter a 4-digit year')
    .transform(Number)
    .refine((year) => year >= createVehicleBodyYearMin, `Year must be ${createVehicleBodyYearMin} or later`)
    .refine((year) => year <= new Date().getFullYear() + 1, 'Year cannot be later than next year'),
  plate: z
    .string()
    .trim()
    .max(createVehicleBodyPlateMax, `Plate must be at most ${createVehicleBodyPlateMax} characters`)
    .transform((value) => value || null),
  odometerAtStart: wholeNumber('Odometer'),
  purchasePrice: z.object({
    amount: z
      .string()
      .trim()
      .min(1, 'Price is required')
      .transform((value) => value.replace(/[,\s]/g, ''))
      .refine(
        (value) => createVehicleBodyPurchasePriceAmountRegExp.test(value),
        'Enter an amount of 0 or more with at most 2 decimals',
      ),
    currency: z.enum(Currency),
  }),
  purchaseDate: z
    .string()
    .min(1, 'Date bought is required')
    .refine((value) => value <= todayIso(), 'Date bought cannot be in the future'),
});

export type VehicleFormInput = z.input<typeof vehicleFormSchema>;
export type VehicleFormValues = z.output<typeof vehicleFormSchema>;

/** Field names as the server reports them in `ProblemDetail.errors`. */
export const VEHICLE_FORM_FIELDS = [
  'nickname',
  'make',
  'model',
  'year',
  'plate',
  'odometerAtStart',
  'purchasePrice.amount',
  'purchasePrice.currency',
  'purchaseDate',
] as const;

export const toVehicleRequest = (values: VehicleFormValues): CreateVehicleRequest => values;
