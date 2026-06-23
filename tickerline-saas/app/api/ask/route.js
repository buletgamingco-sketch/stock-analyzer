import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getUserById, getUsageCents, addUsageCents } from '@/lib/db';
import { callClaude } from '@/lib/anthropic';
import { costCents, model, monthlyCapCents } from '@/lib/pricing';

export async function POST(req) {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  const user = await getUserById(uid);
  if (!user || user.sub_status !== 'active')
    return NextResponse.json({ error: 'subscribe', message: 'An active subscription is required.' }, { status: 402 });

  const used = await getUsageCents(uid);
  const cap = monthlyCapCents();
  if (used >= cap)
    return NextResponse.json({ error: 'limit', message: 'Monthly limit reached. Resets next cycle.' }, { status: 402 });

  const { context, question, history } = await req.json();
  if (!question || !context) return NextResponse.json({ error: 'Missing question.' }, { status: 400 });

  const hist = (history || []).map((h) => `Q: ${h.q}\nA: ${h.a}`).join('\n\n');
  const prompt = `You are an equity analyst answering a follow-up about ${context.companyName} (${context.ticker}) in the ${context.sector} sector.
Context: score ${context.score}/10, verdict ${context.verdict}. Overview: ${context.description}. Strengths: ${(context.pros || []).join('; ')}. Risks: ${(context.cons || []).join('; ')}.
${hist ? 'Earlier:\n' + hist + '\n' : ''}
Question: ${question}
Answer in 2-4 plain-prose sentences specific to this company. No markdown, no bullets, no disclaimer. If it needs very recent data you may lack, say so briefly.`;

  let answer = '', cents = 0;
  try {
    const r = await callClaude(prompt, 400);
    answer = r.text.trim();
    cents = costCents(model(), r.inTok, r.outTok);
    await addUsageCents(uid, cents);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }

  const usedAfter = used + cents;
  return NextResponse.json({
    answer,
    usage: { usedCents: Math.round(usedAfter * 100) / 100, capCents: cap, remainingCents: Math.max(0, cap - usedAfter) },
  });
}
