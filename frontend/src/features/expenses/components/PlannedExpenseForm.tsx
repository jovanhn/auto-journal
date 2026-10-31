import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { CATEGORIES, CATEGORY_LABELS } from '@/shared/lib/categories';
import { CURRENCIES } from '@/shared/lib/currency';
import { applyServerErrors } from '@/shared/lib/form';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/shared/ui/field';
import { FormErrorAlert } from '@/shared/ui/FormErrorAlert';
import { Input } from '@/shared/ui/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { Textarea } from '@/shared/ui/textarea';
import { RECURRENCE_OPTIONS, recurrenceLabel } from '../planning';
import {
  PLANNED_EXPENSE_FORM_FIELDS,
  plannedExpenseFormSchema,
  type PlannedExpenseFormInput,
  type PlannedExpenseFormValues,
} from '../schemas';

type PlannedExpenseFormProps = {
  /** Accessible name of the form, e.g. "Plan an expense". */
  label: string;
  defaultValues: PlannedExpenseFormInput;
  submitLabel: string;
  submittingLabel: string;
  /** Performs the mutation; a rejected promise (e.g. ApiError) is mapped onto the form. */
  onSubmit: (values: PlannedExpenseFormValues) => Promise<unknown>;
  /** Shown below the submit button (Edit plan: Delete). */
  footer?: ReactNode;
};

/**
 * Plan an expense / Edit plan (not designed yet; built from the Add expense form's tokens and components):
 * category, estimate + currency, due date, recurrence and note (specs/planned-expenses.md, UI notes).
 */
export function PlannedExpenseForm({
  label,
  defaultValues,
  submitLabel,
  submittingLabel,
  onSubmit,
  footer,
}: PlannedExpenseFormProps) {
  const form = useForm<PlannedExpenseFormInput, unknown, PlannedExpenseFormValues>({
    resolver: zodResolver(plannedExpenseFormSchema),
    defaultValues,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      applyServerErrors(error, form.setError, PLANNED_EXPENSE_FORM_FIELDS);
    }
  });

  const { control } = form;
  // A plan saved with another N through the API keeps its value selectable ("every N months").
  const initialRecurrence = defaultValues.recurrenceMonths;
  const recurrenceOptions = RECURRENCE_OPTIONS.some((option) => option.value === initialRecurrence)
    ? RECURRENCE_OPTIONS
    : [
        ...RECURRENCE_OPTIONS,
        { value: initialRecurrence, label: recurrenceLabel(Number(initialRecurrence)) },
      ];

  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-label={label}>
      <FieldGroup>
        <FormErrorAlert message={form.formState.errors.root?.server?.message} />
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Controller
            name="estimatedAmount.amount"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="plan-amount">Estimated amount</FieldLabel>
                <Input
                  {...field}
                  id="plan-amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  autoComplete="off"
                  className="h-14 text-3xl font-semibold tabular-nums md:text-3xl"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="estimatedAmount.currency"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="plan-currency">Currency</FieldLabel>
                <NativeSelect
                  {...field}
                  id="plan-currency"
                  className="h-14"
                  aria-invalid={fieldState.invalid}
                >
                  {CURRENCIES.map((currency) => (
                    <NativeSelectOption key={currency} value={currency}>
                      {currency}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <Controller
          name="category"
          control={control}
          render={({ field, fieldState }) => (
            <FieldSet data-invalid={fieldState.invalid}>
              <FieldLegend variant="label">Category</FieldLegend>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((category) => {
                  const selected = field.value === category;
                  return (
                    <Button
                      key={category}
                      type="button"
                      variant={selected ? 'default' : 'outline'}
                      aria-pressed={selected}
                      className={cn('h-11 justify-start', !selected && 'bg-card')}
                      onClick={() => {
                        field.onChange(category);
                      }}
                      onBlur={field.onBlur}
                    >
                      {CATEGORY_LABELS[category]}
                    </Button>
                  );
                })}
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </FieldSet>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="dueDate"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="plan-due-date">Due date</FieldLabel>
                <Input {...field} id="plan-due-date" type="date" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="recurrenceMonths"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="plan-recurrence">Repeats</FieldLabel>
                <NativeSelect {...field} id="plan-recurrence" aria-invalid={fieldState.invalid}>
                  {recurrenceOptions.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <Controller
          name="note"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="plan-note">Note (optional)</FieldLabel>
              <Textarea
                {...field}
                id="plan-note"
                rows={3}
                placeholder="e.g. renewal"
                className="resize-none"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? submittingLabel : submitLabel}
        </Button>
        {footer}
      </FieldGroup>
    </form>
  );
}
