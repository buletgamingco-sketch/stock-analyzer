import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql, getUserByEmail } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req) {
  const { email, password } = await req.json();
  if (!email || !password || password.length < 6)
    return NextResponse.json({ error: 'Enter an email and a password of at least 6 characters.' }, { status: 400 });

  const clean = email.trim().toLowerCase();
  if (await getUserByEmail(clean))
    return NextResponse.json({ error: 'That email already has an account. Log in instead.' }, { status: 400 });

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await sql`INSERT INTO users (email, password_hash) VALUES (${clean}, ${hash}) RETURNING id`;
  await createSession(rows[0].id);
  return NextResponse.json({ ok: true });
}
