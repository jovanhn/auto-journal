import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { applyServerErrors } from '@/shared/lib/form';
import { Button } from '@/shared/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { FormErrorAlert } from '@/shared/ui/FormErrorAlert';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import {
  createProjectFormSchema,
  type CreateProjectFormInput,
  type CreateProjectFormValues,
} from '../schemas';

type CreateProjectFormProps = {
  /** Performs the mutation; a rejected promise (e.g. ApiError) is mapped onto the form. */
  onSubmit: (values: CreateProjectFormValues) => Promise<unknown>;
};

const FIELDS = ['name', 'description'] as const;

export function CreateProjectForm({ onSubmit }: CreateProjectFormProps) {
  const form = useForm<CreateProjectFormInput, unknown, CreateProjectFormValues>({
    resolver: zodResolver(createProjectFormSchema),
    defaultValues: { name: '', description: '' },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      form.reset();
    } catch (error) {
      applyServerErrors(error, form.setError, FIELDS);
    }
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-label="Create project">
      <FieldGroup>
        <FormErrorAlert message={form.formState.errors.root?.server?.message} />
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="project-name">Name</FieldLabel>
              <Input {...field} id="project-name" autoComplete="off" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="project-description">Description (optional)</FieldLabel>
              <Textarea
                {...field}
                value={field.value ?? ''}
                id="project-description"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting} className="self-start">
          {form.formState.isSubmitting ? 'Creating…' : 'Create project'}
        </Button>
      </FieldGroup>
    </form>
  );
}
