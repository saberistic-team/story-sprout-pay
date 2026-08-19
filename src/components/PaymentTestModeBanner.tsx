const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
        Payments are not configured for this build yet.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-border bg-accent/50 px-4 py-2 text-center text-xs text-accent-foreground">
        Payments in the preview are in test mode — use card 4242 4242 4242 4242.
      </div>
    );
  }
  return null;
}
