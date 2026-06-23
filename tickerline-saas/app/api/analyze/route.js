import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getUserById, getUsageCents, addUsageCents } from '@/lib/db';
import { callClaude, extractJSON } from '@/lib/anthropic';
import { costCents, model, monthlyCapCents } from '@/lib/pricing';

export async function POST(req) {
  // 1) Must be signed in
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  // 2) Must have an active subscription
  const user = await getUserById(uid);
  if (!user || user.sub_status !== 'active')
    return NextResponse.json({ error: 'subscribe', message: 'An active subscription is required.' }, { status: 402 });

  // 3) Must be under the monthly usage cap
  const used = await getUsageCents(uid);
  const cap = monthlyCapCents();
  if (used >= cap)
    return NextResponse.json({ error: 'limit', message: 'You have reached this month\'s analysis limit. It resets next billing cycle.' }, { status: 402 });

  // 4) Build the prompt server-side
  const { ticker, sector, horizon, criteria } = await req.json();
  const tk = (ticker || '').trim().toUpperCase();
  if (!tk) return NextResponse.json({ error: 'Enter a ticker.' }, { status: 400 });

  const crit = (Array.isArray(criteria) && criteria.length ? criteria : ['Revenue growth', 'Profit margins', 'Competitive moat', 'Valuation']).join(', ');
  const hLabel = { short: 'short-term (3-6 months)', medium: 'medium-term (6-12 months)', long: 'long-term (1-3 years)' }[horizon] || 'medium-term (6-12 months)';

  const prompt = `You are a senior equity research analyst. Analyze the publicly traded stock ticker "${tk}".
RULES:
- Treat "${tk}" as a REAL valid ticker. Identify its company. Do NOT refuse or score 0 just because it recently changed business, is small/volatile, or you're unsure of very recent events.
- Set "valid":false ONLY if "${tk}" is genuinely not a real ticker.
- If your knowledge may be stale, still analyze and add a short "dataCaveat".
Sector: ${sector || 'general'}. Horizon: ${hLabel}. Weigh: ${crit}.
Respond with ONLY valid JSON, no markdown, keep every text value to one short sentence:
{"valid":true,"ticker":"${tk}","companyName":"name","exchange":"exch","sector":"${sector || ''}","dataCaveat":"","score":<1-10 int>,"scoreRationale":"1 sentence","description":"2 sentences","pros":["p1","p2","p3"],"cons":["c1","c2"],"upside":"2 sentences","metrics":[{"name":"criterion","value":"short","rating":"good|neutral|bad"}],"forecast":{"sixMonth":{"target":"$X","upside":"+X%","note":"<=4 words"},"oneYear":{"target":"$X","upside":"+X%","note":"<=4 words"},"twoYear":{"target":"$X","upside":"+X%","note":"<=4 words"}},"peers":["T1","T2","T3"],"verdict":"Strong Buy|Buy|Hold|Sell|Strong Sell","verdictNote":"1 sentence"}
At most 5 metrics entries.`;

  // 5) Call Claude with the SERVER key, then meter the real token cost
  let d = null, totalIn = 0, totalOut = 0;
  try {
    const r1 = await callClaude(prompt, 1400);
    totalIn += r1.inTok; totalOut += r1.outTok;
    d = extractJSON(r1.text);
    if (!d) {
      const r2 = await callClaude(prompt + '\n\nReturn ONLY the JSON, starting with { ending with }.', 1400);
      totalIn += r2.inTok; totalOut += r2.outTok;
      d = extractJSON(r2.text);
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }

  // 6) Record usage no matter what (you paid for the tokens)
  const cents = costCents(model(), totalIn, totalOut);
  await addUsageCents(uid, cents);

  if (!d) return NextResponse.json({ error: 'The analysis came back unreadable. Please try again.' }, { status: 502 });

  const usedAfter = used + cents;
  return NextResponse.json({
    result: d,
    usage: { usedCents: Math.round(usedAfter * 100) / 100, capCents: cap, remainingCents: Math.max(0, cap - usedAfter) },
  });
}
