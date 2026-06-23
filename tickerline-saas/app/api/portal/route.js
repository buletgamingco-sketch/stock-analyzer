import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSessionUserId } from '@/lib/auth';
import { getUserById } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST() {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const user = await getUserById(uid);
  if (!user.stripe_customer) return NextResponse.json({ error: 'No billing account yet.' }, { status: 400 });

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer,
    return_url: `${process.env.APP_URL}/`,
  });

  return NextResponse.json({ url: session.url });
}
