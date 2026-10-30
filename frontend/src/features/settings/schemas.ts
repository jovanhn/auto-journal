import type { z } from 'zod';
import { UpdateMeBody } from '@/shared/api/generated/zod/users/users.zod';

/** The display currency form is the contract's request body as is. */
export const displayCurrencyFormSchema = UpdateMeBody;

export type DisplayCurrencyFormValues = z.output<typeof displayCurrencyFormSchema>;
