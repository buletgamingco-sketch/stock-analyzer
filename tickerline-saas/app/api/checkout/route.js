import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSessionUserId } from '@/lib/auth';
import { getUserById, sql } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST() {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const user = await getUserById(uid);
  let customer = user.stripe_customer;

  if (!customer) {
    const c = await stripe.customers.create({ email: user.email, metadata: { uid: String(uid) } });
    customer = c.id;
    await sql`UPDATE users SET stripe_customer = ${customer} WHERE id = ${uid}`;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer,
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${process.env.APP_URL}/?sub=success`,
    cancel_url: `${process.env.APP_URL}/?sub=cancel`,
  });

  return NextResponse.json({ url: session.url });
}
