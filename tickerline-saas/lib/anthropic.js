import { model } from './pricing';

// Calls Claude with the SERVER's secret key. Returns text + token usage.
export async function callClaude(prompt, maxTokens = 1400) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Server is missing ANTHROPIC_API_KEY');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model(),
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    let m = 'Anthropic error ' + res.status;
    try { const e = await res.json(); m = e.error?.message || m; } catch {}
    throw new Error(m);
  }

  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || '').join('');
  const inTok = data.usage?.input_tokens || 0;
  const outTok = data.usage?.output_tokens || 0;
  return { text, inTok, outTok };
}

function repairTruncated(s) {
  let inStr = false, esc = false, lastSafe = -1;
  const stack = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') { inStr = false; lastSafe = i; }
    } else {
      if (c === '"') inStr = true;
      else if (c === '{' || c === '[') stack.push(c === '{' ? '}' : ']');
      else if (c === '}' || c === ']') { stack.pop(); lastSafe = i; }
      else if (/[\d}\]eul]/.test(c)) lastSafe = i;
    }
  }
  let cut = s.slice(0, lastSafe + 1).replace(/,\s*$/, '');
  while (stack.length) cut += stack.pop();
  return cut.replace(/,\s*([}\]])/g, '$1');
}

export function extractJSON(raw) {
  if (!raw) return null;
  let t = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(t); } catch {}
  const a = t.indexOf('{');
  if (a < 0) return null;
  const s = t.slice(a);
  const b = s.lastIndexOf('}');
  if (b > 0) {
    const sl = s.slice(0, b + 1).replace(/,\s*([}\]])/g, '$1');
    try { return JSON.parse(sl); } catch {}
  }
  try { return JSON.parse(repairTruncated(s)); } catch {}
  return null;
}
