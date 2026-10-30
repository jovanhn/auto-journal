import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import type { Currency } from '@/shared/api/generated/model';
import { CURRENCIES, CURRENCY_NAMES } from '@/shared/lib/currency';
import { applyServerErrors } from '@/shared/lib/form';
import { Button } from '@/shared/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { FormErrorAlert } from '@/shared/ui/FormErrorAlert';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { displayCurrencyFormSchema, type DisplayCurrencyFormValues } from '../schemas';

type DisplayCurrencyFormProps = {
  displayCurrency: Currency;
  /** Performs the mutation; a rejected promise (e.g. ApiError) is mapped onto the form. */
  onSubmit: (values: DisplayCurrencyFormValues) => Promise<unknown>;
};

const FIELDS = ['displayCurrency'] as const;

export function DisplayCurrencyForm({ displayCurrency, onSubmit }: DisplayCurrencyFormProps) {
  const form = useForm<DisplayCurrencyFormValues>({
    resolver: zodResolver(displayCurrencyFormSchema),
    defaultValues: { displayCurrency },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      form.reset(values);
    } catch (error) {
      applyServerErrors(error, form.setError, FIELDS);
    }
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-label="Display currency">
      <FieldGroup>
        <FormErrorAlert message={form.formState.errors.root?.server?.message} />
        <Controller
          name="displayCurrency"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="display-currency">Display currency</FieldLabel>
              <NativeSelect
                {...field}
                id="display-currency"
                className="w-full"
                aria-invalid={fieldState.invalid}
              >
                {CURRENCIES.map((currency) => (
                  <NativeSelectOption key={currency} value={currency}>
                    {currency} — {CURRENCY_NAMES[currency]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>Totals are shown in this currency.</FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Button
          type="submit"
          disabled={form.formState.isSubmitting || !form.formState.isDirty}
          className="self-start"
        >
          {form.formState.isSubmitting ? 'Saving…' : 'Save'}
        </Button>
      </FieldGroup>
    </form>
  );
}
