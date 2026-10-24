import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { applyServerErrors } from '@/shared/lib/form';
import { Button } from '@/shared/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { FormErrorAlert } from '@/shared/ui/FormErrorAlert';
import { Input } from '@/shared/ui/input';
import { createTaskFormSchema, type CreateTaskFormInput, type CreateTaskFormValues } from '../schemas';

type AddTaskFormProps = {
  onSubmit: (values: CreateTaskFormValues) => Promise<unknown>;
};

const FIELDS = ['title'] as const;

export function AddTaskForm({ onSubmit }: AddTaskFormProps) {
  const form = useForm<CreateTaskFormInput, unknown, CreateTaskFormValues>({
    resolver: zodResolver(createTaskFormSchema),
    defaultValues: { title: '' },
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
    <form onSubmit={(event) => void submit(event)} noValidate aria-label="Add task">
      <FieldGroup>
        <FormErrorAlert message={form.formState.errors.root?.server?.message} />
        <Controller
          name="title"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="task-title">Task title</FieldLabel>
              <Input {...field} id="task-title" autoComplete="off" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting} className="self-start">
          {form.formState.isSubmitting ? 'Adding…' : 'Add task'}
        </Button>
      </FieldGroup>
    </form>
  );
}
