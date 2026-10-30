import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { CURRENCIES } from '@/shared/lib/currency';
import { applyServerErrors } from '@/shared/lib/form';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/shared/ui/field';
import { FormErrorAlert } from '@/shared/ui/FormErrorAlert';
import { Input } from '@/shared/ui/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { Textarea } from '@/shared/ui/textarea';
import { CATEGORIES, CATEGORY_LABELS } from '../categories';
import {
  EXPENSE_FORM_FIELDS,
  expenseFormSchema,
  type ExpenseFormInput,
  type ExpenseFormValues,
} from '../schemas';

type ExpenseFormProps = {
  /** Accessible name of the form, e.g. "New expense". */
  label: string;
  defaultValues: ExpenseFormInput;
  submitLabel: string;
  submittingLabel: string;
  /** Performs the mutation; a rejected promise (e.g. ApiError) is mapped onto the form. */
  onSubmit: (values: ExpenseFormValues) => Promise<unknown>;
  /** Shown below the submit button (Edit expense: Delete). */
  footer?: ReactNode;
};

/** Add expense / Edit expense form (design screen 05, without the vehicle picker). */
export function ExpenseForm({
  label,
  defaultValues,
  submitLabel,
  submittingLabel,
  onSubmit,
  footer,
}: ExpenseFormProps) {
  const form = useForm<ExpenseFormInput, unknown, ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      applyServerErrors(error, form.setError, EXPENSE_FORM_FIELDS);
    }
  });

  const { control } = form;

  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-label={label}>
      <FieldGroup>
        <FormErrorAlert message={form.formState.errors.root?.server?.message} />
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Controller
            name="amount.amount"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="expense-amount">Amount</FieldLabel>
                <Input
                  {...field}
                  id="expense-amount"
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
            name="amount.currency"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="expense-currency">Currency</FieldLabel>
                <NativeSelect
                  {...field}
                  id="expense-currency"
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
            name="date"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="expense-date">Date</FieldLabel>
                <Input {...field} id="expense-date" type="date" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="odometer"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="expense-odometer">Odometer (km, optional)</FieldLabel>
                <Input
                  {...field}
                  id="expense-odometer"
                  inputMode="numeric"
                  placeholder="184,320"
                  autoComplete="off"
                  className="font-mono"
                  aria-invalid={fieldState.invalid}
                />
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
              <FieldLabel htmlFor="expense-note">Note (optional)</FieldLabel>
              <Textarea
                {...field}
                id="expense-note"
                rows={3}
                placeholder="e.g. Shell, full tank"
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
