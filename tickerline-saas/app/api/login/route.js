import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserByEmail } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req) {
  const { email, password } = await req.json();
  const user = await getUserByEmail((email || '').trim().toLowerCase());
  if (!user) return NextResponse.json({ error: 'No account for that email.' }, { status: 400 });

  const ok = await bcrypt.compare(password || '', user.password_hash);
  if (!ok) return NextResponse.json({ error: 'Wrong password.' }, { status: 400 });

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
