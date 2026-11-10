import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { Issue, IssueOutcome } from '@/shared/api/generated/model';
import { applyServerErrors } from '@/shared/lib/form';
import { Button } from '@/shared/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/shared/ui/field';
import { FormErrorAlert } from '@/shared/ui/FormErrorAlert';
import { Input } from '@/shared/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/sheet';
import { ISSUE_OUTCOMES, OUTCOME_CHIP_LABELS } from '../issues';
import {
  RESOLVE_ISSUE_FORM_FIELDS,
  resolveIssueFormSchema,
  todayIso,
  type ResolveIssueFormValues,
} from '../schemas';
import { ChipSelector } from './ChipSelector';

type ResolveIssueSheetProps = {
  issue: Issue;
  /** Performs the mutation; a rejected promise (e.g. ApiError) is mapped onto the form. */
  onResolve: (values: ResolveIssueFormValues) => Promise<unknown>;
};

/**
 * Resolve issue (design board *Resolve issue (sheet)*): a bottom sheet with Outcome chips (default Fixed) and
 * Date resolved (default today), opened by the outline Resolve issue button of Edit issue (BR-IS3). The Expense
 * control of the mock comes in v11.
 */
export function ResolveIssueSheet({ issue, onResolve }: ResolveIssueSheetProps) {
  const [open, setOpen] = useState(false);
  const form = useForm<{ outcome: IssueOutcome; resolvedOn: string }, unknown, ResolveIssueFormValues>({
    resolver: zodResolver(resolveIssueFormSchema(issue.noticedOn)),
    defaultValues: { outcome: 'FIXED', resolvedOn: todayIso() },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await onResolve(values);
      setOpen(false);
    } catch (error) {
      applyServerErrors(error, form.setError, RESOLVE_ISSUE_FORM_FIELDS);
    }
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="border-[1.5px] border-primary font-semibold text-primary"
        >
          <Check aria-hidden="true" />
          Resolve issue
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-2xl pb-6">
        <SheetHeader className="pb-0">
          <SheetTitle className="text-lg font-semibold">Resolve issue</SheetTitle>
          <SheetDescription>{issue.title}</SheetDescription>
        </SheetHeader>
        <form onSubmit={(event) => void submit(event)} noValidate aria-label="Resolve issue" className="px-4">
          <FieldGroup>
            <FormErrorAlert message={form.formState.errors.root?.server?.message} />
            <Controller
              name="outcome"
              control={form.control}
              render={({ field, fieldState }) => (
                <FieldSet data-invalid={fieldState.invalid}>
                  <FieldLegend variant="label">Outcome</FieldLegend>
                  <ChipSelector
                    options={ISSUE_OUTCOMES}
                    labels={OUTCOME_CHIP_LABELS}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </FieldSet>
              )}
            />
            <Controller
              name="resolvedOn"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="issue-resolved-on">Date resolved</FieldLabel>
                  <Input {...field} id="issue-resolved-on" type="date" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Resolving…' : 'Resolve'}
            </Button>
          </FieldGroup>
        </form>
      </SheetContent>
    </Sheet>
  );
}
