import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  createIssueBodyNoteMax,
  createIssueBodyTitleMax,
} from '@/shared/api/generated/zod/issues/issues.zod';
import { applyServerErrors } from '@/shared/lib/form';
import { Button } from '@/shared/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/shared/ui/field';
import { FormErrorAlert } from '@/shared/ui/FormErrorAlert';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { ISSUE_SEVERITIES, ISSUE_SOURCES, SEVERITY_LABELS, SOURCE_LABELS } from '../issues';
import { ISSUE_FORM_FIELDS, issueFormSchema, type IssueFormInput, type IssueFormValues } from '../schemas';
import { ChipSelector } from './ChipSelector';

type IssueFormProps = {
  /** Accessible name of the form, e.g. "New issue". */
  label: string;
  defaultValues: IssueFormInput;
  submitLabel: string;
  /** Performs the mutation; a rejected promise (e.g. ApiError) is mapped onto the form. */
  onSubmit: (values: IssueFormValues) => Promise<unknown>;
  /** Shown below the submit button (Edit issue: Resolve issue, Delete issue). */
  footer?: ReactNode;
};

/**
 * New issue / Edit issue (design boards *New issue*, *Edit issue*): title, severity and source chips, date noticed,
 * optional odometer and note with a counter (specs/issues.md, UI notes; no estimated cost).
 */
export function IssueForm({ label, defaultValues, submitLabel, onSubmit, footer }: IssueFormProps) {
  const form = useForm<IssueFormInput, unknown, IssueFormValues>({
    resolver: zodResolver(issueFormSchema),
    defaultValues,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      applyServerErrors(error, form.setError, ISSUE_FORM_FIELDS);
    }
  });

  const { control } = form;

  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-label={label}>
      <FieldGroup>
        <FormErrorAlert message={form.formState.errors.root?.server?.message} />
        <Controller
          name="title"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="issue-title">Title</FieldLabel>
              <Input
                {...field}
                id="issue-title"
                maxLength={createIssueBodyTitleMax}
                placeholder="e.g. Squeak from rear brakes"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="severity"
          control={control}
          render={({ field, fieldState }) => (
            <FieldSet data-invalid={fieldState.invalid}>
              <FieldLegend variant="label">Severity</FieldLegend>
              <ChipSelector
                options={ISSUE_SEVERITIES}
                labels={SEVERITY_LABELS}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </FieldSet>
          )}
        />

        <Controller
          name="source"
          control={control}
          render={({ field, fieldState }) => (
            <FieldSet data-invalid={fieldState.invalid}>
              <FieldLegend variant="label">Source</FieldLegend>
              <ChipSelector
                options={ISSUE_SOURCES}
                labels={SOURCE_LABELS}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </FieldSet>
          )}
        />

        <div className="grid grid-cols-2 gap-2">
          <Controller
            name="noticedOn"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="issue-noticed">Date noticed</FieldLabel>
                <Input {...field} id="issue-noticed" type="date" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="odometer"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="issue-odometer">Odometer (optional)</FieldLabel>
                <Input
                  {...field}
                  id="issue-odometer"
                  inputMode="numeric"
                  placeholder="km"
                  autoComplete="off"
                  className="font-mono tabular-nums"
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
              <FieldLabel htmlFor="issue-note">Note (optional)</FieldLabel>
              <Textarea
                {...field}
                id="issue-note"
                rows={3}
                maxLength={createIssueBodyNoteMax}
                placeholder="e.g. only when cold, first 5 min"
                className="resize-none"
                aria-invalid={fieldState.invalid}
              />
              <p className="self-end text-xs text-muted-foreground tabular-nums" aria-live="polite">
                {field.value.length} / {createIssueBodyNoteMax}
              </p>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving…' : submitLabel}
        </Button>
        {footer}
      </FieldGroup>
    </form>
  );
}
