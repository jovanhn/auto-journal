import { zodResolver } from '@hookform/resolvers/zod';
import type { ComponentProps, ReactNode } from 'react';
import { Controller, useForm, type Control, type FieldPath } from 'react-hook-form';
import { CURRENCIES } from '@/shared/lib/currency';
import { applyServerErrors } from '@/shared/lib/form';
import { Button } from '@/shared/ui/button';
import {
  Field,
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
import {
  VEHICLE_FORM_FIELDS,
  vehicleFormSchema,
  type VehicleFormInput,
  type VehicleFormValues,
} from '../schemas';

type VehicleFormProps = {
  /** Accessible name of the form, e.g. "New vehicle". */
  label: string;
  defaultValues: VehicleFormInput;
  submitLabel: string;
  submittingLabel: string;
  /** Performs the mutation; a rejected promise (e.g. ApiError) is mapped onto the form. */
  onSubmit: (values: VehicleFormValues) => Promise<unknown>;
  /** Shown below the submit button (Edit vehicle: Delete). */
  footer?: ReactNode;
};

/** Add vehicle / Edit vehicle form (design screen 06). */
export function VehicleForm({
  label,
  defaultValues,
  submitLabel,
  submittingLabel,
  onSubmit,
  footer,
}: VehicleFormProps) {
  const form = useForm<VehicleFormInput, unknown, VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      applyServerErrors(error, form.setError, VEHICLE_FORM_FIELDS);
    }
  });

  const { control } = form;

  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-label={label}>
      <FieldGroup>
        <FormErrorAlert message={form.formState.errors.root?.server?.message} />
        <TextField control={control} name="nickname" label="Nickname" placeholder="e.g. Golf, Family car" />
        <div className="grid grid-cols-2 gap-3">
          <TextField control={control} name="make" label="Make" placeholder="Volkswagen" />
          <TextField control={control} name="model" label="Model" placeholder="Golf 7" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField control={control} name="year" label="Year" placeholder="2016" inputMode="numeric" />
          <TextField control={control} name="plate" label="Plate (optional)" placeholder="AB-123-CD" />
        </div>
        <TextField
          control={control}
          name="odometerAtStart"
          label="Current odometer (km)"
          placeholder="184,320"
          inputMode="numeric"
          description="Used as the starting point for cost per km."
        />
        <FieldSet>
          <FieldLegend>Purchase</FieldLegend>
          <FieldDescription>Shown as the car’s value for now.</FieldDescription>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <TextField
              control={control}
              name="purchasePrice.amount"
              label="Price paid"
              placeholder="8,500"
              inputMode="decimal"
            />
            <Controller
              name="purchasePrice.currency"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="vehicle-purchasePrice-currency">Currency</FieldLabel>
                  <NativeSelect
                    {...field}
                    id="vehicle-purchasePrice-currency"
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
          <TextField control={control} name="purchaseDate" label="Date bought" type="date" />
        </FieldSet>
        <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? submittingLabel : submitLabel}
        </Button>
        {footer}
      </FieldGroup>
    </form>
  );
}

type TextFieldProps = {
  control: Control<VehicleFormInput, unknown, VehicleFormValues>;
  name: Exclude<FieldPath<VehicleFormInput>, 'purchasePrice' | 'purchasePrice.currency'>;
  label: string;
  description?: string;
} & Pick<ComponentProps<typeof Input>, 'placeholder' | 'inputMode' | 'type'>;

function TextField({ control, name, label, description, ...inputProps }: TextFieldProps) {
  const id = `vehicle-${name.replace('.', '-')}`;
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input {...field} {...inputProps} id={id} autoComplete="off" aria-invalid={fieldState.invalid} />
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
