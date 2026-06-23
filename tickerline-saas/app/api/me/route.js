import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getUserById, getUsageCents } from '@/lib/db';
import { monthlyCapCents } from '@/lib/pricing';

export async function GET() {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ user: null });

  const user = await getUserById(uid);
  if (!user) return NextResponse.json({ user: null });

  const usedCents = await getUsageCents(uid);
  const capCents = monthlyCapCents();

  return NextResponse.json({
    user: { email: user.email, subStatus: user.sub_status },
    usage: {
      usedCents: Math.round(usedCents * 100) / 100,
      capCents,
      remainingCents: Math.max(0, capCents - usedCents),
    },
  });
}
