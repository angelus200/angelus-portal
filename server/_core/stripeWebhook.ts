import { Request, Response } from "express";
import Stripe from "stripe";
import { sendPaymentConfirmationEmail } from "./emailService";
import { updateSubscriptionPaymentStatus } from "../paymentDb";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function handleStripeWebhook(req: Request, res: Response) {
  const signature = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] Payment succeeded: ${paymentIntent.id}`);
        
        // Update subscription status
        if (paymentIntent.metadata?.subscriptionId) {
          const subscriptionId = parseInt(paymentIntent.metadata.subscriptionId);
          const stripeCustomerId = paymentIntent.customer as string;
          await updateSubscriptionPaymentStatus(
            subscriptionId,
            "paid",
            paymentIntent.id,
            stripeCustomerId
          );
          
          // Send confirmation email
          const userEmail = paymentIntent.metadata.email || paymentIntent.receipt_email;
          if (userEmail) {
            await sendPaymentConfirmationEmail(userEmail, {
              investorName: paymentIntent.metadata.customer_name || "Investor",
              bondName: "Angelus Bond 2026",
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency.toUpperCase(),
              paymentIntentId: paymentIntent.id,
              date: new Date(paymentIntent.created * 1000),
            }).catch((err) => console.error("Email send failed:", err));
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] Payment failed: ${paymentIntent.id}`);
        
        // Update subscription status
        if (paymentIntent.metadata?.subscriptionId) {
          const subscriptionId = parseInt(paymentIntent.metadata.subscriptionId);
          await updateSubscriptionPaymentStatus(
            subscriptionId,
            "failed",
            paymentIntent.id
          );
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        console.log(`[Webhook] Charge refunded: ${charge.id}`);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("[Webhook] Error processing event:", error);
    res.status(500).json({ error: error.message });
  }
}
