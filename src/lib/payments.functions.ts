import { createServerFn } from "@tanstack/react-start";
import type Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createTopUpCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { priceId: string; returnUrl: string; environment: "sandbox" | "live" }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid pack");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    const { findPursePack } = await import("@/lib/purse-packs");
    const { resolveOrCreateCustomer } = await import("@/lib/stripe-customer.server");
    try {
      const pack = findPursePack(data.priceId);
      if (!pack) throw new Error("Unknown purse pack");

      const stripe = createStripeClient(data.environment);
      const {
        data: { user },
      } = await context.supabase.auth.getUser();

      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      const stripePrice = prices.data[0];
      if (!stripePrice) throw new Error("Price not found");

      const productId =
        typeof stripePrice.product === "string" ? stripePrice.product : stripePrice.product.id;
      const product = await stripe.products.retrieve(productId);

      const customerId = await resolveOrCreateCustomer(stripe, {
        ...(user?.email && { email: user.email }),
        userId: context.userId,
      });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        payment_intent_data: { description: product.name },
        managed_payments: { enabled: true },
        metadata: {
          userId: context.userId,
          kind: "wallet_topup",
          creditCents: String(pack.cents),
        },
      } as Stripe.Checkout.SessionCreateParams);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const finalizeTopUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sessionId: string; environment: "sandbox" | "live" }) => {
    if (!/^cs_[a-zA-Z0-9_]+$/.test(data.sessionId)) throw new Error("Invalid session");
    return data;
  })
  .handler(
    async ({ data, context }): Promise<{ balance: number; credited: number } | { error: string }> => {
      const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
      try {
        const stripe = createStripeClient(data.environment);
        const session = await stripe.checkout.sessions.retrieve(data.sessionId);

        if (session.metadata?.["userId"] !== context.userId) throw new Error("Not your payment");
        if (session.payment_status === "unpaid") return { balance: 0, credited: 0 };

        const creditCents = Number(session.metadata?.["creditCents"] ?? 0);
        const amount = (creditCents > 0 ? creditCents : (session.amount_subtotal ?? 0)) / 100;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: balance, error } = await supabaseAdmin.rpc("credit_wallet", {
          p_user_id: context.userId,
          p_amount: amount,
          p_reference: session.id,
          p_memo: "Story purse top-up",
        });
        if (error) throw error;

        return { balance: Number(balance ?? 0), credited: amount };
      } catch (error) {
        return { error: getStripeErrorMessage(error) };
      }
    },
  );
