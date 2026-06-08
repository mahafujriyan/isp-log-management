"use client";

import "aos/dist/aos.css";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useInView,
} from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import type { Plan } from "@/types";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  Mail,
  Menu,
  Network,
  Play,
  Server,
  Shield,
  Sparkles,
  Star,
  Users,
  X,
  Zap,
} from "lucide-react";

const SALES_EMAIL = "admin@cyberlink.com";
const COMPANY = "Cyber Link Communication";

const STATS = [
  { value: 50,   suffix: "+",  label: "ISPs Managed" },
  { value: 99.9, suffix: "%",  label: "Uptime SLA"   },
  { value: 10,   suffix: "M+", label: "Logs / Day"   },
  { value: 24,   suffix: "/7", label: "Support"      },
];

const FEATURES = [
  { icon: Zap,     title: "Real-time Log Stream",  desc: "Live NAT/PPPoE syslog with sub-second polling, device filters, and anomaly highlighting.",           badge: "Live"       },
  { icon: Shield,  title: "Enterprise Security",   desc: "Role-based portals, isolated tenant schemas, and BTRC Bangladesh compliance built-in.",               badge: "Compliant"  },
  { icon: BarChart3,title: "Advanced Analytics",   desc: "Dynamic MikroTik charts — line, bar, and pie. Configure per tenant, export on demand.",               badge: "Charts"     },
  { icon: Globe,   title: "Multi-tenant Ready",    desc: "Scale from a single POP to nationwide operations. Full schema isolation per customer.",               badge: "Enterprise" },
  { icon: Network, title: "MikroTik Native",       desc: "RouterOS 6.x / 7.x. Auto-device discovery on first syslog packet.",                                  badge: "RouterOS"   },
  { icon: Server,  title: "BTRC Compliance",       desc: "Auto-export NAT logs in BTRC format, schedule submissions, full audit trail.",                        badge: "BD Gov."    },
];

const SHOWCASE_SLIDES = [
  { tag: "Operator Portal",  title: "Live Log Stream",    subtitle: "Real-time NAT/PPPoE entries — refreshed every 4 seconds",                    mockType: "stream" },
  { tag: "Analytics",        title: "Dynamic Charts",     subtitle: "MikroTik metrics visualised — traffic, bandwidth, protocol mix",              mockType: "chart"  },
  { tag: "Super Admin",      title: "Tenant Control",     subtitle: "Provision, suspend, and monitor every customer ISP in one panel",             mockType: "admin"  },
  { tag: "BTRC Module",      title: "Compliance Export",  subtitle: "One-click NAT log export in BTRC-certified CSV/JSON format",                  mockType: "btrc"   },
];

const TESTIMONIALS = [
  { quote: "We replaced three legacy tools with ISP LogServer. Our NOC finally has one clear view of the whole network.", name: "Karim Ahmed",   role: "CTO",                company: "Cyber Link Communication" },
  { quote: "BTRC export and tenant isolation saved us weeks of custom development.",                                      name: "Sadia Rahman",  role: "Head of Network Ops", company: "NetCore BD"               },
  { quote: "The analytics charts give visibility we never had on MikroTik traffic patterns.",                             name: "Imran Hossain", role: "ISP Operations Lead", company: "SwiftNet"                 },
  { quote: "Onboarding new NOC staff is 3× faster — everything they need, one portal.",                                  name: "Nusrat Jahan",  role: "Operations Manager",  company: "BroadBand Plus"           },
];

const FAQS = [
  { q: "Can I use my own domain?",              a: "Yes. Point your domain, configure SSL and AUTH_URL — live in under an hour on any VPS or cloud." },
  { q: "Is BTRC compliance built-in?",          a: "Yes. Export CSV/JSON in BTRC format, schedule automated submissions, and track full batch history." },
  { q: "How are customers isolated?",           a: "Each tenant ISP gets a dedicated PostgreSQL schema — logs, devices, users, and settings are fully isolated." },
  { q: "What MikroTik versions are supported?", a: "RouterOS 6.x and 7.x. Any device sending syslog UDP/TCP to the configured port is auto-discovered." },
  { q: "How do we get access?",                 a: "Contact our team. Admin and operator credentials are provisioned after onboarding — not from this website." },
];

const FALLBACK_PLANS = [
  { name: "Starter",    price_bdt: 2000,  max_users: 5,   max_devices: 2,   highlight: false },
  { name: "Pro",        price_bdt: 6000,  max_users: 20,  max_devices: 10,  highlight: true  },
  { name: "Business",   price_bdt: 15000, max_users: 100, max_devices: 50,  highlight: false },
  { name: "Enterprise", price_bdt: 0,     max_users: 999, max_devices: 999, highlight: false },
];

const MOCK_LOGS = [
  { user: "clc05@sohel3", ip: "10.55.120.44",  nat: "160.187.175.136", dest: "142.250.185.46", proto: "HTTPS" },
  { user: "01baharuddin", ip: "10.55.88.12",   nat: "160.187.175.137", dest: "104.21.45.12",  proto: "HTTPS" },
  { user: "shohid_net",   ip: "10.56.10.200",  nat: "160.187.175.138", dest: "8.8.8.8",       proto: "DNS"   },
  { user: "rifat_001",    ip: "10.57.4.11",    nat: "160.187.175.139", dest: "31.13.72.36",   proto: "HTTPS" },
  { user: "zakir_isp",    ip: "10.58.22.5",    nat: "160.187.175.140", dest: "52.94.236.248", proto: "HTTP"  },
  { user: "nabil_user",   ip: "10.60.1.33",    nat: "160.187.175.141", dest: "64.233.160.0",  proto: "HTTPS" },
  { user: "rafi_net",     ip: "10.61.5.9",     nat: "160.187.175.142", dest: "8.8.4.4",       proto: "DNS"   },
];

/* ─── helpers ─── */

function RunningCounter({ value, suffix, dark }: { value: number; suffix: string; dark?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 40, damping: 14 });
  const display = useTransform(spring, (v: number) =>
    value % 1 === 0 ? String(Math.round(v)) : v.toFixed(1)
  );
  useEffect(() => {
    if (!inView) return;
    mv.set(0);
    const t = setTimeout(() => mv.set(value), 50);
    return () => clearTimeout(t);
  }, [inView, mv, value]);

  return (
    <span ref={ref} className={dark ? "text-white" : "text-blue-700"}>
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
}

function StreamMock({ light }: { light?: boolean }) {
  const [rows, setRows] = useState(MOCK_LOGS.slice(0, 5));
  const idx = useRef(5);
  useEffect(() => {
    const t = setInterval(() => {
      const next = MOCK_LOGS[idx.current % MOCK_LOGS.length];
      idx.current++;
      setRows((prev) => [next, ...prev].slice(0, 6));
    }, 1800);
    return () => clearInterval(t);
  }, []);

  const bg  = light ? "bg-white border-blue-100"        : "bg-[#07111f] border-white/8";
  const hdr = light ? "bg-blue-50 border-blue-100"      : "bg-[#050e1a] border-white/8";
  const th  = light ? "text-blue-400"                   : "text-white/25";
  const protoStyle = (p: string) => light
    ? { HTTPS: "text-blue-600 bg-blue-50 border-blue-200", HTTP: "text-slate-500 bg-slate-50 border-slate-200", DNS: "text-blue-400 bg-blue-50 border-blue-100" }[p] ?? "text-slate-400 bg-slate-50 border-slate-100"
    : { HTTPS: "text-blue-300 bg-blue-500/10 border-blue-500/20", HTTP: "text-white/50 bg-white/5 border-white/10", DNS: "text-white/60 bg-white/5 border-white/10" }[p] ?? "text-white/40 bg-white/5 border-white/10";

  return (
    <div className={`overflow-hidden rounded-xl border ${bg}`}>
      <div className={`flex items-center gap-2 border-b px-4 py-2.5 ${hdr}`}>
        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        <span className={`text-[11px] font-medium ${light ? "text-blue-600" : "text-white/50"}`}>Live Stream</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold ${light ? "bg-blue-100 text-blue-600" : "bg-blue-500/10 text-blue-300"}`}>{rows.length} rows</span>
      </div>
      <div className={`grid grid-cols-4 border-b px-3 py-1.5 text-[9px] font-semibold uppercase tracking-widest ${light ? "border-blue-100 " + th : "border-white/5 " + th}`}>
        <span>User</span><span>IP</span><span>Destination</span><span>Proto</span>
      </div>
      <AnimatePresence initial={false}>
        {rows.map((r, i) => (
          <motion.div key={`${r.user}${i}`}
            initial={{ opacity: 0, y: -8, backgroundColor: light ? "rgba(219,234,254,0.5)" : "rgba(14,165,233,0.08)" }}
            animate={{ opacity: 1, y: 0, backgroundColor: "rgba(0,0,0,0)" }}
            transition={{ duration: 0.4 }}
            className={`grid grid-cols-4 items-center border-b px-3 py-2 ${light ? "border-blue-50" : "border-white/[0.04]"}`}>
            <span className={`truncate font-mono text-[11px] ${light ? "text-blue-700" : "text-blue-300"}`}>{r.user}</span>
            <span className={`font-mono text-[10px] ${light ? "text-slate-500" : "text-white/40"}`}>{r.ip}</span>
            <span className={`truncate font-mono text-[10px] ${light ? "text-slate-400" : "text-white/35"}`}>{r.dest}</span>
            <span className={`inline-block w-fit rounded border px-1.5 py-0.5 text-[9px] font-bold ${protoStyle(r.proto)}`}>{r.proto}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ChartMock({ light }: { light?: boolean }) {
  const BARS = [42,67,38,85,54,91,48,73,62,88,44,76];
  const [active, setActive] = useState(11);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % BARS.length), 1400);
    return () => clearInterval(t);
  }, []);
  const bg    = light ? "bg-white border-blue-100"   : "bg-[#07111f] border-white/8";
  const label = light ? "text-blue-500"              : "text-white/50";
  const axisC = light ? "text-blue-300"              : "text-white/20";
  const barA  = light ? "bg-blue-500"                : "bg-blue-400";
  const barI  = light ? "bg-blue-200"                : "bg-blue-600/50";
  const cardBg= light ? "bg-blue-50 border-blue-100" : "border-white/5 bg-white/[0.03]";
  const valC  = light ? "text-blue-700"              : "text-blue-300";
  const lblC  = light ? "text-slate-400"             : "text-white/30";
  return (
    <div className={`overflow-hidden rounded-xl border p-4 ${bg}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        <span className={`text-[11px] font-medium ${label}`}>Traffic — last 12 hours</span>
      </div>
      <div className="flex items-end gap-1.5" style={{ height: 100 }}>
        {BARS.map((h, i) => (
          <motion.div key={i}
            animate={{ height: `${active === i ? Math.min(h+12,100) : h}%`, opacity: active === i ? 1 : 0.55 }}
            transition={{ duration: 0.5 }}
            className={`flex-1 rounded-t-sm ${active === i ? barA : barI}`} />
        ))}
      </div>
      <div className={`mt-2 flex justify-between text-[9px] ${axisC}`}>
        <span>00:00</span><span>06:00</span><span>12:00</span><span>Now</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[["Logs today","12,847"],["Peak/h","1,340"],["Users","342"]].map(([l,v]) => (
          <div key={l} className={`rounded-lg border p-2 text-center ${cardBg}`}>
            <div className={`text-[13px] font-black ${valC}`}>{v}</div>
            <div className={`text-[9px] ${lblC}`}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminMock({ light }: { light?: boolean }) {
  const tenants = [
    { name: "Cyber Link",  users: 18 },
    { name: "NetCore BD",  users: 11 },
    { name: "SwiftNet",    users: 6  },
    { name: "BroadBand+",  users: 22 },
  ];
  const bg    = light ? "bg-white border-blue-100"      : "bg-[#07111f] border-white/8";
  const hdr   = light ? "bg-blue-50 border-blue-100"   : "bg-[#050e1a] border-white/8";
  const row   = light ? "border-blue-50"               : "divide-white/[0.04]";
  const nameC = light ? "text-slate-800"               : "text-white";
  const subC  = light ? "text-slate-400"               : "text-white/30";
  const badge = light ? "border-blue-200 bg-blue-50 text-blue-600" : "border-blue-500/20 bg-blue-500/10 text-blue-300";
  const hdrTx = light ? "text-blue-600"               : "text-white/50";
  const count = light ? "bg-blue-100 text-blue-600"   : "bg-blue-500/10 text-blue-300";
  return (
    <div className={`overflow-hidden rounded-xl border ${bg}`}>
      <div className={`flex items-center justify-between border-b px-4 py-2.5 ${hdr}`}>
        <span className={`text-[11px] font-medium ${hdrTx}`}>Tenant Manager</span>
        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${count}`}>4 active</span>
      </div>
      <div className={`divide-y ${row}`}>
        {tenants.map((t, i) => (
          <motion.div key={t.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12 }}
            className="flex items-center justify-between px-4 py-3">
            <div>
              <div className={`text-[12px] font-semibold ${nameC}`}>{t.name}</div>
              <div className={`text-[10px] ${subC}`}>{t.users} users</div>
            </div>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${badge}`}>Active</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function BtrcMock({ light }: { light?: boolean }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPct((p) => (p >= 100 ? 0 : p + 2)), 60);
    return () => clearInterval(t);
  }, []);
  const bg    = light ? "bg-white border-blue-100"     : "bg-[#07111f] border-white/8";
  const lblC  = light ? "text-blue-600"               : "text-white/50";
  const keyC  = light ? "text-slate-400"              : "text-white/30";
  const valC  = light ? "text-slate-700"              : "text-white/70";
  const trk   = light ? "bg-blue-100"                 : "bg-white/10";
  const pctC  = light ? "text-blue-600"               : "text-blue-300";
  const cardBg= light ? "bg-blue-50 border-blue-100"  : "border-white/5 bg-white/[0.03]";
  const numC  = light ? "text-blue-700"               : "text-blue-300";
  const numLb = light ? "text-slate-400"              : "text-white/30";
  return (
    <div className={`overflow-hidden rounded-xl border p-4 ${bg}`}>
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2 size={14} className="text-blue-500" />
        <span className={`text-[11px] font-medium ${lblC}`}>BTRC Compliance Export</span>
      </div>
      <div className="space-y-3">
        {[["ISP License","ISP-BD-CYBER-2024"],["Format","BTRC CSV v3.1"],["Period","Jun 1–7, 2026"]].map(([l,v]) => (
          <div key={l} className="flex justify-between text-[11px]">
            <span className={keyC}>{l}</span>
            <span className={`font-mono ${valC}`}>{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-[10px]">
          <span className={keyC}>Export progress</span>
          <span className={`font-bold ${pctC}`}>{pct}%</span>
        </div>
        <div className={`h-1.5 overflow-hidden rounded-full ${trk}`}>
          <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.06 }}
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[["Records","48,291"],["Status","✓ Ready"]].map(([l,v]) => (
          <div key={l} className={`rounded-lg border p-2 text-center ${cardBg}`}>
            <div className={`text-[13px] font-black ${numC}`}>{v}</div>
            <div className={`text-[9px] ${numLb}`}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShowcaseMock({ type, light }: { type: string; light?: boolean }) {
  if (type === "stream") return <StreamMock light={light} />;
  if (type === "chart")  return <ChartMock  light={light} />;
  if (type === "admin")  return <AdminMock  light={light} />;
  return <BtrcMock light={light} />;
}

/* ═══════════════════════ MAIN ═══════════════════════ */
export function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [plans, setPlans] = useState<typeof FALLBACK_PLANS>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [navScrolled, setNavScrolled] = useState(false);
  const [slide, setSlide] = useState(0);
  const slideTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: "start", dragFree: true }, [
    Autoplay({ delay: 4500, stopOnInteraction: false }),
  ]);

  const resetSlideTimer = useCallback(() => {
    if (slideTimer.current) clearInterval(slideTimer.current);
    slideTimer.current = setInterval(() => setSlide((s) => (s + 1) % SHOWCASE_SLIDES.length), 4000);
  }, []);

  useEffect(() => {
    import("aos").then((AOS) => AOS.init({ duration: 800, once: true, offset: 50 }));
    fetch("/api/plans").then((r) => r.json())
      .then((d) => { if (Array.isArray(d) && d.length) setPlans(d as typeof FALLBACK_PLANS); })
      .catch(() => {});
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    resetSlideTimer();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (slideTimer.current) clearInterval(slideTimer.current);
    };
  }, [resetSlideTimer]);

  function goSlide(n: number) {
    setSlide((s) => (s + n + SHOWCASE_SLIDES.length) % SHOWCASE_SLIDES.length);
    resetSlideTimer();
  }

  const pricing = plans.length
    ? plans.slice(0, 4).map((p, i) => ({ ...p, highlight: i === 1 }))
    : FALLBACK_PLANS;

  const cur = SHOWCASE_SLIDES[slide];
  /* slide index: 0–1 = light section, 2–3 = blue section */
  const showcaseLight = slide < 2;

  /* floating particles */
  const DOTS = Array.from({ length: 16 }, (_, i) => ({
    x: (i * 41) % 88 + 6, y: (i * 53) % 78 + 11, delay: i * 0.4
  }));

  return (
    /* ── full-page white → blue gradient ── */
    <div className="min-h-screen overflow-x-hidden landing-bg text-slate-900">

      {/* ═══ NAV ═══ */}
      <nav className={`fixed top-0 z-50 w-full transition-all duration-500 ${
        navScrolled
          ? "border-b border-blue-100/80 bg-white/95 backdrop-blur-2xl shadow-md shadow-blue-100/40"
          : "bg-transparent"
      }`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <a href="#" className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-sm font-black text-white shadow-lg shadow-blue-300/40">
              CL
              <div className="absolute inset-0 animate-shimmer opacity-40" />
            </div>
            <span className="text-[17px] font-black tracking-tight text-blue-900">
              ISP<span className="text-blue-500"> Log</span>Server
            </span>
          </a>

          <div className="hidden items-center gap-7 md:flex">
            {[["#features","Features"],["#showcase","Platform"],["#pricing","Pricing"],["#faq","FAQ"]].map(([href, label]) => (
              <a key={href} href={href} className="text-[13px] font-medium text-blue-800/70 transition hover:text-blue-700">
                {label}
              </a>
            ))}
            <motion.a whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              href={`mailto:${SALES_EMAIL}?subject=ISP%20LogServer%20Demo`}
              className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-blue-300/40">
              Request Demo
            </motion.a>
          </div>
          <button type="button" className="rounded-xl border border-blue-200 p-2 md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={18} className="text-blue-700" /> : <Menu size={18} className="text-blue-700" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-blue-100 bg-white/98 backdrop-blur-xl">
              <div className="flex flex-col gap-1 px-4 pb-5 pt-3">
                {[["#features","Features"],["#showcase","Platform"],["#pricing","Pricing"],["#faq","FAQ"]].map(([href,label]) => (
                  <a key={href} href={href} onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-3 py-3 text-sm text-blue-700 hover:bg-blue-50">{label}</a>
                ))}
                <a href={`mailto:${SALES_EMAIL}`}
                  className="mt-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-center text-sm font-bold text-white">
                  Contact Sales
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ═══ HERO (white section) ═══ */}
      <section className="relative flex min-h-screen items-center overflow-hidden px-4 pt-24 pb-20 sm:px-6">
        {/* subtle grid on white */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0"
            style={{ backgroundImage: "linear-gradient(rgba(59,130,246,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.05) 1px,transparent 1px)", backgroundSize: "56px 56px" }} />
          {/* soft blue glow blobs */}
          <div className="absolute left-[10%] top-[15%] h-[500px] w-[500px] rounded-full bg-blue-200/30 blur-[140px]" style={{ animation: "blob-move 16s ease-in-out infinite" }} />
          <div className="absolute right-[5%] bottom-[10%] h-[380px] w-[380px] rounded-full bg-sky-200/25 blur-[110px]" style={{ animation: "blob-move 12s ease-in-out infinite", animationDelay: "3s" }} />
          {/* floating dots */}
          {DOTS.map((d, i) => (
            <motion.div key={i} className="absolute rounded-full bg-blue-400/20"
              style={{ left: `${d.x}%`, top: `${d.y}%`, width: 2, height: 2 }}
              animate={{ y: [0, -60, 0], opacity: [0, 0.6, 0] }}
              transition={{ duration: 6 + d.delay * 0.5, repeat: Infinity, delay: d.delay }} />
          ))}
          {/* scan line (very subtle on white) */}
          <div className="animate-scan absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-300/20 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
            {/* left */}
            <motion.div initial={{ opacity: 0, x: -36 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.85 }}>
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-[11px] font-semibold text-blue-600 shadow-sm">
                <Sparkles size={12} className="text-blue-500" />
                Built for Bangladesh ISPs · BTRC Ready · v2.0
              </motion.div>

              <h1 className="text-[2.8rem] font-black leading-[1.06] tracking-tight text-blue-950 sm:text-6xl xl:text-[4.2rem]">
                Professional<br />
                <span className="text-shimmer">ISP Log Management</span><br />
                <span className="text-blue-600">Platform</span>
              </h1>

              <p className="mt-6 max-w-[500px] text-[15px] leading-relaxed text-blue-800/60 sm:text-[16px]">
                Real-time NAT/PPPoE monitoring, MikroTik analytics, multi-tenant isolation and BTRC compliance — one secure platform.
              </p>

              <div className="mt-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] text-blue-600 shadow-sm">
                  <Activity size={11} className="animate-pulse text-blue-500" />
                  Live data · 12,847 logs processed today
                </div>
              </div>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <motion.a whileHover={{ scale: 1.04, boxShadow: "0 12px 36px rgba(59,130,246,0.35)" }} whileTap={{ scale: 0.97 }}
                  href={`mailto:${SALES_EMAIL}?subject=ISP%20LogServer%20Demo%20Request`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-9 py-4 text-[15px] font-black text-white shadow-xl shadow-blue-300/40">
                  <Play size={15} fill="white" /> Request Live Demo
                </motion.a>
                <motion.a whileHover={{ scale: 1.02 }} href="#features"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white/80 px-9 py-4 text-[15px] font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50">
                  Explore Features <ArrowRight size={15} />
                </motion.a>
              </div>

              <div className="mt-9 flex flex-wrap gap-2.5">
                {["BTRC Certified","Multi-tenant","RouterOS Native","99.9% Uptime"].map((b) => (
                  <span key={b} className="flex items-center gap-1.5 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-[11px] text-blue-600 shadow-sm">
                    <CheckCircle2 size={10} className="text-blue-500 shrink-0" /> {b}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* right — live dashboard (white card) */}
            <motion.div initial={{ opacity: 0, x: 36 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.85, delay: 0.1 }}
              className="relative" style={{ animation: "float-y 7s ease-in-out infinite" }}>
              <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-blue-200/40 to-sky-200/30 blur-3xl" />
              <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl shadow-blue-200/50">
                {/* title bar */}
                <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50/80 px-4 py-3">
                  <div className="h-3 w-3 rounded-full bg-blue-200" />
                  <div className="h-3 w-3 rounded-full bg-blue-300" />
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="ml-3 text-[11px] text-blue-400">ISP LogServer — Live Stream</span>
                  <div className="ml-auto flex items-center gap-1.5 rounded-full bg-blue-100 px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-medium text-blue-600">Live</span>
                  </div>
                </div>
                {/* metrics */}
                <div className="grid grid-cols-3 divide-x divide-blue-100 border-b border-blue-100">
                  {[["12,847","Logs today"],["342","Active users"],["8","Devices"]].map(([v,l]) => (
                    <div key={l} className="py-3 text-center">
                      <div className="text-xl font-black text-blue-700">{v}</div>
                      <div className="text-[10px] text-blue-400">{l}</div>
                    </div>
                  ))}
                </div>
                {/* live table */}
                <div className="max-h-[220px] overflow-hidden">
                  <StreamMock light />
                </div>
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-white to-transparent" />
              </div>

              {/* floating badges */}
              <motion.div animate={{ y: [0,-7,0] }} transition={{ repeat: Infinity, duration: 4 }}
                className="absolute -left-5 top-10 hidden rounded-xl border border-blue-100 bg-white p-3 shadow-xl shadow-blue-100 lg:block">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100"><Zap size={15} className="text-blue-600" /></div>
                  <div><div className="text-[11px] font-bold text-blue-900">Live Stream</div><div className="text-[10px] text-blue-500">342 active users</div></div>
                </div>
              </motion.div>
              <motion.div animate={{ y: [0,7,0] }} transition={{ repeat: Infinity, duration: 5, delay: 1 }}
                className="absolute -right-5 bottom-10 hidden rounded-xl border border-blue-100 bg-white p-3 shadow-xl shadow-blue-100 lg:block">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100"><Shield size={15} className="text-blue-600" /></div>
                  <div><div className="text-[11px] font-bold text-blue-900">BTRC Ready</div><div className="text-[10px] text-blue-500">Export in 1 click</div></div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
        <a href="#stats" className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <ChevronDown size={20} className="animate-bounce text-blue-300" />
        </a>
      </section>

      {/* ═══ STATS (transition zone — white-to-blue) ═══ */}
      <section id="stats" className="relative py-0">
        {/* light white section */}
        <div className="relative border-y border-blue-100 bg-white/60 backdrop-blur-sm">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid grid-cols-2 divide-x divide-blue-100/80 sm:grid-cols-4">
              {STATS.map((s, i) => (
                <motion.div key={s.label}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="py-12 text-center">
                  <div className="text-4xl font-black tabular-nums sm:text-5xl">
                    <RunningCounter value={s.value} suffix={s.suffix} />
                  </div>
                  <div className="mt-2 text-[12px] font-semibold uppercase tracking-widest text-blue-400/80">{s.label}</div>
                  <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 0.6 }}
                    className="mx-auto mt-4 h-[2px] w-8 origin-left rounded-full bg-blue-400/60" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES (light blue-tinted section) ═══ */}
      <section id="features" className="relative px-4 py-28 sm:px-6">
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-16 text-center" data-aos="fade-up">
            <span className="mb-4 inline-block rounded-full border border-blue-200 bg-white px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-600 shadow-sm">
              Capabilities
            </span>
            <h2 className="text-3xl font-black text-blue-950 sm:text-[2.8rem]">Everything your ISP needs</h2>
            <p className="mx-auto mt-4 max-w-xl text-[14px] text-blue-700/60">
              From syslog ingestion to multi-tenant billing — engineered for ISPs that demand scale, compliance, and visibility.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }} transition={{ delay: i * 0.07 }}
                whileHover={{ y: -8, transition: { duration: 0.22 } }}
                className="group relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-8 shadow-sm shadow-blue-100/60 transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/80">
                {/* hover shimmer */}
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 to-transparent" />
                </div>
                <div className="relative">
                  <div className="mb-5 flex h-13 w-13 items-center justify-center rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100 p-3.5 shadow-sm">
                    <f.icon size={22} className="text-blue-600" />
                  </div>
                  <div className="mb-3 flex items-start justify-between">
                    <h3 className="text-[17px] font-bold text-blue-950">{f.title}</h3>
                    <span className="ml-2 shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-600">
                      {f.badge}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-blue-700/55">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SHOWCASE (mid-blue section) ═══ */}
      <section id="showcase" className="relative overflow-hidden px-4 py-28 sm:px-6">
        {/* this area is the blue-purple zone of the gradient */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-white/10 blur-[100px]" />
          <div className="absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full bg-blue-300/15 blur-[80px]" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-14 text-center" data-aos="fade-up">
            <span className="mb-4 inline-block rounded-full border border-white/30 bg-white/20 px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur">
              Platform Preview
            </span>
            <h2 className="text-3xl font-black text-white sm:text-[2.8rem]">See it in action</h2>
            <p className="mx-auto mt-4 max-w-lg text-[14px] text-blue-100/70">
              Four core modules — rotating live previews every 4 seconds.
            </p>
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* tab selector */}
            <div className="flex flex-col gap-3">
              {SHOWCASE_SLIDES.map((s, i) => (
                <motion.button key={s.title} type="button"
                  onClick={() => { setSlide(i); resetSlideTimer(); }}
                  whileHover={{ x: 4 }}
                  className={`flex items-start gap-4 rounded-xl border p-5 text-left transition-all ${
                    slide === i
                      ? "border-white/30 bg-white/20 shadow-lg backdrop-blur"
                      : "border-white/10 bg-white/5 hover:border-white/20 backdrop-blur"
                  }`}>
                  <div className={`mt-0.5 shrink-0 rounded-lg p-2 ${slide === i ? "bg-white/20" : "bg-white/10"}`}>
                    {i === 0 && <Activity size={16} className={slide === i ? "text-white" : "text-white/40"} />}
                    {i === 1 && <BarChart3 size={16} className={slide === i ? "text-white" : "text-white/40"} />}
                    {i === 2 && <Users size={16} className={slide === i ? "text-white" : "text-white/40"} />}
                    {i === 3 && <Shield size={16} className={slide === i ? "text-white" : "text-white/40"} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-200/70">{s.tag}</div>
                    <div className={`mt-0.5 text-[15px] font-bold ${slide === i ? "text-white" : "text-white/50"}`}>{s.title}</div>
                    <div className="mt-1 text-[12px] text-blue-100/50">{s.subtitle}</div>
                  </div>
                  {slide === i && (
                    <div className="mt-1 shrink-0">
                      <div className="h-5 w-5 overflow-hidden rounded-full bg-white/15">
                        <motion.div className="h-full bg-white/70"
                          initial={{ width: "0%" }} animate={{ width: "100%" }}
                          transition={{ duration: 4, ease: "linear" }} key={slide} />
                      </div>
                    </div>
                  )}
                </motion.button>
              ))}
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => goSlide(-1)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white/50 backdrop-blur hover:border-white/30 hover:text-white">
                  <ChevronLeft size={16} />
                </button>
                <button type="button" onClick={() => goSlide(1)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white/50 backdrop-blur hover:border-white/30 hover:text-white">
                  <ChevronRight size={16} />
                </button>
                <span className="ml-2 self-center text-[11px] text-white/30">{slide + 1} / {SHOWCASE_SLIDES.length}</span>
              </div>
            </div>

            {/* mockup */}
            <AnimatePresence mode="wait">
              <motion.div key={slide}
                initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }} transition={{ duration: 0.45 }}
                className="relative" style={{ animation: "float-y-slow 9s ease-in-out infinite" }}>
                <div className={`absolute -inset-5 rounded-3xl blur-2xl ${showcaseLight ? "bg-white/20" : "bg-blue-300/15"}`} />
                <ShowcaseMock type={cur.mockType} light />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ═══ PRICING (deep blue section) ═══ */}
      <section id="pricing" className="relative px-4 py-28 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center" data-aos="fade-up">
            <span className="mb-4 inline-block rounded-full border border-white/25 bg-white/15 px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur">
              Pricing
            </span>
            <h2 className="text-3xl font-black text-white sm:text-[2.8rem]">Flexible, transparent pricing</h2>
            <p className="mx-auto mt-4 max-w-md text-[14px] text-blue-100/60">All plans include BTRC compliance, tenant isolation, and premium support.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4" data-aos="fade-up" data-aos-delay="80">
            {pricing.map((plan) => (
              <motion.div key={plan.name} whileHover={{ y: -8, scale: 1.02 }}
                className={`relative flex flex-col overflow-hidden rounded-2xl border p-7 backdrop-blur transition-shadow ${
                  plan.highlight
                    ? "border-white/40 bg-white/20 shadow-2xl shadow-blue-900/30"
                    : "border-white/10 bg-white/8 hover:border-white/20"
                }`}>
                {plan.highlight && (
                  <div className="absolute right-4 top-4 rounded-full bg-white px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-700">Popular</div>
                )}
                <h3 className="text-[19px] font-black text-white">{plan.name}</h3>
                <div className="mt-4">
                  <span className="text-[2.4rem] font-black text-white">
                    {plan.price_bdt ? plan.price_bdt.toLocaleString() : "Custom"}
                  </span>
                  {plan.price_bdt ? <span className="ml-1 text-[13px] text-white/50">BDT / mo</span> : null}
                </div>
                <ul className="mt-6 flex-1 space-y-2.5 text-[13px]">
                  {[
                    `${plan.max_users === 999 ? "Unlimited" : plan.max_users} users`,
                    `${(plan as { max_devices?: number }).max_devices === 999 ? "Unlimited" : (plan as { max_devices?: number }).max_devices ?? "—"} devices`,
                    "Full analytics","BTRC compliance","Multi-tenant logs","Priority support",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-white/70">
                      <CheckCircle2 size={13} className="shrink-0 text-blue-200" /> {item}
                    </li>
                  ))}
                </ul>
                <a href={`mailto:${SALES_EMAIL}?subject=Plan%20inquiry%3A%20${encodeURIComponent(plan.name)}`}
                  className={`mt-7 block w-full rounded-xl py-3 text-center text-[13px] font-bold transition ${
                    plan.highlight
                      ? "bg-white text-blue-700 hover:bg-blue-50 shadow-lg"
                      : "border border-white/20 text-white/70 hover:border-white/40 hover:text-white"
                  }`}>
                  {plan.price_bdt ? "Get Started" : "Contact Sales"}
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS (dark blue zone) ═══ */}
      <section className="relative border-y border-white/10 py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-14 text-center" data-aos="fade-up">
            <span className="mb-4 inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-100 backdrop-blur">
              Testimonials
            </span>
            <h2 className="text-3xl font-black text-white sm:text-[2.8rem]">Trusted by ISPs</h2>
          </div>
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex gap-5">
              {TESTIMONIALS.map((t) => (
                <motion.div key={t.name} whileHover={{ scale: 1.02 }}
                  className="min-w-0 flex-[0_0_90%] rounded-2xl border border-white/15 bg-white/10 p-8 backdrop-blur sm:flex-[0_0_50%] lg:flex-[0_0_33%]">
                  <div className="mb-4 flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={13} fill="#93c5fd" className="text-blue-300" />)}
                  </div>
                  <p className="text-[14px] leading-relaxed text-white/80">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-[13px] font-black text-white">
                      {t.name[0]}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-white">{t.name}</div>
                      <div className="text-[11px] text-blue-200/60">{t.role} · {t.company}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="mt-8 flex justify-center gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button key={i} type="button" onClick={() => embla?.scrollTo(i)}
                className={`h-1.5 rounded-full transition-all ${i === 0 ? "w-6 bg-white/70" : "w-1.5 bg-white/20"}`} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="mx-auto max-w-2xl px-4 py-28 sm:px-6">
        <div className="mb-12 text-center" data-aos="fade-up">
          <h2 className="text-3xl font-black text-white sm:text-[2.8rem]">FAQ</h2>
          <p className="mt-3 text-[14px] text-blue-100/50">Common questions about the platform.</p>
        </div>
        <div className="space-y-2">
          {FAQS.map((f, i) => (
            <motion.div key={f.q} data-aos="fade-up" data-aos-delay={i * 50}
              className={`overflow-hidden rounded-xl border backdrop-blur transition-all ${
                openFaq === i
                  ? "border-white/30 bg-white/15"
                  : "border-white/10 bg-white/[0.06] hover:border-white/20"
              }`}>
              <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-5 text-left text-[14px] font-semibold text-white/90">
                {f.q}
                <ChevronDown size={16} className={`shrink-0 transition-transform duration-300 ${openFaq === i ? "rotate-180 text-white" : "text-white/30"}`} />
              </button>
              <AnimatePresence initial={false}>
                {openFaq === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                    <p className="px-6 pb-5 text-[13px] leading-relaxed text-blue-100/60">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative overflow-hidden border-t border-white/10 py-28 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/3 top-0 h-80 w-80 rounded-full bg-white/10 blur-[90px]" style={{ animation: "blob-move 12s ease-in-out infinite" }} />
          <div className="absolute right-1/3 bottom-0 h-64 w-64 rounded-full bg-blue-300/10 blur-[70px]" style={{ animation: "blob-move 9s ease-in-out infinite", animationDelay: "2s" }} />
        </div>
        <div className="relative mx-auto max-w-xl px-4 sm:px-6" data-aos="zoom-in">
          <div className="mb-7 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-white/30 to-white/10 shadow-2xl shadow-blue-900/30 backdrop-blur border border-white/25" style={{ animation: "glow-pulse 3s ease-in-out infinite" }}>
            <Zap size={36} fill="white" className="text-white" />
          </div>
          <h2 className="text-3xl font-black text-white sm:text-[2.6rem]">Ready to transform your NOC?</h2>
          <p className="mx-auto mt-5 max-w-md text-[15px] text-blue-100/60">
            Talk to our team. We&apos;ll onboard your ISP, provision portals, and configure MikroTik integration — in hours, not days.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <motion.a whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              href={`mailto:${SALES_EMAIL}?subject=ISP%20LogServer%20Sales%20Inquiry`}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-10 py-4 text-[15px] font-black text-blue-700 shadow-xl shadow-blue-900/30 transition hover:bg-blue-50">
              <Mail size={17} /> Contact Sales
            </motion.a>
            <motion.a whileHover={{ scale: 1.03 }}
              href={`mailto:${SALES_EMAIL}?subject=ISP%20LogServer%20Demo%20Request`}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-10 py-4 text-[15px] font-semibold text-white backdrop-blur transition hover:border-white/40">
              Request Demo <ArrowRight size={15} />
            </motion.a>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/10 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-[11px] font-black text-white backdrop-blur">CL</div>
            <div>
              <div className="text-[13px] font-bold text-white/80">ISP LogServer</div>
              <div className="text-[11px] text-white/30">{COMPANY}</div>
            </div>
          </div>
          <nav className="flex flex-wrap justify-center gap-6 text-[12px] text-white/30">
            {[["#features","Features"],["#pricing","Pricing"],["#faq","FAQ"]].map(([href,label]) => (
              <a key={href} href={href} className="hover:text-white/70 transition-colors">{label}</a>
            ))}
            <a href={`mailto:${SALES_EMAIL}`} className="hover:text-white/70 transition-colors">Contact</a>
          </nav>
          <p className="text-[11px] text-white/15">© {new Date().getFullYear()} {COMPANY}</p>
        </div>
      </footer>
    </div>
  );
}
