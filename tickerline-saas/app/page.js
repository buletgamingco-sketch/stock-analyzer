'use client';
import { useState, useEffect } from 'react';

const SECTORS = [
  ['tech', 'Technology', 'fa-laptop-code'], ['ai', 'AI & Chips', 'fa-microchip'],
  ['energy', 'Clean Energy', 'fa-bolt'], ['oil', 'Oil & Gas', 'fa-oil-well'],
  ['finance', 'Finance', 'fa-building-columns'], ['health', 'Healthcare', 'fa-heart-pulse'],
  ['consumer', 'Consumer', 'fa-cart-shopping'], ['defense', 'Defense', 'fa-shield-halved'],
  ['crypto', 'Crypto/Mining', 'fa-bitcoin-sign'], ['realty', 'Real Estate', 'fa-building'],
  ['auto', 'Auto & EV', 'fa-car'],
];
const CRITERIA = ['Revenue growth', 'Profit margins', 'P/E ratio', 'Debt levels', 'Free cash flow', 'Competitive moat', 'Management', 'Valuation', 'Analyst ratings', 'Earnings momentum'];

const scoreCls = (s) => s >= 9 ? 's9' : s >= 8 ? 's8' : s >= 7 ? 's7' : s >= 6 ? 's6' : s >= 5 ? 's5' : 'slow';
const barCol = (s) => s >= 7 ? '#3DD68C' : s >= 5 ? '#F5B544' : '#F2545B';
const vCls = (v) => { v = (v || '').toLowerCase(); return v.includes('buy') ? 'vbuy' : v.includes('sell') ? 'vsell' : 'vhold'; };
const upCls = (u) => (u || '').trim().startsWith('-') ? 'dnc' : 'upc';

export default function Home() {
  const [me, setMe] = useState(undefined); // undefined=loading, null=guest
  const [usage, setUsage] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authErr, setAuthErr] = useState('');
  const [view, setView] = useState('analyze');

  const [sector, setSector] = useState('tech');
  const [crit, setCrit] = useState(new Set(['Revenue growth', 'Profit margins', 'Competitive moat', 'Valuation']));
  const [ticker, setTicker] = useState('');
  const [horizon, setHorizon] = useState('medium');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  const [qaThread, setQaThread] = useState([]);
  const [qaInput, setQaInput] = useState('');
  const [qaBusy, setQaBusy] = useState(false);

  useEffect(() => { refreshMe(); }, []);
  async function refreshMe() {
    const r = await fetch('/api/me').then((r) => r.json());
    setMe(r.user || null);
    setUsage(r.usage || null);
  }

  async function submitAuth(e) {
    e.preventDefault();
    setAuthErr('');
    const fd = new FormData(e.target);
    const body = { email: fd.get('email'), password: fd.get('password') };
    const r = await fetch('/api/' + authMode, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) return setAuthErr(j.error || 'Something went wrong.');
    refreshMe();
  }
  async function logout() { await fetch('/api/logout', { method: 'POST' }); setMe(null); setResult(null); }

  async function subscribe() {
    const r = await fetch('/api/checkout', { method: 'POST' }).then((r) => r.json());
    if (r.url) window.location.href = r.url;
  }
  async function manageBilling() {
    const r = await fetch('/api/portal', { method: 'POST' }).then((r) => r.json());
    if (r.url) window.location.href = r.url;
  }

  function toggleCrit(c) {
    const n = new Set(crit); n.has(c) ? n.delete(c) : n.add(c); setCrit(n);
  }

  async function run() {
    const tk = ticker.trim().toUpperCase();
    if (!tk) return;
    setBusy(true); setErr(''); setResult(null); setQaThread([]);
    const r = await fetch('/api/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker: tk, sector: SECTORS.find((s) => s[0] === sector)?.[1], horizon, criteria: [...crit] }),
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) {
      if (j.error === 'subscribe') { refreshMe(); setView('account'); return; }
      setErr(j.message || j.error || 'Failed.');
      return;
    }
    setResult(j.result);
    if (j.usage) setUsage(j.usage);
  }

  async function ask(q) {
    if (!q || !result) return;
    setQaInput('');
    setQaThread((t) => [...t, { q, a: null }]);
    setQaBusy(true);
    const r = await fetch('/api/ask', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: result, question: q, history: qaThread.filter((m) => m.a).map((m) => ({ q: m.q, a: m.a })) }),
    });
    const j = await r.json();
    setQaBusy(false);
    setQaThread((t) => t.map((m, i) => i === t.length - 1 ? { q: m.q, a: r.ok ? j.answer : (j.message || j.error || 'Failed.') } : m));
    if (j.usage) setUsage(j.usage);
  }

  // ---------- RENDER ----------
  if (me === undefined) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>;

  // Guest: landing + auth
  if (!me) {
    return (
      <>
        <div className="nav">
          <div className="brand"><span className="dot"></span>Tickerline</div>
          <div className="nav-spacer"></div>
        </div>
        <div className="auth-wrap">
          <div className="hero" style={{ padding: '40px 20px 20px' }}>
            <div className="eyebrow">AI equity research</div>
            <h1 style={{ fontSize: 40 }}>Read any stock like a <span className="glow">research desk.</span></h1>
            <p>Scored breakdowns, price targets, and a Q&amp;A analyst — $11/month, unlimited within your monthly limit.</p>
          </div>
          <div className="auth-card">
            <div className="auth-tabs">
              <div className={'auth-tab' + (authMode === 'login' ? ' on' : '')} onClick={() => setAuthMode('login')}>Log in</div>
              <div className={'auth-tab' + (authMode === 'signup' ? ' on' : '')} onClick={() => setAuthMode('signup')}>Sign up</div>
            </div>
            {authErr && <div className="auth-err">{authErr}</div>}
            <form onSubmit={submitAuth}>
              <div className="field"><label>Email</label><input name="email" type="email" placeholder="you@email.com" required /></div>
              <div className="field"><label>Password</label><input name="password" type="password" placeholder="••••••••" required /></div>
              <button className="btn btn-amber btn-block" type="submit">{authMode === 'login' ? 'Log in' : 'Create account'}</button>
            </form>
          </div>
        </div>
      </>
    );
  }

  const active = me.subStatus === 'active';

  return (
    <>
      <div className="nav">
        <div className="brand"><span className="dot"></span>Tickerline</div>
        <div className="nav-spacer"></div>
        <span className="mono" style={{ fontSize: 13, color: 'var(--muted)' }}>{me.email}</span>
        <button className="btn" onClick={logout}>Sign out</button>
      </div>

      <div className="shell">
        <aside className="side">
          <div className="side-lbl">Workspace</div>
          <div className={'side-item' + (view === 'analyze' ? ' on' : '')} onClick={() => setView('analyze')}><i className="fa-solid fa-magnifying-glass-chart"></i> Analyze</div>
          <div className={'side-item' + (view === 'account' ? ' on' : '')} onClick={() => setView('account')}><i className="fa-solid fa-gear"></i> Account &amp; billing</div>
        </aside>

        <main className="app-main">
          {view === 'analyze' && (
            <>
              <div className="page-h">Analyze a stock</div>
              <div className="page-sub">
                {active
                  ? <>Plan active · <b className="mono">${(usage?.remainingCents / 100 || 0).toFixed(2)}</b> of analysis left this month</>
                  : <>You need an active plan to run analyses — <a style={{ color: 'var(--amber)', cursor: 'pointer' }} onClick={() => setView('account')}>subscribe here</a>.</>}
              </div>

              <div className="sectors">
                {SECTORS.map(([id, label, icon]) => (
                  <button key={id} className={'sec' + (id === sector ? ' on' : '')} onClick={() => setSector(id)}><i className={'fa-solid ' + icon}></i>{label}</button>
                ))}
              </div>
              <div className="row">
                <div className="f" style={{ maxWidth: 170 }}><label>Ticker</label><input className="mono" value={ticker} onChange={(e) => setTicker(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} placeholder="NVDA" maxLength={10} /></div>
                <div className="f" style={{ maxWidth: 170 }}><label>Horizon</label>
                  <select value={horizon} onChange={(e) => setHorizon(e.target.value)}>
                    <option value="short">3–6 months</option><option value="medium">6–12 months</option><option value="long">1–3 years</option>
                  </select>
                </div>
                <button className="go" onClick={run} disabled={busy}><i className={'fa-solid ' + (busy ? 'fa-spinner fa-spin' : 'fa-bolt')}></i>{busy ? 'Working…' : 'Analyze'}</button>
              </div>
              <div className="clab">Criteria</div>
              <div className="crit">
                {CRITERIA.map((c) => <span key={c} className={'tag' + (crit.has(c) ? ' on' : '')} onClick={() => toggleCrit(c)}>{c}</span>)}
              </div>

              {err && <div className="err"><b>Couldn&apos;t complete the analysis.</b><br />{err}</div>}
              {busy && !result && <div className="load"><i className="fa-solid fa-spinner"></i><p>Analyzing {ticker.toUpperCase()}…</p></div>}
              {result && <ResultCard d={result} onPeer={(t) => { setTicker(t); setTimeout(run, 0); }} qaThread={qaThread} qaInput={qaInput} setQaInput={setQaInput} ask={ask} qaBusy={qaBusy} />}
              {!result && !busy && !err && <div className="empty"><i className="fa-solid fa-chart-simple"></i><p style={{ color: 'var(--muted)' }}>Enter a ticker and hit Analyze.</p></div>}
            </>
          )}

          {view === 'account' && (
            <>
              <div className="page-h">Account &amp; billing</div>
              <div className="page-sub">{me.email}</div>
              <div className="set-card">
                <h3>Subscription</h3>
                {active ? (
                  <>
                    <p>Your plan is <b style={{ color: 'var(--pos)' }}>active</b>. You&apos;ve used <b className="mono">${(usage?.usedCents / 100 || 0).toFixed(2)}</b> of <b className="mono">${(usage?.capCents / 100 || 0).toFixed(2)}</b> included analysis this month.</p>
                    <button className="btn" onClick={manageBilling}>Manage billing</button>
                  </>
                ) : (
                  <>
                    <p>Subscribe to unlock unlimited analysis within your monthly limit.</p>
                    <button className="btn btn-amber" onClick={subscribe}>Subscribe — $11/month</button>
                  </>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}

function ResultCard({ d, onPeer, qaThread, qaInput, setQaInput, ask, qaBusy }) {
  const score = Math.max(1, Math.min(10, parseInt(d.score) || 5));
  const fc = d.forecast || {};
  const fcCard = (o, l) => o ? (
    <div className="fcc"><div className="fcp">{l}</div><div className="fct">{o.target || '—'}</div><div className={'fcu ' + upCls(o.upside)}>{o.upside || ''}</div><div className="fcn">{o.note || ''}</div></div>
  ) : null;

  return (
    <div className="card">
      {d.dataCaveat && <div className="warn"><i className="fa-solid fa-circle-info" style={{ marginTop: 1 }}></i><span><b>Heads up:</b> {d.dataCaveat}</span></div>}
      <div className="rh">
        <div>
          <div className="rtk">{d.exchange ? d.exchange + ' · ' : ''}{d.ticker}</div>
          <div className="rnm">{d.companyName || d.ticker}</div>
          <div className="meta"><span className="pill">{d.sector}</span></div>
          <div className={'verdict ' + vCls(d.verdict)}>{d.verdict || 'Hold'}</div>
          <div className="vn">{d.verdictNote || ''}</div>
        </div>
        <div className="sc"><div className={'scn ' + scoreCls(score)}>{score}<span className="scd">/10</span></div><div className="scl">Score</div></div>
      </div>
      <div className="bar"><div className="barf" style={{ width: score * 10 + '%', background: barCol(score) }}></div></div>
      <div className="rat">{d.scoreRationale || ''}</div>
      <div className="sect"><div className="sl"><i className="fa-solid fa-circle-info"></i>Overview</div><p className="desc">{d.description}</p></div>
      {d.metrics?.length > 0 && (
        <div className="sect"><div className="sl"><i className="fa-solid fa-chart-bar"></i>Key metrics</div>
          {d.metrics.map((m, i) => <div className="mrow" key={i}><span className="mn">{m.name}</span><span className={m.rating || 'neutral'} style={{ fontWeight: 500 }}>{m.value}</span></div>)}
        </div>
      )}
      <div className="pc">
        <div className="pro"><div className="pct g"><i className="fa-solid fa-arrow-up"></i>Strengths</div>{(d.pros || []).map((p, i) => <div className="it" key={i}><i className="fa-solid fa-check good"></i>{p}</div>)}</div>
        <div className="con"><div className="pct r"><i className="fa-solid fa-arrow-down"></i>Risks</div>{(d.cons || []).map((c, i) => <div className="it" key={i}><i className="fa-solid fa-xmark bad"></i>{c}</div>)}</div>
      </div>
      <div className="up"><div className="upt"><i className="fa-solid fa-rocket"></i>Bull case</div><p className="upx">{d.upside}</p></div>
      <div className="sect"><div className="sl"><i className="fa-solid fa-arrow-trend-up"></i>Price forecast</div><div className="fc">{fcCard(fc.sixMonth, '6 months')}{fcCard(fc.oneYear, '1 year')}{fcCard(fc.twoYear, '2 years')}</div></div>
      {d.peers?.length > 0 && (
        <div className="sect"><div className="sl"><i className="fa-solid fa-diagram-project"></i>Peers</div>
          <div className="peers">{d.peers.map((p) => <button className="peer" key={p} onClick={() => onPeer(p)}>{p}</button>)}</div>
        </div>
      )}
      <div className="qa">
        <div className="sl"><i className="fa-solid fa-comments"></i>Ask about {d.companyName || d.ticker}</div>
        {qaThread.length === 0 && (
          <div className="qa-sugg">
            {['What are the biggest risks?', 'How does it make money?', 'Is the valuation fair?', 'What should I watch next quarter?'].map((q) =>
              <span className="qa-chip" key={q} onClick={() => ask(q)}>{q}</span>)}
          </div>
        )}
        <div className="qa-thread">
          {qaThread.map((m, i) => (
            <div key={i} style={{ display: 'contents' }}>
              <div className="qa-msg qa-q">{m.q}</div>
              {m.a === null ? <div className="qa-think"><i className="fa-solid fa-spinner"></i>Thinking…</div> : <div className="qa-msg qa-a">{m.a}</div>}
            </div>
          ))}
        </div>
        <div className="qa-in">
          <input value={qaInput} onChange={(e) => setQaInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask(qaInput)} placeholder={'Ask anything about ' + d.ticker + '…'} />
          <button className="qa-send" onClick={() => ask(qaInput)} disabled={qaBusy}><i className="fa-solid fa-paper-plane"></i></button>
        </div>
      </div>
      <div className="disc"><i className="fa-solid fa-shield-halved"></i><span><b>Not financial advice.</b> AI-generated research for educational use. Always do your own research.</span></div>
    </div>
  );
}
