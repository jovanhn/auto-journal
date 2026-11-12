import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { CURRENCIES } from '@/shared/lib/currency';
import { applyServerErrors } from '@/shared/lib/form';
import { cn } from '@/shared/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/shared/ui/field';
import { FormErrorAlert } from '@/shared/ui/FormErrorAlert';
import { Input } from '@/shared/ui/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { Textarea } from '@/shared/ui/textarea';
import { CATEGORIES, CATEGORY_LABELS } from '@/shared/lib/categories';
import {
  JOURNAL_ENTRY_FORM_FIELDS,
  journalEntryFormSchema,
  LOG_ENTRY_HINT,
  type JournalEntryFormInput,
  type JournalEntryFormValues,
} from '../schemas';
import { EntryKindToggle } from './EntryKindToggle';

type JournalEntryFormProps = {
  /** Accessible name of the form, e.g. "Add to journal". */
  label: string;
  defaultValues: JournalEntryFormInput;
  submitLabel: string;
  submittingLabel: string;
  /** Performs the mutation for the selected kind; a rejected promise (e.g. ApiError) is mapped onto the form. */
  onSubmit: (values: JournalEntryFormValues) => Promise<unknown>;
  /** Shown below the submit button (Edit: Delete). */
  footer?: ReactNode;
  /** Shows the Expense | Log switch (specs/journal.md); Mark as paid is always an expense. */
  kindSwitch?: boolean;
  /** Editing an expense: saving it as a log asks "Remove the cost from this entry?" first (BR-J5). */
  confirmCostRemoval?: boolean;
  /** Mark as paid: the category comes from the plan and is shown, not picked (specs/planned-expenses.md). */
  categoryLocked?: boolean;
};

/**
 * Add to journal / Edit expense / Edit log / Mark as paid (design screen 05, without the vehicle picker). Date,
 * odometer and note are kept when switching between Expense and Log.
 */
export function JournalEntryForm({
  label,
  defaultValues,
  submitLabel,
  submittingLabel,
  onSubmit,
  footer,
  kindSwitch = true,
  confirmCostRemoval = false,
  categoryLocked = false,
}: JournalEntryFormProps) {
  const form = useForm<JournalEntryFormInput, unknown, JournalEntryFormValues>({
    resolver: zodResolver(journalEntryFormSchema),
    defaultValues,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
  const { control } = form;
  const kind = useWatch({ control, name: 'kind' });
  const isExpense = kind === 'expense';
  const [pending, setPending] = useState<JournalEntryFormValues | null>(null);

  const save = async (values: JournalEntryFormValues) => {
    try {
      await onSubmit(values);
    } catch (error) {
      applyServerErrors(error, form.setError, JOURNAL_ENTRY_FORM_FIELDS);
    }
  };

  const submit = form.handleSubmit(async (values) => {
    if (confirmCostRemoval && values.kind === 'log') {
      setPending(values);
      return;
    }
    await save(values);
  });

  const confirmRemoval = () => {
    const values = pending;
    setPending(null);
    if (values) void save(values);
  };

  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-label={label}>
      <FieldGroup>
        <FormErrorAlert message={form.formState.errors.root?.server?.message} />
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

        {kindSwitch && (
          <Controller
            name="kind"
            control={control}
            render={({ field }) => (
              <EntryKindToggle
                kind={field.value}
                onChange={(next) => {
                  field.onChange(next);
                  form.clearErrors();
                }}
              />
            )}
          />
        )}

        {isExpense && (
          <>
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
              render={({ field, fieldState }) =>
                categoryLocked && field.value !== '' ? (
                  <Field>
                    <FieldLabel htmlFor="expense-category">Category</FieldLabel>
                    <Input id="expense-category" value={CATEGORY_LABELS[field.value]} readOnly />
                  </Field>
                ) : (
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
                )
              }
            />
            <Controller
              name="approximate"
              control={control}
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Checkbox
                    id="expense-approximate"
                    name={field.name}
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked === true);
                    }}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    aria-describedby="expense-approximate-hint"
                  />
                  <FieldContent>
                    <FieldLabel htmlFor="expense-approximate">Approximate</FieldLabel>
                    <FieldDescription id="expense-approximate-hint">
                      Amount or date is a best guess
                    </FieldDescription>
                  </FieldContent>
                </Field>
              )}
            />
          </>
        )}

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
                placeholder={isExpense ? 'e.g. Shell, full tank' : 'e.g. Brake noise when cold'}
                className="resize-none"
                aria-invalid={fieldState.invalid}
                aria-describedby={isExpense ? undefined : 'log-entry-hint'}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                !isExpense && <FieldDescription id="log-entry-hint">{LOG_ENTRY_HINT}</FieldDescription>
              )}
            </Field>
          )}
        />

        <Button type="submit" size="lg" disabled={form.formState.isSubmitting || pending !== null}>
          {form.formState.isSubmitting ? submittingLabel : submitLabel}
        </Button>
        {footer}
      </FieldGroup>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove the cost from this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              It becomes a log entry and no longer counts in any total. The amount and category are deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmRemoval}>
              Remove cost
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
