import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// App Router note: we read the raw body with `await req.text()` below, which is exactly
// what Stripe needs to verify the signature — no bodyParser config required.

async function setStatus(customer, status) {
  await sql`UPDATE users SET sub_status = ${status} WHERE stripe_customer = ${customer}`;
}

export async function POST(req) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature failed: ${err.message}` }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const obj = event.data.object;
      const customer = obj.customer;
      const status = obj.status === 'active' || obj.status === 'trialing' || obj.payment_status === 'paid'
        ? 'active' : (obj.status || 'active');
      await setStatus(customer, status === 'active' ? 'active' : status);
      break;
    }
    case 'customer.subscription.deleted': {
      await setStatus(event.data.object.customer, 'canceled');
      break;
    }
  }

  return NextResponse.json({ received: true });
}
