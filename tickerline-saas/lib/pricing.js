// API token prices in USD per MILLION tokens.
// Keep these in sync with https://platform.claude.com/docs/en/about-claude/pricing
const PRICES = {
  'claude-haiku-4-5-20251001': { in: 1, out: 5 },
  'claude-sonnet-4-6':         { in: 3, out: 15 },
  'claude-opus-4-8':           { in: 5, out: 25 },
};

export function model() {
  return process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
}

// Cost of one call, in US cents.
export function costCents(modelId, inTok, outTok) {
  const p = PRICES[modelId] || PRICES['claude-sonnet-4-6'];
  const usd = (inTok / 1e6) * p.in + (outTok / 1e6) * p.out;
  return usd * 100;
}

export function monthlyCapCents() {
  return Number(process.env.MONTHLY_USAGE_CAP_CENTS || 600);
}
