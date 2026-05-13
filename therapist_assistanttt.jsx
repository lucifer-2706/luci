import { useState, useEffect, useRef } from "react";

const T = {
  navy: "#0B1D35", navyMid: "#112240", teal: "#0D9488", tealLight: "#14B8A6",
  white: "#FFFFFF", textPrimary: "#0B1D35", textSec: "#4A6080", textLight: "#8BA4BF",
  border: "#D1DCE8", cardBg: "#F8FAFC",
  success: "#059669", successBg: "#D1FAE5",
  warn: "#D97706", warnBg: "#FEF3C7",
  danger: "#DC2626", dangerBg: "#FEE2E2",
  info: "#1D4ED8", infoBg: "#DBEAFE",
  purple: "#7C3AED", purpleBg: "#EDE9FE",
  orange: "#EA580C", orangeBg: "#FFF7ED",
};

const LANGUAGES = [
  { code: "", label: "Auto-detect (browser language)" },
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "hi-IN", label: "Hindi — हिन्दी" },
  { code: "bn-IN", label: "Bengali — বাংলা" },
  { code: "or-IN", label: "Odia — ଓଡ଼ିଆ" },
  { code: "ta-IN", label: "Tamil — தமிழ்" },
  { code: "te-IN", label: "Telugu — తెలుగు" },
  { code: "ml-IN", label: "Malayalam — മലയാളം" },
  { code: "mr-IN", label: "Marathi — मराठी" },
  { code: "gu-IN", label: "Gujarati — ગુજરાતી" },
  { code: "ar-SA", label: "Arabic — العربية" },
  { code: "zh-CN", label: "Chinese Simplified — 普通话" },
  { code: "zh-TW", label: "Chinese Traditional — 繁體中文" },
  { code: "fr-FR", label: "French — Français" },
  { code: "de-DE", label: "German — Deutsch" },
  { code: "es-ES", label: "Spanish — Español" },
  { code: "pt-BR", label: "Portuguese — Português" },
  { code: "ru-RU", label: "Russian — Русский" },
  { code: "ja-JP", label: "Japanese — 日本語" },
  { code: "ko-KR", label: "Korean — 한국어" },
  { code: "it-IT", label: "Italian — Italiano" },
  { code: "nl-NL", label: "Dutch — Nederlands" },
  { code: "tr-TR", label: "Turkish — Türkçe" },
  { code: "pl-PL", label: "Polish — Polski" },
  { code: "id-ID", label: "Indonesian — Bahasa Indonesia" },
  { code: "ms-MY", label: "Malay — Bahasa Melayu" },
  { code: "vi-VN", label: "Vietnamese — Tiếng Việt" },
  { code: "th-TH", label: "Thai — ภาษาไทย" },
  { code: "sw-KE", label: "Swahili — Kiswahili" },
  { code: "uk-UA", label: "Ukrainian — Українська" },
];

const API_SYS = `You are a clinical AI assistant for licensed therapists. Analyze session notes. Return ONLY valid raw JSON, no markdown fences, no preamble:
{"keyPoints":["string"],"pros":["string"],"cons":["string"],"symptoms":["string"],"emotions":["string"],"repeatedPatterns":["string"],"predictions":["string"],"riskLevel":"low|medium|high","summary":"string","recommendedActions":["string"]}
repeatedPatterns: themes/symptoms appearing across multiple sessions. predictions: potential future challenges. riskLevel: overall patient wellbeing risk. Max 5-6 items per array.`;

function initials(n) { return n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2); }
function avatarPalette(n) {
  return [
    { bg: "#DBEAFE", tx: "#1E3A8A" }, { bg: "#D1FAE5", tx: "#065F46" },
    { bg: "#FEF3C7", tx: "#78350F" }, { bg: "#EDE9FE", tx: "#4C1D95" },
    { bg: "#FFE4E6", tx: "#9F1239" },
  ][n.charCodeAt(0) % 5];
}

function Avatar({ name, size = 40 }) {
  const c = avatarPalette(name);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: c.bg, color: c.tx, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.36, border: `2px solid ${c.tx}22` }}>
      {initials(name)}
    </div>
  );
}

function Tag({ children, col = "info" }) {
  const m = { success: [T.successBg, T.success], warn: [T.warnBg, T.warn], danger: [T.dangerBg, T.danger], info: [T.infoBg, T.info], purple: [T.purpleBg, T.purple], teal: ["#CCFBF1", T.teal] };
  const [bg, tx] = m[col] || m.info;
  return <span style={{ background: bg, color: tx, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, letterSpacing: 0.3, whiteSpace: "nowrap" }}>{children}</span>;
}

async function callAI(system, user) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system, messages: [{ role: "user", content: user }] }),
  });
  const d = await r.json();
  const raw = (d.content || []).map(b => b.text || "").join("");
  const clean = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(clean); } catch { return null; }
}

export default function App() {
  const [view, setView] = useState("dash");
  const [patients, setPatients] = useState([]);
  const [sessions, setSessions] = useState({});
  const [sel, setSel] = useState(null);
  const [detailSession, setDetailSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await window.storage.get("tap2:patients");
        const s = await window.storage.get("tap2:sessions");
        if (p) setPatients(JSON.parse(p.value));
        if (s) setSessions(JSON.parse(s.value));
      } catch {}
      setReady(true);
    })();
  }, []);

  async function savePatients(list) { setPatients(list); try { await window.storage.set("tap2:patients", JSON.stringify(list)); } catch {} }
  async function saveSessions(map) { setSessions(map); try { await window.storage.set("tap2:sessions", JSON.stringify(map)); } catch {} }

  function go(v, p) { if (p !== undefined) setSel(p); setView(v); }
  const ps = sel ? (sessions[sel.id] || []) : [];

  if (!ready) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 420, fontFamily: "Georgia, serif" }}>
      <div style={{ textAlign: "center", color: T.textSec }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${T.teal}`, borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 14px", animation: "spin 0.9s linear infinite" }} />
        <p style={{ margin: 0, fontSize: 14 }}>Loading…</p>
      </div>
      <style>{KF}</style>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Georgia', serif", color: T.textPrimary, minHeight: 600 }}>
      <style>{KF + GFONTS}</style>
      <NavBar view={view} sel={sel} go={go} />
      <div key={view} style={{ animation: "fadeUp 0.2s ease" }}>
        {view === "dash" && <Dashboard patients={patients} sessions={sessions} go={go} onAdd={p => savePatients([...patients, p])} />}
        {view === "patient" && sel && <PatientView patient={sel} sessions={ps} go={go} onDetail={s => { setDetailSession(s); go("detail"); }} />}
        {view === "session" && sel && (
          <SessionCapture patient={sel} history={ps} onSave={(note, analysis) => {
            const ns = { id: Date.now().toString(), date: new Date().toISOString(), note, analysis };
            const updated = { ...sessions, [sel.id]: [...ps, ns] };
            saveSessions(updated); go("patient");
          }} />
        )}
        {view === "detail" && detailSession && sel && <SessionDetail session={detailSession} patient={sel} />}
      </div>
    </div>
  );
}

const KF = `@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`;
const GFONTS = `@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500;600&display=swap');`;

function NavBar({ view, sel, go }) {
  const crumbs = [{ l: "Patients", v: "dash" }];
  if (sel && ["patient", "session", "detail"].includes(view)) crumbs.push({ l: sel.name, v: "patient" });
  if (view === "session") crumbs.push({ l: "New session", v: null });
  if (view === "detail") crumbs.push({ l: "Session detail", v: null });
  return (
    <div style={{ background: T.navy, padding: "0 1.5rem", height: 56, display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: T.teal, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
        </div>
        <span style={{ color: T.white, fontWeight: 600, fontSize: 15, fontFamily: "'DM Sans', sans-serif", letterSpacing: -0.3 }}>TherapyAI</span>
        <span style={{ background: "#14B8A622", color: T.tealLight, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, fontFamily: "'DM Sans', sans-serif" }}>24/7</span>
      </div>
      <div style={{ width: 1, height: 22, background: "#ffffff1A" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {i > 0 && <span style={{ color: "#ffffff33", fontSize: 14 }}>›</span>}
            <button onClick={() => c.v && go(c.v)} style={{ background: "none", border: "none", padding: "4px 8px", borderRadius: 6, color: c.v ? "#93C5FD" : "#ffffff55", fontSize: 13, fontWeight: c.v ? 600 : 400, cursor: c.v ? "pointer" : "default", fontFamily: "'DM Sans', sans-serif" }}>{c.l}</button>
          </span>
        ))}
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ADE80", boxShadow: "0 0 8px #4ADE80" }} />
        <span style={{ color: "#ffffff44", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>Online</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, accent }) {
  return (
    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: "1.1rem 1.25rem", borderTop: `3px solid ${accent}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 11, color: T.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'DM Sans', sans-serif" }}>{label}</p>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: accent + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{icon}</div>
      </div>
      <p style={{ margin: 0, fontSize: 30, fontWeight: 600, color: T.navy, fontFamily: "'Lora', serif" }}>{value}</p>
    </div>
  );
}

function Dashboard({ patients, sessions, go, onAdd }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState(""); const [age, setAge] = useState("");
  const [dx, setDx] = useState(""); const [notes, setNotes] = useState("");
  const total = Object.values(sessions).reduce((a, s) => a + s.length, 0);
  const high = patients.filter(p => { const s = sessions[p.id] || []; return s[s.length - 1]?.analysis?.riskLevel === "high"; }).length;

  function add() {
    if (!name.trim()) return;
    onAdd({ id: Date.now().toString(), name: name.trim(), age, diagnosis: dx, notes, createdAt: new Date().toISOString() });
    setName(""); setAge(""); setDx(""); setNotes(""); setShowForm(false);
  }

  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, color: T.navy, fontFamily: "'Lora', serif" }}>Patient Dashboard</h1>
          <p style={{ margin: "5px 0 0", fontSize: 13, color: T.textSec, fontFamily: "'DM Sans', sans-serif" }}>AI-powered clinical support · Secure · Always active</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: T.teal, color: T.white, border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
          + New patient
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: "1.5rem" }}>
        <StatCard label="Total patients" value={patients.length} icon="👤" accent={T.teal} />
        <StatCard label="Total sessions" value={total} icon="📋" accent={T.purple} />
        <StatCard label="High risk" value={high} icon="⚠" accent={T.danger} />
      </div>

      {showForm && (
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderLeft: `4px solid ${T.teal}`, borderRadius: 12, padding: "1.25rem", marginBottom: "1.5rem" }}>
          <p style={{ margin: "0 0 14px", fontWeight: 600, fontSize: 15, color: T.navy, fontFamily: "'Lora', serif" }}>Register new patient</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Fld label="Full name *"><Inp value={name} onChange={setName} placeholder="Patient full name" /></Fld>
            <Fld label="Age"><Inp value={age} onChange={setAge} placeholder="e.g. 34" /></Fld>
          </div>
          <Fld label="Diagnosis / condition" style={{ marginBottom: 12 }}><Inp value={dx} onChange={setDx} placeholder="e.g. GAD, MDD, PTSD, Anxiety…" full /></Fld>
          <Fld label="Intake notes" style={{ marginBottom: 14 }}>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Background, referral reason, initial observations…" rows={2} style={{ ...inpStyle(), width: "100%", resize: "none", boxSizing: "border-box" }} />
          </Fld>
          <div style={{ display: "flex", gap: 8 }}>
            <PBtn onClick={add}>Save patient</PBtn>
            <SBtn onClick={() => setShowForm(false)}>Cancel</SBtn>
          </div>
        </div>
      )}

      {patients.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 0", color: T.textLight, fontFamily: "'DM Sans', sans-serif" }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>🏥</div>
          <p style={{ fontSize: 14 }}>No patients yet. Register your first patient to begin.</p>
        </div>
      ) : (
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ background: T.cardBg, borderBottom: `1px solid ${T.border}`, padding: "0.65rem 1.25rem", display: "grid", gridTemplateColumns: "1fr 70px 110px 75px 75px", gap: 12 }}>
            {["Patient", "Age", "Diagnosis", "Sessions", "Risk"].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: T.textSec, textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "'DM Sans', sans-serif" }}>{h}</span>
            ))}
          </div>
          {patients.map((p, i) => {
            const ps = sessions[p.id] || [];
            const last = ps[ps.length - 1];
            const risk = last?.analysis?.riskLevel;
            return (
              <div key={p.id} onClick={() => go("patient", p)} style={{ padding: "0.9rem 1.25rem", borderBottom: i < patients.length - 1 ? `1px solid ${T.border}` : "none", display: "grid", gridTemplateColumns: "1fr 70px 110px 75px 75px", gap: 12, alignItems: "center", cursor: "pointer", transition: "background 0.12s" }}
                onMouseEnter={e => e.currentTarget.style.background = T.cardBg} onMouseLeave={e => e.currentTarget.style.background = T.white}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={p.name} size={36} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: T.navy, fontFamily: "'DM Sans', sans-serif" }}>{p.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: T.textLight, fontFamily: "'DM Sans', sans-serif" }}>{ps.length > 0 ? `Last: ${new Date(last.date).toLocaleDateString()}` : "No sessions yet"}</p>
                  </div>
                </div>
                <span style={{ fontSize: 13, color: T.textSec, fontFamily: "'DM Sans', sans-serif" }}>{p.age || "—"}</span>
                <span style={{ fontSize: 12, color: T.textSec, fontFamily: "'DM Sans', sans-serif" }}>{p.diagnosis || "—"}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.navy, fontFamily: "'DM Sans', sans-serif" }}>{ps.length}</span>
                <span>{risk ? <Tag col={{ high: "danger", medium: "warn", low: "success" }[risk]}>{risk}</Tag> : <span style={{ color: T.textLight, fontSize: 12 }}>—</span>}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PatientView({ patient, sessions, go, onDetail }) {
  const last = sessions[sessions.length - 1];
  const la = last?.analysis;
  const symMap = {};
  sessions.forEach(s => (s.analysis?.symptoms || []).forEach(sym => { symMap[sym] = (symMap[sym] || 0) + 1; }));
  const recurring = Object.entries(symMap).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ background: T.navy, borderRadius: 14, padding: "1.5rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Avatar name={patient.name} size={54} />
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: T.white, fontFamily: "'Lora', serif" }}>{patient.name}</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
              {patient.age && <span style={{ fontSize: 13, color: "#94C5F8", fontFamily: "'DM Sans', sans-serif" }}>Age {patient.age}</span>}
              {patient.diagnosis && <><span style={{ color: "#ffffff22" }}>·</span><Tag col="teal">{patient.diagnosis}</Tag></>}
              {la?.riskLevel && <Tag col={{ high: "danger", medium: "warn", low: "success" }[la.riskLevel]}>{la.riskLevel} risk</Tag>}
            </div>
            {patient.notes && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#ffffff55", fontStyle: "italic", fontFamily: "'DM Sans', sans-serif" }}>{patient.notes}</p>}
          </div>
        </div>
        <button onClick={() => go("session")} style={{ background: T.teal, color: T.white, border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'DM Sans', sans-serif" }}>+ New session</button>
      </div>

      {la && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.25rem" }}>
          <InsCard title="Positive factors" items={la.pros} accent={T.success} icon="↑" />
          <InsCard title="Concerns" items={la.cons} accent={T.danger} icon="↓" />
        </div>
      )}

      {recurring.length > 0 && (
        <div style={{ background: T.warnBg, border: `1px solid ${T.warn}44`, borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
          <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 13, color: T.warn, fontFamily: "'DM Sans', sans-serif" }}>🔁 Recurring symptoms across sessions</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {recurring.map(([sym, cnt]) => (
              <span key={sym} style={{ background: T.white, border: `1px solid ${T.warn}55`, color: T.warn, borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                {sym} <span style={{ opacity: 0.6 }}>×{cnt}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {la?.predictions?.length > 0 && (
        <div style={{ background: T.orangeBg, border: `1px solid ${T.orange}44`, borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
          <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 13, color: T.orange, fontFamily: "'DM Sans', sans-serif" }}>⚡ Predicted future concerns</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {la.predictions.map((p, i) => <li key={i} style={{ fontSize: 13, color: "#9A3412", marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>{p}</li>)}
          </ul>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: T.navy, fontFamily: "'Lora', serif" }}>Session history</p>
        <span style={{ fontSize: 12, color: T.textSec, fontFamily: "'DM Sans', sans-serif" }}>{sessions.length} recorded</span>
      </div>

      {sessions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, color: T.textLight, fontFamily: "'DM Sans', sans-serif" }}>
          <p>No sessions yet.</p>
          <PBtn onClick={() => go("session")}>Record first session</PBtn>
        </div>
      ) : (
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
          {[...sessions].reverse().map((s, i) => {
            const r = s.analysis?.riskLevel;
            return (
              <div key={s.id} onClick={() => onDetail(s)} style={{ padding: "1rem 1.25rem", borderBottom: i < sessions.length - 1 ? `1px solid ${T.border}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "background 0.12s" }}
                onMouseEnter={e => e.currentTarget.style.background = T.cardBg} onMouseLeave={e => e.currentTarget.style.background = T.white}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: T.navy, fontFamily: "'DM Sans', sans-serif" }}>
                    {new Date(s.date).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: 12, color: T.textSec, fontFamily: "'DM Sans', sans-serif" }}>{s.note.slice(0, 90)}…</p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {r && <Tag col={{ high: "danger", medium: "warn", low: "success" }[r]}>{r}</Tag>}
                  <span style={{ color: T.textLight }}>›</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SessionCapture({ patient, history, onSave }) {
  const [note, setNote] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState("");
  const [micErr, setMicErr] = useState("");
  const [micSupported, setMicSupported] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const recRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) setMicSupported(false);
  }, []);

  async function startMic() {
    setMicErr("");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicErr("Microphone access denied. Click the lock icon in your browser address bar and allow microphone permission, then try again.");
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setMicErr("Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge."); return; }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    if (lang) r.lang = lang;
    r.onstart = () => setMicErr("");
    r.onresult = (e) => {
      let final = "", inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        else inter += e.results[i][0].transcript;
      }
      if (final) { setNote(prev => prev + final); setInterim(""); }
      else setInterim(inter);
    };
    r.onerror = (e) => {
      setListening(false); setInterim("");
      const msgs = {
        "not-allowed": "Microphone permission denied. Please allow access in your browser and try again.",
        "no-speech": "No speech detected. Ensure your microphone is working and try again.",
        "audio-capture": "No microphone found. Please connect a microphone and try again.",
        "network": "Network error during speech recognition. Check your connection.",
        "aborted": "Recording stopped.",
      };
      setMicErr(msgs[e.error] || `Speech recognition error: ${e.error}. Please try again.`);
    };
    r.onend = () => { setListening(false); setInterim(""); };
    r.start();
    recRef.current = r;
    setListening(true);
  }

  function stopMic() { recRef.current?.stop(); setListening(false); setInterim(""); }

  async function doAnalyze() {
    if (!note.trim()) return;
    setAnalyzing(true); setAnalysis(null);
    const hist = history.slice(-4).map(s => `[${new Date(s.date).toLocaleDateString()}] ${s.note.slice(0, 250)}`).join("\n---\n");
    const prompt = `Patient: ${patient.name}${patient.age ? `, Age ${patient.age}` : ""}${patient.diagnosis ? `, Diagnosis: ${patient.diagnosis}` : ""}

Previous sessions:
${hist || "First session."}

Current session notes:
${note}`;
    const r = await callAI(API_SYS, prompt);
    setAnalysis(r); setAnalyzing(false);
  }

  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ background: T.navy, borderRadius: 14, padding: "1.25rem 1.5rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ margin: 0, color: "#ffffff55", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Recording session</p>
          <h2 style={{ margin: "5px 0 3px", color: T.white, fontFamily: "'Lora', serif", fontSize: 20, fontWeight: 600 }}>{patient.name}</h2>
          <p style={{ margin: 0, color: "#93C5FD", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · Session #{history.length + 1}
          </p>
        </div>
        <div style={{ background: "#ffffff0A", border: "1px solid #ffffff1A", borderRadius: 10, padding: "0.6rem 1rem", textAlign: "center" }}>
          <p style={{ margin: 0, color: T.tealLight, fontSize: 20, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{history.length + 1}</p>
          <p style={{ margin: 0, color: "#ffffff44", fontSize: 10, fontFamily: "'DM Sans', sans-serif" }}>SESSION</p>
        </div>
      </div>

      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: "1.25rem", marginBottom: "1.25rem" }}>
        <p style={{ margin: "0 0 14px", fontWeight: 600, fontSize: 15, color: T.navy, fontFamily: "'Lora', serif" }}>🎙 Voice capture</p>

        <Fld label="Speaking language" style={{ marginBottom: 14 }}>
          <select value={lang} onChange={e => setLang(e.target.value)} style={{ ...inpStyle(), width: "100%" }}>
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </Fld>

        {!micSupported && (
          <div style={{ background: T.warnBg, border: `1px solid ${T.warn}44`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: T.warn, marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>
            ⚠ Speech recognition is only supported in Chrome, Edge, and Safari. Please switch browsers.
          </div>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: micErr || interim ? 12 : 0 }}>
          {!listening ? (
            <button onClick={startMic} disabled={!micSupported} style={{ background: micSupported ? T.teal : T.textLight, color: T.white, border: "none", borderRadius: 9, padding: "11px 22px", fontSize: 14, fontWeight: 600, cursor: micSupported ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 9, fontFamily: "'DM Sans', sans-serif" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2H3v2a9 9 0 008 8.94V23h2v-2.06A9 9 0 0021 12v-2h-2z" /></svg>
              Start listening
            </button>
          ) : (
            <button onClick={stopMic} style={{ background: T.danger, color: T.white, border: "none", borderRadius: 9, padding: "11px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 9, fontFamily: "'DM Sans', sans-serif" }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: T.white }} /> Stop recording
            </button>
          )}
          {listening && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ width: 4, borderRadius: 4, background: T.teal, animation: `blink 0.9s ease-in-out ${i * 0.15}s infinite`, height: [14, 22, 18, 10][i] }} />
              ))}
              <span style={{ fontSize: 13, color: T.teal, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", marginLeft: 4 }}>Recording…</span>
            </div>
          )}
        </div>

        {micErr && (
          <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: T.danger, fontFamily: "'DM Sans', sans-serif" }}>
            ⚠ {micErr}
          </div>
        )}

        {interim && (
          <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 8, padding: "10px 14px", fontFamily: "'DM Sans', sans-serif" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", display: "block", marginBottom: 4 }}>HEARING NOW</span>
            <span style={{ fontSize: 13, color: "#0369A1", fontStyle: "italic" }}>{interim}</span>
          </div>
        )}
      </div>

      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: "1.25rem", marginBottom: "1.25rem" }}>
        <p style={{ margin: "0 0 10px", fontWeight: 600, fontSize: 13, color: T.navy, textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "'DM Sans', sans-serif" }}>Session notes</p>
        <textarea
          value={note} onChange={e => setNote(e.target.value)}
          placeholder="Voice transcript appears here automatically, or type manually. Include emotions, events, thoughts, notable statements, behavioral observations…"
          rows={9}
          style={{ width: "100%", resize: "vertical", boxSizing: "border-box", border: `1.5px solid ${listening ? T.teal : T.border}`, borderRadius: 8, padding: "12px 14px", fontSize: 14, lineHeight: 1.85, fontFamily: "Georgia, serif", color: T.textPrimary, background: listening ? "#F0FDF4" : T.white, outline: "none", transition: "all 0.3s" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 11, color: T.textLight, fontFamily: "'DM Sans', sans-serif" }}>{note.split(/\s+/).filter(Boolean).length} words · {note.length} chars</span>
          {note && <button onClick={() => setNote("")} style={{ background: "none", border: "none", color: T.textLight, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Clear</button>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: "1.5rem" }}>
        <button onClick={doAnalyze} disabled={!note.trim() || analyzing} style={{ background: analyzing || !note.trim() ? T.textLight : T.navy, color: T.white, border: "none", borderRadius: 9, padding: "11px 22px", fontSize: 14, fontWeight: 600, cursor: note.trim() && !analyzing ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 9, fontFamily: "'DM Sans', sans-serif" }}>
          {analyzing
            ? <><div style={{ width: 15, height: 15, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> Analyzing…</>
            : <><span style={{ fontSize: 16 }}>✦</span> Analyze with AI</>}
        </button>
        {analysis && (
          <button onClick={() => onSave(note, analysis)} style={{ background: T.success, color: T.white, border: "none", borderRadius: 9, padding: "11px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif" }}>
            ✓ Save session
          </button>
        )}
      </div>

      {analysis && <AnalysisView analysis={analysis} />}
    </div>
  );
}

function AnalysisView({ analysis }) {
  const rc = { low: [T.success, T.successBg], medium: [T.warn, T.warnBg], high: [T.danger, T.dangerBg] }[analysis.riskLevel] || [T.teal, "#CCFBF1"];
  return (
    <div>
      <div style={{ background: T.navy, borderRadius: 14, padding: "1.25rem 1.5rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ color: T.tealLight, fontSize: 18 }}>✦</span>
          <span style={{ color: T.white, fontWeight: 600, fontSize: 15, fontFamily: "'Lora', serif" }}>AI Clinical Analysis</span>
          <span style={{ background: rc[1], color: rc[0], fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, fontFamily: "'DM Sans', sans-serif" }}>{analysis.riskLevel?.toUpperCase()} RISK</span>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: "#93C5FD", lineHeight: 1.75, fontFamily: "Georgia, serif", fontStyle: "italic" }}>{analysis.summary}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <InsCard title="Positive factors" items={analysis.pros} accent={T.success} icon="↑" />
        <InsCard title="Concerns" items={analysis.cons} accent={T.danger} icon="↓" />
        <InsCard title="Symptoms" items={analysis.symptoms} accent={T.warn} icon="⚠" />
        <InsCard title="Emotions" items={analysis.emotions} accent={T.purple} icon="◉" />
      </div>

      {analysis.keyPoints?.length > 0 && (
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: "1.1rem 1.25rem", marginBottom: 12 }}>
          <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 12, color: T.navy, textTransform: "uppercase", letterSpacing: 0.9, fontFamily: "'DM Sans', sans-serif" }}>📌 Key points</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {analysis.keyPoints.map((k, i) => <li key={i} style={{ fontSize: 13, color: T.textSec, marginBottom: 5, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>{k}</li>)}
          </ul>
        </div>
      )}

      {analysis.repeatedPatterns?.length > 0 && (
        <div style={{ background: T.orangeBg, border: `1px solid ${T.orange}55`, borderRadius: 12, padding: "1.1rem 1.25rem", marginBottom: 12 }}>
          <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 12, color: T.orange, textTransform: "uppercase", letterSpacing: 0.9, fontFamily: "'DM Sans', sans-serif" }}>🔁 Repeated cross-session patterns</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {analysis.repeatedPatterns.map((p, i) => <li key={i} style={{ fontSize: 13, color: "#9A3412", marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>{p}</li>)}
          </ul>
        </div>
      )}

      {analysis.predictions?.length > 0 && (
        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "1.1rem 1.25rem", marginBottom: 12 }}>
          <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 12, color: "#1D4ED8", textTransform: "uppercase", letterSpacing: 0.9, fontFamily: "'DM Sans', sans-serif" }}>⚡ Predicted future concerns</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {analysis.predictions.map((p, i) => <li key={i} style={{ fontSize: 13, color: "#1E40AF", marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>{p}</li>)}
          </ul>
        </div>
      )}

      {analysis.recommendedActions?.length > 0 && (
        <div style={{ background: T.successBg, border: `1px solid ${T.success}44`, borderRadius: 12, padding: "1.1rem 1.25rem" }}>
          <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 12, color: T.success, textTransform: "uppercase", letterSpacing: 0.9, fontFamily: "'DM Sans', sans-serif" }}>✔ Recommended therapist actions</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {analysis.recommendedActions.map((a, i) => <li key={i} style={{ fontSize: 13, color: "#065F46", marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>{a}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function InsCard({ title, items = [], accent, icon }) {
  return (
    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderTop: `3px solid ${accent}`, borderRadius: 12, padding: "1rem" }}>
      <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 11, color: accent, textTransform: "uppercase", letterSpacing: 0.9, fontFamily: "'DM Sans', sans-serif" }}>{icon} {title}</p>
      {items.length === 0 ? <p style={{ margin: 0, fontSize: 12, color: T.textLight, fontFamily: "'DM Sans', sans-serif" }}>None noted</p> : (
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {items.slice(0, 5).map((item, i) => <li key={i} style={{ fontSize: 12, color: T.textSec, marginBottom: 4, lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}

function SessionDetail({ session, patient }) {
  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ background: T.navy, borderRadius: 14, padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
        <p style={{ margin: 0, color: "#ffffff44", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>{patient?.name} · Session detail</p>
        <h2 style={{ margin: "6px 0 0", color: T.white, fontFamily: "'Lora', serif", fontSize: 20, fontWeight: 600 }}>
          {new Date(session.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </h2>
      </div>
      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: "1.25rem", marginBottom: "1.25rem" }}>
        <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 12, color: T.navy, textTransform: "uppercase", letterSpacing: 0.9, fontFamily: "'DM Sans', sans-serif" }}>Session notes</p>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.9, color: T.textSec, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif" }}>{session.note}</p>
      </div>
      {session.analysis ? <AnalysisView analysis={session.analysis} /> : <p style={{ color: T.textLight, fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>No analysis saved.</p>}
    </div>
  );
}

function Fld({ label, children, style }) {
  return <div style={style}><label style={{ fontSize: 12, fontWeight: 600, color: T.textSec, display: "block", marginBottom: 5, fontFamily: "'DM Sans', sans-serif" }}>{label}</label>{children}</div>;
}

function Inp({ value, onChange, placeholder, full }) {
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...inpStyle(), ...(full ? { width: "100%", boxSizing: "border-box" } : {}) }} />;
}

function PBtn({ children, onClick }) {
  return <button onClick={onClick} style={{ background: T.teal, color: T.white, border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{children}</button>;
}
function SBtn({ children, onClick }) {
  return <button onClick={onClick} style={{ background: T.white, color: T.textSec, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{children}</button>;
}

function inpStyle() {
  return { border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 13px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: T.textPrimary, background: T.white, outline: "none" };
}
