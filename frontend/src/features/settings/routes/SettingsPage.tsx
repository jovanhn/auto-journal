import { getRouteApi } from '@tanstack/react-router';
import { toast } from 'sonner';
import { signOut } from '@/shared/auth/session';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingState } from '@/shared/ui/LoadingState';
import { DisplayCurrencyForm } from '../components/DisplayCurrencyForm';
import { useMe } from '../hooks/useMe';
import { useUpdateDisplayCurrency } from '../hooks/useUpdateDisplayCurrency';
import type { DisplayCurrencyFormValues } from '../schemas';

const route = getRouteApi('/_app/settings');

/** Minimal settings until the design adds the screen (specs/auth.md, decision 4). */
export function SettingsPage() {
  const { session } = route.useRouteContext();
  const me = useMe();
  const updateDisplayCurrency = useUpdateDisplayCurrency();

  const handleSave = async (values: DisplayCurrencyFormValues) => {
    await updateDisplayCurrency.mutateAsync({ data: values });
    toast.success(`Totals are now shown in ${values.displayCurrency}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Preferences</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {me.isPending ? (
            <LoadingState label="Loading settings…" rows={2} />
          ) : me.isError ? (
            <ErrorState title="Could not load settings" error={me.error} onRetry={() => void me.refetch()} />
          ) : (
            <DisplayCurrencyForm displayCurrency={me.data.displayCurrency} onSubmit={handleSave} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Account</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{session.email}</span>
          </p>
          <Button variant="outline" onClick={() => void signOut()}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
