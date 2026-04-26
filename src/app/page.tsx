"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Script from "next/script";

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

const i18n = {
  en: {
    tagline: "Community Achievement Records",
    nav_leaderboard: "Leaderboard", nav_categories: "Categories",
    nav_recent: "Recent", nav_submit: "+ Submit Record",
    stat_records: "Total Records", stat_players: "Players", stat_categories: "Categories",
    all_records: "All Records", search_placeholder: "Search player or category...",
    filter_all: "All categories", col_rank: "Rank", col_player: "Player",
    col_time: "Time / Score", col_date: "Date", col_status: "Status",
    modal_title: "Submit a Record", form_ign: "In-Game Name",
    form_ign_placeholder: "Your Minecraft username", form_category: "Category",
    form_type: "Record Type", type_time: "Time (fastest)", type_score: "Score (highest)",
    type_count: "Count (most)", form_time_label: "Time (mm:ss.ms)",
    form_score_label: "Score", form_count_label: "Count",
    form_date: "Date Achieved", form_proof: "Proof Link (video / screenshot)",
    form_proof_ph: "https://...", form_notes: "Notes (optional)",
    form_notes_ph: "Conditions, seed, details...",
    btn_cancel: "Cancel", btn_submit: "Submit Record",
    badge_verified: "verified", badge_pending: "pending",
    empty: "No records yet. Be the first to claim glory.",
    toast_success: "Record submitted — awaiting review.",
    toast_error: "Please fill in all required fields.",
    login_required: "You must log in with Discord to submit a record.",
    login_btn: "Login with Discord", logout_btn: "Logout",
    logged_in_as: "Logged in as", records_label: "records",
    footer_text: "Community Records · Not an official GateCraft page",
  },
  cs: {
    tagline: "Komunitní záznamy o výkonech hráčů",
    nav_leaderboard: "Žebříček", nav_categories: "Kategorie",
    nav_recent: "Nedávné", nav_submit: "+ Přidat rekord",
    stat_records: "Celkem rekordů", stat_players: "Hráčů", stat_categories: "Kategorií",
    all_records: "Všechny rekordy", search_placeholder: "Hledat hráče nebo kategorii...",
    filter_all: "Všechny kategorie", col_rank: "Pořadí", col_player: "Hráč",
    col_time: "Čas / Skóre", col_date: "Datum", col_status: "Stav",
    modal_title: "Přidat rekord", form_ign: "Herní jméno",
    form_ign_placeholder: "Tvůj Minecraft nick", form_category: "Kategorie",
    form_type: "Typ rekordu", type_time: "Čas (nejrychlejší)", type_score: "Skóre (nejvyšší)",
    type_count: "Počet (nejvíce)", form_time_label: "Čas (mm:ss.ms)",
    form_score_label: "Skóre", form_count_label: "Počet",
    form_date: "Datum dosažení", form_proof: "Důkaz (video / screenshot)",
    form_proof_ph: "https://...", form_notes: "Poznámky (volitelné)",
    form_notes_ph: "Podmínky, seed, detaily...",
    btn_cancel: "Zrušit", btn_submit: "Odeslat rekord",
    badge_verified: "ověřeno", badge_pending: "čeká",
    empty: "Zatím žádné rekordy. Buď první, kdo zazáří.",
    toast_success: "Rekord odeslán — čeká na schválení.",
    toast_error: "Vyplň prosím všechna povinná pole.",
    login_required: "Pro přidání rekordu se musíš přihlásit přes Discord.",
    login_btn: "Přihlásit přes Discord", logout_btn: "Odhlásit",
    logged_in_as: "Přihlášen jako", records_label: "rekordů",
    footer_text: "Komunitní rekordy · Neoficiální stránka GateCraft",
  },
};

const CATEGORIES = [
  { id: "wither",  en: "Wither Kill",     cs: "Zabití Withera",   icon: "💀" },
  { id: "creeper", en: "Creeper Kill",    cs: "Zabití Creepera",  icon: "💚" },
  { id: "ender",   en: "Ender Dragon",    cs: "Ender Drak",       icon: "🐉" },
  { id: "blaze",   en: "Blaze Run",       cs: "Zabití Blazů",     icon: "🔥" },
  { id: "diamond", en: "Diamond Rush",    cs: "Závod o Diamant",  icon: "💎" },
  { id: "bedrock", en: "Spawn to Nether", cs: "Spawn do Netheru", icon: "⚡" },
];

type Lang = "en" | "cs";
type Rec = { id: number; player: string; category: string; value: string; record_type: string; status: string; achieved_at: string; };

declare global { interface Window { grecaptcha: any; } }

export default function Home() {
  const { data: session } = useSession();
  const [lang, setLang] = useState<Lang>("en");
  const [tab, setTab] = useState<"leaderboard"|"categories"|"recent">("leaderboard");
  const [records, setRecords] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [form, setForm] = useState({ player:"", category:"wither", value:"", record_type:"time", proof_url:"", notes:"", achieved_at: new Date().toISOString().slice(0,10) });

  const T = i18n[lang];
  const catName = (c: typeof CATEGORIES[0]) => lang === "cs" ? c.cs : c.en;
  const getCat = (id: string) => CATEGORIES.find(c => c.id === id) || CATEGORIES[0];

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (catFilter) p.set("category", catFilter);
    if (search) p.set("search", search);
    const res = await fetch("/api/records?" + p.toString());
    const data = await res.json();
    setRecords(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [catFilter, search]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const showToast = (msg: string) => {
    setToast(msg); setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3500);
  };

  const submitRecord = async () => {
    if (!form.player || !form.value || !form.achieved_at) { showToast(T.toast_error); return; }
    let token = "";
    try { token = await window.grecaptcha.execute(SITE_KEY, { action: "submit" }); } catch {}
    const res = await fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, recaptchaToken: token }),
    });
    if (res.ok) {
      setModal(false); showToast(T.toast_success); fetchRecords();
      setForm({ player:"", category:"wither", value:"", record_type:"time", proof_url:"", notes:"", achieved_at: new Date().toISOString().slice(0,10) });
    } else {
      const err = await res.json();
      showToast(err.error || T.toast_error);
    }
  };

  const rankLabel = (i: number) => i < 3 ? ["I","II","III"][i] : "#"+(i+1);
  const rankColor = (i: number) => (["text-yellow-400","text-gray-300","text-amber-600"] as string[])[i] || "text-stone-500";
  const rowBg = (i: number) => (["bg-yellow-900/5","bg-gray-900/5","bg-amber-900/5"] as string[])[i] || "";
  const uniquePlayers = new Set(records.map(r => r.player)).size;

  const TableHeader = () => (
    <div className="grid grid-cols-[48px_1fr_130px_100px_80px] px-4 py-3 bg-[#110e0b] border-b border-[#2e2418] text-[10px] font-serif tracking-[0.15em] uppercase text-amber-900/70">
      <span>{T.col_rank}</span><span>{T.col_player}</span><span>{T.col_time}</span><span>{T.col_date}</span><span>{T.col_status}</span>
    </div>
  );

  const StatusBadge = ({ status }: { status: string }) => (
    <span className={`text-[10px] font-serif tracking-wider uppercase px-2 py-0.5 border w-fit ${status === "verified" ? "text-emerald-600 border-emerald-900/40 bg-emerald-950/20" : "text-amber-600 border-amber-900/40 bg-amber-950/20"}`}>
      {status === "verified" ? T.badge_verified : T.badge_pending}
    </span>
  );

  const SectionTitle = ({ label }: { label: string }) => (
    <div className="font-serif text-xs tracking-[0.25em] uppercase text-amber-700 mb-5 flex items-center gap-4">
      <span className="h-px flex-1 bg-[#2e2418]" />{label}<span className="h-px flex-1 bg-[#2e2418]" />
    </div>
  );

  return (
    <>
      <Script src={`https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`} strategy="afterInteractive" />

      <header className="relative bg-[#0e0c0a] border-b border-[#2e2418] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(200,164,90,0.06)_0%,transparent_70%)] pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 py-8 text-center relative">
          <div className="absolute top-4 right-4 flex items-center gap-3">
            {session?.user && <span className="text-xs text-stone-500 font-serif italic hidden sm:block">{T.logged_in_as} <span className="text-amber-600">{session.user.name}</span></span>}
            {session
              ? <button onClick={() => signOut()} className="text-xs font-serif tracking-widest uppercase text-stone-500 border border-[#2e2418] px-3 py-1.5 hover:border-amber-800 hover:text-amber-600 transition-colors">{T.logout_btn}</button>
              : <button onClick={() => signIn("discord")} className="text-xs font-serif tracking-widest uppercase text-amber-600 border border-amber-800/50 px-3 py-1.5 hover:bg-amber-900/20 transition-colors">{T.login_btn}</button>
            }
            <div className="flex gap-1">
              {(["en","cs"] as Lang[]).map(l => (
                <button key={l} onClick={() => setLang(l)} className={`text-xs font-serif tracking-widest px-2.5 py-1 border transition-colors ${lang===l ? "border-amber-800 text-amber-600 bg-amber-900/10" : "border-[#2e2418] text-stone-500 hover:border-amber-900 hover:text-amber-700"}`}>{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <p className="text-[10px] font-serif tracking-[0.4em] uppercase text-amber-800/70 mb-2">GateCraft · HardCore RPG</p>
          <div className="flex items-center justify-center gap-3 text-amber-900/40 mb-2 tracking-[0.5em]">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-amber-900/40 block" />✦<span className="h-px w-12 bg-gradient-to-l from-transparent to-amber-900/40 block" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-[0.15em] uppercase text-amber-100/90 mb-2">Records</h1>
          <p className="text-stone-500 italic font-serif text-sm">{T.tagline}</p>
        </div>
      </header>

      <nav className="bg-[#0e0c0a] border-b border-[#1e1a14] flex justify-center flex-wrap">
        {(["leaderboard","categories","recent"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`font-serif text-xs tracking-[0.15em] uppercase px-5 py-4 border-b-2 transition-colors ${tab===t ? "border-amber-700 text-amber-500" : "border-transparent text-stone-500 hover:text-amber-700"}`}>
            {T[("nav_"+t) as keyof typeof T]}
          </button>
        ))}
        <button onClick={() => { if (!session) { showToast(T.login_required); return; } setModal(true); }}
          className="font-serif text-xs tracking-[0.15em] uppercase px-5 py-3 my-1.5 mx-3 ml-auto border border-amber-800/60 text-amber-600 hover:bg-amber-900/15 transition-colors">
          {T.nav_submit}
        </button>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {tab === "leaderboard" && <>
          <div className="grid grid-cols-3 gap-3 mb-8">
            {([[records.length, T.stat_records],[uniquePlayers, T.stat_players],[CATEGORIES.length, T.stat_categories]] as [number|string, string][]).map(([n,label]) => (
              <div key={label} className="relative bg-[#0e0c0a] border border-[#2e2418] p-4 text-center">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-900/40 to-transparent" />
                <div className="font-serif text-3xl text-amber-100/80 mb-1">{n}</div>
                <div className="text-[10px] font-serif tracking-widest uppercase text-stone-500">{label}</div>
              </div>
            ))}
          </div>
          <SectionTitle label={T.all_records} />
          <div className="flex gap-3 mb-5 flex-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={T.search_placeholder}
              className="flex-1 min-w-[160px] bg-[#0e0c0a] border border-[#2e2418] text-stone-300 px-4 py-2.5 font-serif text-sm italic placeholder-stone-600 outline-none focus:border-amber-900 transition-colors" />
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className="bg-[#0e0c0a] border border-[#2e2418] text-stone-400 px-4 py-2.5 font-serif text-sm outline-none focus:border-amber-900 transition-colors w-48 cursor-pointer">
              <option value="">{T.filter_all}</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {catName(c)}</option>)}
            </select>
          </div>
          <div className="border border-[#2e2418] bg-[#0e0c0a] mb-8">
            <TableHeader />
            {loading ? <div className="text-center py-14 text-stone-600 italic font-serif text-sm">Loading...</div>
            : records.length === 0 ? <div className="text-center py-14 text-stone-600 italic font-serif text-sm">{T.empty}</div>
            : records.map((r,i) => {
              const cat = getCat(r.category);
              return (
                <div key={r.id} className={`grid grid-cols-[48px_1fr_130px_100px_80px] px-4 py-3.5 border-b border-[#1a1510] items-center hover:bg-[#130f0c] transition-colors ${rowBg(i)}`}>
                  <span className={`font-serif text-xs tracking-wider text-center ${rankColor(i)}`}>{rankLabel(i)}</span>
                  <div>
                    <div className="font-serif text-sm text-amber-100/80 tracking-wide">{r.player}</div>
                    <div className="text-xs italic text-stone-500 mt-0.5">{cat.icon} {catName(cat)}</div>
                  </div>
                  <span className="font-serif text-base text-amber-600 tracking-wider">{r.value}</span>
                  <span className="text-xs italic text-stone-500">{r.achieved_at?.slice(0,10)}</span>
                  <StatusBadge status={r.status} />
                </div>
              );
            })}
          </div>
        </>}

        {tab === "categories" && <>
          <SectionTitle label={T.nav_categories} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORIES.map(c => {
              const count = records.filter(r => r.category === c.id).length;
              return (
                <div key={c.id} onClick={() => { setCatFilter(c.id); setTab("leaderboard"); }}
                  className="relative bg-[#0e0c0a] border border-[#2e2418] p-5 text-center cursor-pointer hover:border-amber-800/60 transition-colors group">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2e2418] to-transparent group-hover:via-amber-900/40 transition-all" />
                  <div className="text-2xl mb-2">{c.icon}</div>
                  <div className="font-serif text-xs tracking-[0.15em] uppercase text-amber-100/70 mb-1">{catName(c)}</div>
                  <div className="text-xs italic text-stone-500">{count} {T.records_label}</div>
                </div>
              );
            })}
          </div>
        </>}

        {tab === "recent" && <>
          <SectionTitle label={T.nav_recent} />
          <div className="border border-[#2e2418] bg-[#0e0c0a]">
            <TableHeader />
            {[...records].sort((a,b) => new Date(b.achieved_at).getTime()-new Date(a.achieved_at).getTime()).slice(0,10).map((r,i) => {
              const cat = getCat(r.category);
              return (
                <div key={r.id} className="grid grid-cols-[48px_1fr_130px_100px_80px] px-4 py-3.5 border-b border-[#1a1510] items-center hover:bg-[#130f0c] transition-colors">
                  <span className="font-serif text-xs tracking-wider text-center text-stone-500">#{i+1}</span>
                  <div>
                    <div className="font-serif text-sm text-amber-100/80 tracking-wide">{r.player}</div>
                    <div className="text-xs italic text-stone-500 mt-0.5">{cat.icon} {catName(cat)}</div>
                  </div>
                  <span className="font-serif text-base text-amber-600 tracking-wider">{r.value}</span>
                  <span className="text-xs italic text-stone-500">{r.achieved_at?.slice(0,10)}</span>
                  <StatusBadge status={r.status} />
                </div>
              );
            })}
            {records.length === 0 && <div className="text-center py-14 text-stone-600 italic font-serif text-sm">{T.empty}</div>}
          </div>
        </>}

      </main>

      <footer className="border-t border-[#1e1a14] text-center py-6 text-stone-600 italic font-serif text-xs">
        <a href="https://gatecraft.eu" target="_blank" className="text-amber-900 hover:text-amber-700 transition-colors">gatecraft.eu</a>
        {" · "}{T.footer_text}
      </footer>

      {modal && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="relative bg-[#0e0c0a] border border-[#2e2418] w-full max-w-lg max-h-[90vh] overflow-y-auto p-8">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-900/50 to-transparent" />
            <h2 className="font-serif text-xs tracking-[0.3em] uppercase text-amber-600 text-center mb-6">{T.modal_title}</h2>
            <div className="space-y-4">
              <div>
                <label className="block font-serif text-[10px] tracking-widest uppercase text-amber-900/70 mb-1.5">{T.form_ign}</label>
                <input value={form.player} onChange={e => setForm(f=>({...f,player:e.target.value}))} placeholder={T.form_ign_placeholder}
                  className="w-full bg-[#080605] border border-[#2e2418] text-stone-300 px-4 py-2.5 font-serif text-sm italic placeholder-stone-700 outline-none focus:border-amber-900 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-serif text-[10px] tracking-widest uppercase text-amber-900/70 mb-1.5">{T.form_category}</label>
                  <select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}
                    className="w-full bg-[#080605] border border-[#2e2418] text-stone-300 px-4 py-2.5 font-serif text-sm outline-none focus:border-amber-900 transition-colors cursor-pointer">
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {catName(c)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-serif text-[10px] tracking-widest uppercase text-amber-900/70 mb-1.5">{T.form_type}</label>
                  <select value={form.record_type} onChange={e => setForm(f=>({...f,record_type:e.target.value}))}
                    className="w-full bg-[#080605] border border-[#2e2418] text-stone-300 px-4 py-2.5 font-serif text-sm outline-none focus:border-amber-900 transition-colors cursor-pointer">
                    <option value="time">{T.type_time}</option>
                    <option value="score">{T.type_score}</option>
                    <option value="count">{T.type_count}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-serif text-[10px] tracking-widest uppercase text-amber-900/70 mb-1.5">{form.record_type==="time" ? T.form_time_label : form.record_type==="score" ? T.form_score_label : T.form_count_label}</label>
                  <input value={form.value} onChange={e => setForm(f=>({...f,value:e.target.value}))} placeholder={form.record_type==="time"?"0:14.23":form.record_type==="score"?"99999":"47"}
                    className="w-full bg-[#080605] border border-[#2e2418] text-stone-300 px-4 py-2.5 font-serif text-sm italic placeholder-stone-700 outline-none focus:border-amber-900 transition-colors" />
                </div>
                <div>
                  <label className="block font-serif text-[10px] tracking-widest uppercase text-amber-900/70 mb-1.5">{T.form_date}</label>
                  <input type="date" value={form.achieved_at} onChange={e => setForm(f=>({...f,achieved_at:e.target.value}))}
                    className="w-full bg-[#080605] border border-[#2e2418] text-stone-300 px-4 py-2.5 font-serif text-sm outline-none focus:border-amber-900 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block font-serif text-[10px] tracking-widest uppercase text-amber-900/70 mb-1.5">{T.form_proof}</label>
                <input value={form.proof_url} onChange={e => setForm(f=>({...f,proof_url:e.target.value}))} placeholder={T.form_proof_ph}
                  className="w-full bg-[#080605] border border-[#2e2418] text-stone-300 px-4 py-2.5 font-serif text-sm italic placeholder-stone-700 outline-none focus:border-amber-900 transition-colors" />
              </div>
              <div>
                <label className="block font-serif text-[10px] tracking-widest uppercase text-amber-900/70 mb-1.5">{T.form_notes}</label>
                <textarea value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder={T.form_notes_ph} rows={2}
                  className="w-full bg-[#080605] border border-[#2e2418] text-stone-300 px-4 py-2.5 font-serif text-sm italic placeholder-stone-700 outline-none focus:border-amber-900 transition-colors resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(false)} className="font-serif text-xs tracking-widest uppercase px-5 py-3 border border-[#2e2418] text-stone-500 hover:border-stone-600 hover:text-stone-400 transition-colors">{T.btn_cancel}</button>
              <button onClick={submitRecord} className="flex-1 font-serif text-xs tracking-widest uppercase py-3 border border-amber-800/60 text-amber-600 hover:bg-amber-900/15 transition-colors">{T.btn_submit}</button>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed bottom-6 right-6 bg-[#0e0c0a] border border-amber-900/60 text-amber-600 font-serif text-xs tracking-wider px-5 py-3 transition-all duration-300 z-[200] ${toastVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"}`}>
        {toast}
      </div>
    </>
  );
}