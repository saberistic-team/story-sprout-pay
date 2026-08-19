import { useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createTopUpCheckout } from "@/lib/payments.functions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PURSE_PACKS } from "@/lib/purse-packs";
import { cn } from "@/lib/utils";

export function TopUpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [priceId, setPriceId] = useState(PURSE_PACKS[0]!.priceId);
  const [checkingOut, setCheckingOut] = useState(false);

  const fetchClientSecret = async (): Promise<string> => {
    const result = await createTopUpCheckout({
      data: {
        priceId,
        returnUrl: `${window.location.origin}/purse/return?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Checkout could not be opened");
    return result.clientSecret;
  };


  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setCheckingOut(false);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Fill your story purse</DialogTitle>
          <DialogDescription>
            Sentences cost cents, so you top up once and write many. Your purse never expires.
          </DialogDescription>
        </DialogHeader>

        {checkingOut ? (
          <div id="checkout">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {PURSE_PACKS.map((option) => (
                <button
                  key={option.priceId}
                  type="button"
                  onClick={() => setPriceId(option.priceId)}
                  className={cn(
                    "rounded-lg border p-3 text-center transition-colors",
                    priceId === option.priceId

                      ? "border-gilt bg-gilt/10"
                      : "border-border hover:border-gilt/50",
                  )}
                >
                  <span className="block font-display text-xl font-semibold">{option.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{option.hint}</span>
                </button>
              ))}
            </div>
            <Button className="w-full" onClick={() => setCheckingOut(true)}>
              Continue to payment
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
