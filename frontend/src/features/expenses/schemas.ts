import { z } from 'zod';
import {
  Category,
  Currency,
  type ExpenseRequest,
  type LogEntryRequest,
  type PlannedExpenseRequest,
} from '@/shared/api/generated/model';
import {
  createExpenseBodyAmountAmountRegExp,
  createExpenseBodyNoteMax,
} from '@/shared/api/generated/zod/expenses/expenses.zod';
import {
  createPlannedExpenseBodyEstimatedAmountAmountRegExp,
  createPlannedExpenseBodyNoteMax,
} from '@/shared/api/generated/zod/planning/planning.zod';

/**
 * Journal entry forms. Inputs hold text, so this schema re-declares the fields as strings (UI-only:
 * trimming, number parsing, messages); every limit comes from the contract's generated constants. "Not in
 * the future" is checked here for quick feedback and again by the server (BR-E2).
 */
export const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export type JournalEntryKind = 'expense' | 'log';

/**
 * The Add to journal / Edit expense / Edit log form (specs/journal.md, UI notes). One form with an Expense | Log
 * switch: date, odometer and note are shared and kept when switching; amount, currency, category and approximate
 * are checked only for an expense; a log entry needs an odometer, a note or both (BR-J2, checked by the server
 * too). The output is the request for the selected kind.
 */
export const journalEntryFormSchema = z
  .object({
    kind: z.enum(['expense', 'log']),
    amount: z.object({
      amount: z
        .string()
        .trim()
        .transform((value) => value.replace(/[,\s]/g, '')),
      currency: z.enum(Currency),
    }),
    /** Empty until the user picks one. */
    category: z.union([z.enum(Category), z.literal('')]),
    date: z
      .string()
      .min(1, 'Date is required')
      .refine((value) => value <= todayIso(), 'Date cannot be in the future'),
    /** Optional; accepts `184320` and `184,320`. */
    odometer: z
      .string()
      .trim()
      .transform((value) => value.replace(/[,\s]/g, ''))
      .refine(
        (value) => value === '' || /^\d{1,9}$/.test(value),
        'Odometer must be a whole number of 0 or more',
      )
      .transform((value) => (value === '' ? null : Number(value))),
    note: z
      .string()
      .trim()
      .max(createExpenseBodyNoteMax, `Note must be at most ${createExpenseBodyNoteMax} characters`)
      .transform((value) => value || null),
    /** BR-E6: the amount and/or date is a best guess. */
    approximate: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.kind === 'log') {
      if (values.odometer === null && values.note === null) {
        ctx.addIssue({ code: 'custom', path: ['note'], message: LOG_ENTRY_HINT });
      }
      return;
    }
    if (values.amount.amount === '') {
      ctx.addIssue({ code: 'custom', path: ['amount', 'amount'], message: 'Amount is required' });
    } else if (!createExpenseBodyAmountAmountRegExp.test(values.amount.amount)) {
      ctx.addIssue({
        code: 'custom',
        path: ['amount', 'amount'],
        message: 'Enter an amount of 0 or more with at most 2 decimals',
      });
    }
    if (values.category === '') {
      ctx.addIssue({ code: 'custom', path: ['category'], message: 'Pick a category' });
    }
  })
  .transform((values): JournalEntryRequest => {
    const { date, odometer, note } = values;
    if (values.kind === 'log') return { kind: 'log', request: { date, odometer, note } };
    return {
      kind: 'expense',
      request: {
        date,
        odometer,
        note,
        amount: values.amount,
        // Checked above: an expense always has a category here.
        category: values.category as Category,
        approximate: values.approximate,
      },
    };
  });

/** BR-J2, shown under the note of a log entry. */
export const LOG_ENTRY_HINT = 'Add an odometer reading, a note, or both';

export type JournalEntryRequest =
  { kind: 'expense'; request: ExpenseRequest } | { kind: 'log'; request: LogEntryRequest };

export type JournalEntryFormInput = z.input<typeof journalEntryFormSchema>;
export type JournalEntryFormValues = z.output<typeof journalEntryFormSchema>;

/** Field names as the server reports them in `ProblemDetail.errors`. */
export const JOURNAL_ENTRY_FORM_FIELDS = [
  'amount.amount',
  'amount.currency',
  'category',
  'date',
  'odometer',
  'note',
  'approximate',
] as const;

/** Empty form values: today, the [currency] for an expense. */
export const emptyJournalEntry = (kind: JournalEntryKind, currency: Currency): JournalEntryFormInput => ({
  kind,
  amount: { amount: '', currency },
  category: '',
  date: todayIso(),
  odometer: '',
  note: '',
  approximate: false,
});

/**
 * The Plan an expense / Edit plan form (specs/planned-expenses.md, UI notes). Same text-input approach as the
 * expense form; the due date may be in the past (BR-PL5). Recurrence is a select: empty = one-time, otherwise
 * every N months (N ≥ 1, BR-PL1).
 */
export const plannedExpenseFormSchema = z.object({
  category: z
    .union([z.enum(Category), z.literal('')])
    .refine((value) => value !== '', 'Pick a category')
    .transform((value) => value),
  estimatedAmount: z.object({
    amount: z
      .string()
      .trim()
      .min(1, 'Amount is required')
      .transform((value) => value.replace(/[,\s]/g, ''))
      .refine(
        (value) => createPlannedExpenseBodyEstimatedAmountAmountRegExp.test(value),
        'Enter an amount of 0 or more with at most 2 decimals',
      ),
    currency: z.enum(Currency),
  }),
  dueDate: z.string().min(1, 'Due date is required'),
  recurrenceMonths: z
    .string()
    .refine((value) => value === '' || /^[1-9]\d*$/.test(value), 'Pick how often it repeats')
    .transform((value) => (value === '' ? null : Number(value))),
  note: z
    .string()
    .trim()
    .max(
      createPlannedExpenseBodyNoteMax,
      `Note must be at most ${createPlannedExpenseBodyNoteMax} characters`,
    )
    .transform((value) => value || null),
});

export type PlannedExpenseFormInput = z.input<typeof plannedExpenseFormSchema>;
export type PlannedExpenseFormValues = z.output<typeof plannedExpenseFormSchema>;

/** Field names as the server reports them in `ProblemDetail.errors`. */
export const PLANNED_EXPENSE_FORM_FIELDS = [
  'category',
  'estimatedAmount.amount',
  'estimatedAmount.currency',
  'dueDate',
  'recurrenceMonths',
  'note',
] as const;

export const toPlannedExpenseRequest = (values: PlannedExpenseFormValues): PlannedExpenseRequest => values;
