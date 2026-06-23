import { sql } from '@vercel/postgres';

export { sql };

export function currentPeriod() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function getUserById(id) {
  const { rows } = await sql`SELECT * FROM users WHERE id = ${id}`;
  return rows[0] || null;
}

export async function getUserByEmail(email) {
  const { rows } = await sql`SELECT * FROM users WHERE email = ${email}`;
  return rows[0] || null;
}

export async function getUsageCents(userId) {
  const period = currentPeriod();
  const { rows } = await sql`SELECT cents FROM usage WHERE user_id = ${userId} AND period = ${period}`;
  return rows[0] ? Number(rows[0].cents) : 0;
}

export async function addUsageCents(userId, cents) {
  const period = currentPeriod();
  await sql`
    INSERT INTO usage (user_id, period, cents)
    VALUES (${userId}, ${period}, ${cents})
    ON CONFLICT (user_id, period)
    DO UPDATE SET cents = usage.cents + ${cents}
  `;
}
