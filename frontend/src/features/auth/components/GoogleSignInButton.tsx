import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { FormErrorAlert } from '@/shared/ui/FormErrorAlert';
import { GoogleIcon } from './GoogleIcon';

type GoogleSignInButtonProps = {
  /** Starts the Google sign-in (leaves the app); a rejected promise is shown as an error. */
  onSignIn: () => Promise<unknown>;
};

export function GoogleSignInButton({ onSignIn }: GoogleSignInButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const handleClick = async () => {
    setPending(true);
    setError(undefined);
    try {
      // On success the browser leaves for Google, so the button stays disabled.
      await onSignIn();
    } catch {
      setError('Could not start Google sign-in. Check your connection and try again.');
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <FormErrorAlert message={error} />
      <Button type="button" variant="outline" size="lg" disabled={pending} onClick={() => void handleClick()}>
        <GoogleIcon />
        Continue with Google
      </Button>
    </div>
  );
}
