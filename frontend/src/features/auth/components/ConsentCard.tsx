import { Button } from '@/shared/ui/button';
import { FormErrorAlert } from '@/shared/ui/FormErrorAlert';

type ConsentCardProps = {
  clientName: string;
  email: string;
  pending: boolean;
  errorMessage?: string;
  onApprove: () => void;
  onDeny: () => void;
};

/** What the assistant asks for, and the Approve / Deny decision (specs/assistant-mcp.md, AC 5). */
export function ConsentCard({
  clientName,
  email,
  pending,
  errorMessage,
  onApprove,
  onDeny,
}: ConsentCardProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {clientName} wants to access your autojournal
        </h1>
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>
      <p className="text-sm">
        {clientName} gets full access to your autojournal data: it can read, add, change and delete your
        vehicles, expenses and planned expenses. You can disconnect it in {clientName} at any time.
      </p>
      <FormErrorAlert message={errorMessage} />
      <div className="flex flex-col gap-2">
        <Button size="lg" disabled={pending} onClick={onApprove}>
          Approve
        </Button>
        <Button size="lg" variant="outline" disabled={pending} onClick={onDeny}>
          Deny
        </Button>
      </div>
    </div>
  );
}
