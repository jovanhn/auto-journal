import { Link, type LinkProps } from '@tanstack/react-router';

type FormPageHeaderProps = {
  title: string;
  /** Where Cancel goes. */
  cancelTo: LinkProps;
};

/** Form shell app bar (design.md, "Form" shell): Cancel · centered title. The submit button is below the fields. */
export function FormPageHeader({ title, cancelTo }: FormPageHeaderProps) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center">
      <Link
        {...cancelTo}
        className="justify-self-start py-2 text-sm text-muted-foreground hover:text-foreground"
      >
        Cancel
      </Link>
      <h1 className="text-[17px] font-semibold">{title}</h1>
    </div>
  );
}
