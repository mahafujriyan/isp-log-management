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
import { DemoRequestModal } from "@/components/marketing/DemoRequestModal";
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

const COMPANY = "Cyber Link Communication";

const STATS = [
  { value: 50,   suffix: "+",  label: "ISPs Managed" },
  { value: 99.9, suffix: "%",  label: "Uptime SLA"   },
  { value: 10,   suffix: "M+", label: "Logs / Day"   },
  { value: 24,   suffix: "/7", label: "Support"      },
];

const FEATURES = [
  { icon: Zap,      title: "Real-time Log Stream",  desc: "Live NAT/PPPoE syslog with sub-second polling, device filters, and anomaly highlighting.",     badge: "Live"       },
  { icon: Shield,   title: "Enterprise Security",   desc: "Role-based portals, isolated tenant schemas, and BTRC Bangladesh compliance built-in.",         badge: "Compliant"  },
  { icon: BarChart3,title: "Advanced Analytics",    desc: "Dynamic MikroTik charts — line, bar, and pie. Configure per tenant, export on demand.",         badge: "Charts"     },
  { icon: Globe,    title: "Multi-tenant Ready",    desc: "Scale from a single POP to nationwide operations. Full schema isolation per customer.",         badge: "Enterprise" },
  { icon: Network,  title: "MikroTik Native",       desc: "RouterOS 6.x / 7.x. Auto-device discovery on first syslog packet.",                            badge: "RouterOS"   },
  { icon: Server,   title: "BTRC Compliance",       desc: "Auto-export NAT logs in BTRC format, schedule submissions, full audit trail.",                  badge: "BD Gov."    },
];

const SHOWCASE_SLIDES = [
  { tag: "Operator Portal", title: "Live Log Stream",   subtitle: "Real-time NAT/PPPoE entries — refreshed every 4 seconds",             mockType: "stream" },
  { tag: "Analytics",       title: "Dynamic Charts",    subtitle: "MikroTik metrics visualised — traffic, bandwidth, protocol mix",      mockType: "chart"  },
  { tag: "Super Admin",     title: "Tenant Control",    subtitle: "Provision, suspend, and monitor every customer ISP in one panel",     mockType: "admin"  },
  { tag: "BTRC Module",     title: "Compliance Export", subtitle: "One-click NAT log export in BTRC-certified CSV/JSON format",          mockType: "btrc"   },
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
  { user: "clc05@sohel3", ip: "10.55.120.44",  dest: "142.250.185.46", proto: "HTTPS" },
  { user: "01baharuddin", ip: "10.55.88.12",   dest: "104.21.45.12",  proto: "HTTPS" },
  { user: "shohid_net",   ip: "10.56.10.200",  dest: "8.8.8.8",       proto: "DNS"   },
  { user: "rifat_001",    ip: "10.57.4.11",    dest: "31.13.72.36",   proto: "HTTPS" },
  { user: "zakir_isp",    ip: "10.58.22.5",    dest: "52.94.236.248", proto: "HTTP"  },
  { user: "nabil_user",   ip: "10.60.1.33",    dest: "64.233.160.0",  proto: "HTTPS" },
];

/* ─── Running counter ─── */
function RunningCounter({ value, suffix }: { value: number; suffix: string }) {
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
  return <span ref={ref} className="text-blue-600"><motion.span>{display}</motion.span>{suffix}</span>;
}

/* ─── Live stream mockup ─── */
function StreamMock() {
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
  const proto = (p: string) => ({
    HTTPS: "text-blue-600 bg-blue-50 border-blue-200",
    HTTP:  "text-slate-500 bg-slate-50 border-slate-200",
    DNS:   "text-blue-400 bg-blue-50 border-blue-100",
  }[p] ?? "text-slate-400 bg-slate-50 border-slate-200");

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-[11px] font-medium text-slate-500">Live Stream</span>
        <span className="ml-auto rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600">{rows.length} rows</span>
      </div>
      <div className="grid grid-cols-4 border-b border-slate-100 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-widest text-slate-400">
        <span>User</span><span>IP</span><span>Destination</span><span>Proto</span>
      </div>
      <AnimatePresence initial={false}>
        {rows.map((r, i) => (
          <motion.div key={`${r.user}${i}`}
            initial={{ opacity: 0, y: -8, backgroundColor: "rgba(219,234,254,0.4)" }}
            animate={{ opacity: 1, y: 0, backgroundColor: "rgba(0,0,0,0)" }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-4 items-center border-b border-slate-50 px-3 py-2">
            <span className="truncate font-mono text-[11px] text-blue-600 font-semibold">{r.user}</span>
            <span className="font-mono text-[10px] text-slate-400">{r.ip}</span>
            <span className="truncate font-mono text-[10px] text-slate-400">{r.dest}</span>
            <span className={`inline-block w-fit rounded border px-1.5 py-0.5 text-[9px] font-bold ${proto(r.proto)}`}>{r.proto}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─── Chart mockup ─── */
function ChartMock() {
  const BARS = [42,67,38,85,54,91,48,73,62,88,44,76];
  const [active, setActive] = useState(11);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % BARS.length), 1400);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-[11px] font-medium text-slate-500">Traffic — last 12 hours</span>
      </div>
      <div className="flex items-end gap-1.5" style={{ height: 100 }}>
        {BARS.map((h, i) => (
          <motion.div key={i}
            animate={{ height: `${active===i ? Math.min(h+12,100) : h}%`, opacity: active===i ? 1 : 0.4 }}
            transition={{ duration: 0.5 }}
            className={`flex-1 rounded-t-sm ${active===i ? "bg-blue-500" : "bg-blue-200"}`} />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[9px] text-slate-400">
        <span>00:00</span><span>06:00</span><span>12:00</span><span>Now</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[["Logs today","12,847"],["Peak/h","1,340"],["Users","342"]].map(([l,v]) => (
          <div key={l} className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-center">
            <div className="text-[13px] font-black text-blue-600">{v}</div>
            <div className="text-[9px] text-slate-400">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Admin mockup ─── */
function AdminMock() {
  const tenants = [
    { name: "Cyber Link",  users: 18 },
    { name: "NetCore BD",  users: 11 },
    { name: "SwiftNet",    users: 6  },
    { name: "BroadBand+",  users: 22 },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <span className="text-[11px] font-medium text-slate-500">Tenant Manager</span>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600">4 active</span>
      </div>
      <div className="divide-y divide-slate-50">
        {tenants.map((t, i) => (
          <motion.div key={t.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12 }}
            className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-[12px] font-semibold text-slate-800">{t.name}</div>
              <div className="text-[10px] text-slate-400">{t.users} users</div>
            </div>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600">Active</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── BTRC mockup ─── */
function BtrcMock() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPct((p) => (p >= 100 ? 0 : p + 2)), 60);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2 size={14} className="text-blue-500" />
        <span className="text-[11px] font-medium text-slate-500">BTRC Compliance Export</span>
      </div>
      <div className="space-y-3">
        {[["ISP License","ISP-BD-CYBER-2024"],["Format","BTRC CSV v3.1"],["Period","Jun 1–7, 2026"]].map(([l,v]) => (
          <div key={l} className="flex justify-between text-[11px]">
            <span className="text-slate-400">{l}</span>
            <span className="font-mono text-slate-700">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-[10px]">
          <span className="text-slate-400">Export progress</span>
          <span className="font-bold text-blue-600">{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.06 }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[["Records","48,291"],["Status","✓ Ready"]].map(([l,v]) => (
          <div key={l} className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-center">
            <div className="text-[13px] font-black text-blue-600">{v}</div>
            <div className="text-[9px] text-slate-400">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShowcaseMock({ type }: { type: string }) {
  if (type === "stream") return <StreamMock />;
  if (type === "chart")  return <ChartMock />;
  if (type === "admin")  return <AdminMock />;
  return <BtrcMock />;
}

/* ═══════════════ MAIN ═══════════════ */
export function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoPlan, setDemoPlan] = useState("");
  const [demoTitle, setDemoTitle] = useState("Request a Live Demo");
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

  function openDemo(opts?: { plan?: string; title?: string }) {
    setDemoPlan(opts?.plan ?? "");
    setDemoTitle(opts?.title ?? "Request a Live Demo");
    setDemoOpen(true);
    setMobileOpen(false);
  }

  const pricing = plans.length
    ? plans.slice(0, 4).map((p, i) => ({ ...p, highlight: i === 1 }))
    : FALLBACK_PLANS;
  const cur = SHOWCASE_SLIDES[slide];

  return (
    <div className="landing-bg min-h-screen overflow-x-hidden text-slate-900">

      {/* ═══ NAV ═══ */}
      <nav className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        navScrolled ? "border-b border-slate-200 bg-white shadow-sm" : "bg-white/90 backdrop-blur"
      }`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="#" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white shadow-md shadow-blue-200">CL</div>
            <span className="text-[17px] font-black tracking-tight text-slate-900">
              ISP<span className="text-blue-600"> Log</span>Server
            </span>
          </a>
          <div className="hidden items-center gap-8 md:flex">
            {[["#features","Features"],["#showcase","Platform"],["#pricing","Pricing"],["#faq","FAQ"]].map(([href,label]) => (
              <a key={href} href={href} className="text-[13px] font-medium text-slate-500 hover:text-blue-600 transition-colors">{label}</a>
            ))}
            <motion.button type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => openDemo()}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition-colors">
              Request Demo
            </motion.button>
          </div>
          <button type="button" className="rounded-xl border border-slate-200 p-2 md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={18} className="text-blue-600" /> : <Menu size={18} className="text-slate-600" />}
          </button>
        </div>
        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-slate-100 bg-white">
              <div className="flex flex-col gap-1 px-4 pb-5 pt-3">
                {[["#features","Features"],["#showcase","Platform"],["#pricing","Pricing"],["#faq","FAQ"]].map(([href,label]) => (
                  <a key={href} href={href} onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-3 py-3 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600">{label}</a>
                ))}
                <button type="button" onClick={() => openDemo({ title: "Contact Sales" })}
                  className="mt-2 rounded-xl bg-blue-600 py-3 text-center text-sm font-bold text-white">
                  Contact Sales
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden px-4 pb-20 pt-28 sm:px-6">
        {/* very subtle blue grid */}
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "linear-gradient(rgba(59,130,246,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.04) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
        {/* light blue glow — barely visible on white */}
        <div className="pointer-events-none absolute left-[5%] top-[10%] h-[500px] w-[500px] rounded-full bg-blue-100/60 blur-[150px]" />
        <div className="pointer-events-none absolute right-[5%] bottom-0 h-[400px] w-[400px] rounded-full bg-blue-50/80 blur-[120px]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">

            {/* left */}
            <motion.div initial={{ opacity: 0, x: -32 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-[11px] font-semibold text-blue-600">
                <Sparkles size={12} /> Built for Bangladesh ISPs · BTRC Ready · v2.0
              </motion.div>

              <h1 className="text-[2.8rem] font-black leading-[1.06] tracking-tight text-slate-900 sm:text-6xl xl:text-[4rem]">
                Professional<br />
                <span className="text-blue-600">ISP Log</span><br />
                Management Platform
              </h1>

              <p className="mt-6 max-w-[480px] text-[15px] leading-relaxed text-slate-500">
                Real-time NAT/PPPoE monitoring, MikroTik analytics, multi-tenant isolation and BTRC compliance — one secure platform.
              </p>

              <div className="mt-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] text-blue-600">
                  <Activity size={11} className="animate-pulse" /> Live · 12,847 logs processed today
                </span>
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                <motion.button type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => openDemo()}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-[15px] font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors">
                  <Play size={15} fill="white" /> Request Demo
                </motion.button>
                <motion.a whileHover={{ scale: 1.02 }} href="#features"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-4 text-[15px] font-semibold text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-600 transition-colors">
                  Explore Features <ArrowRight size={15} />
                </motion.a>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                {["BTRC Certified","Multi-tenant","RouterOS Native","99.9% Uptime"].map((b) => (
                  <span key={b} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-500 shadow-sm">
                    <CheckCircle2 size={10} className="text-blue-500 shrink-0" /> {b}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* right — live dashboard */}
            <motion.div initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
              className="relative" style={{ animation: "float-y 7s ease-in-out infinite" }}>
              <div className="absolute -inset-4 rounded-3xl bg-blue-100/40 blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/80">
                {/* titlebar */}
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="h-3 w-3 rounded-full bg-slate-200" />
                  <div className="h-3 w-3 rounded-full bg-slate-300" />
                  <div className="h-3 w-3 rounded-full bg-blue-400" />
                  <span className="ml-3 text-[11px] text-slate-400">ISP LogServer — Live Stream</span>
                  <div className="ml-auto flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 border border-blue-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-medium text-blue-600">Live</span>
                  </div>
                </div>
                {/* metrics */}
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                  {[["12,847","Logs today"],["342","Active users"],["8","Devices"]].map(([v,l]) => (
                    <div key={l} className="py-3 text-center">
                      <div className="text-xl font-black text-blue-600">{v}</div>
                      <div className="text-[10px] text-slate-400">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="max-h-[210px] overflow-hidden">
                  <StreamMock />
                </div>
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent" />
              </div>

              {/* floating badges */}
              <motion.div animate={{ y: [0,-7,0] }} transition={{ repeat: Infinity, duration: 4 }}
                className="absolute -left-5 top-10 hidden rounded-xl border border-slate-200 bg-white p-3 shadow-lg lg:block">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50"><Zap size={15} className="text-blue-600" /></div>
                  <div><div className="text-[11px] font-bold text-slate-800">Live Stream</div><div className="text-[10px] text-blue-500">342 active users</div></div>
                </div>
              </motion.div>
              <motion.div animate={{ y: [0,7,0] }} transition={{ repeat: Infinity, duration: 5, delay: 1 }}
                className="absolute -right-5 bottom-10 hidden rounded-xl border border-slate-200 bg-white p-3 shadow-lg lg:block">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50"><Shield size={15} className="text-blue-600" /></div>
                  <div><div className="text-[11px] font-bold text-slate-800">BTRC Ready</div><div className="text-[10px] text-blue-500">1-click export</div></div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
        <a href="#stats" className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <ChevronDown size={18} className="animate-bounce text-blue-300" />
        </a>
      </section>

      {/* ═══ STATS ═══ */}
      <section id="stats" className="border-y border-slate-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-2 divide-x divide-slate-100 sm:grid-cols-4">
            {STATS.map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="py-10 text-center">
                <div className="text-4xl font-black tabular-nums sm:text-5xl">
                  <RunningCounter value={s.value} suffix={s.suffix} />
                </div>
                <div className="mt-1.5 text-[12px] font-medium uppercase tracking-widest text-slate-400">{s.label}</div>
                <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.6 }}
                  className="mx-auto mt-3 h-0.5 w-8 origin-left rounded-full bg-blue-400" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="mb-14 text-center" data-aos="fade-up">
          <span className="mb-3 inline-block rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-600">
            Capabilities
          </span>
          <h2 className="text-3xl font-black text-slate-900 sm:text-[2.6rem]">Everything your ISP needs</h2>
          <p className="mx-auto mt-3 max-w-xl text-[14px] text-slate-500">
            From syslog ingestion to multi-tenant billing — engineered for scale, compliance, and visibility.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }} transition={{ delay: i * 0.07 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-sm hover:border-blue-200 hover:shadow-md transition-all">
              <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 to-transparent" />
              </div>
              <div className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
                  <f.icon size={20} className="text-blue-600" />
                </div>
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="text-[16px] font-bold text-slate-900">{f.title}</h3>
                  <span className="ml-2 shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-600">
                    {f.badge}
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed text-slate-500">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ SHOWCASE — blue background section ═══ */}
      <section id="showcase" className="relative overflow-hidden bg-blue-600 px-4 py-24 sm:px-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: "linear-gradient(white 1px,transparent 1px),linear-gradient(90deg,white 1px,transparent 1px)", backgroundSize: "50px 50px" }} />
          <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-white/10 blur-[100px]" />
          <div className="absolute right-1/4 bottom-0 h-80 w-80 rounded-full bg-blue-400/20 blur-[80px]" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-12 text-center" data-aos="fade-up">
            <span className="mb-3 inline-block rounded-full border border-white/30 bg-white/15 px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
              Platform Preview
            </span>
            <h2 className="text-3xl font-black text-white sm:text-[2.6rem]">See it in action</h2>
            <p className="mx-auto mt-3 max-w-lg text-[14px] text-blue-100/80">4 core modules — rotating live previews every 4 seconds.</p>
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            {/* tabs */}
            <div className="flex flex-col gap-3">
              {SHOWCASE_SLIDES.map((s, i) => (
                <motion.button key={s.title} type="button"
                  onClick={() => { setSlide(i); resetSlideTimer(); }}
                  whileHover={{ x: 4 }}
                  className={`flex items-start gap-4 rounded-xl border p-5 text-left transition-all ${
                    slide === i
                      ? "border-white/40 bg-white/20 backdrop-blur"
                      : "border-white/10 bg-white/5 hover:border-white/25"
                  }`}>
                  <div className={`mt-0.5 shrink-0 rounded-lg p-2 ${slide===i ? "bg-white/25" : "bg-white/10"}`}>
                    {i===0 && <Activity  size={16} className={slide===i ? "text-white" : "text-white/50"} />}
                    {i===1 && <BarChart3 size={16} className={slide===i ? "text-white" : "text-white/50"} />}
                    {i===2 && <Users     size={16} className={slide===i ? "text-white" : "text-white/50"} />}
                    {i===3 && <Shield    size={16} className={slide===i ? "text-white" : "text-white/50"} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-200/80">{s.tag}</div>
                    <div className={`mt-0.5 text-[15px] font-bold ${slide===i ? "text-white" : "text-white/55"}`}>{s.title}</div>
                    <div className="mt-1 text-[12px] text-blue-100/60">{s.subtitle}</div>
                  </div>
                  {slide===i && (
                    <div className="mt-1 shrink-0 h-5 w-5 overflow-hidden rounded-full bg-white/20">
                      <motion.div className="h-full bg-white/80" initial={{ width: "0%" }} animate={{ width: "100%" }}
                        transition={{ duration: 4, ease: "linear" }} key={slide} />
                    </div>
                  )}
                </motion.button>
              ))}
              <div className="mt-1 flex gap-2">
                <button type="button" onClick={() => goSlide(-1)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/60 hover:bg-white/20 hover:text-white">
                  <ChevronLeft size={16} />
                </button>
                <button type="button" onClick={() => goSlide(1)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/60 hover:bg-white/20 hover:text-white">
                  <ChevronRight size={16} />
                </button>
                <span className="ml-2 self-center text-[11px] text-white/30">{slide+1} / {SHOWCASE_SLIDES.length}</span>
              </div>
            </div>

            {/* mockup */}
            <AnimatePresence mode="wait">
              <motion.div key={slide}
                initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: 0.4 }}
                className="relative" style={{ animation: "float-y-slow 9s ease-in-out infinite" }}>
                <div className="absolute -inset-4 rounded-3xl bg-white/10 blur-2xl" />
                <ShowcaseMock type={cur.mockType} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="mb-14 text-center" data-aos="fade-up">
          <span className="mb-3 inline-block rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-600">Pricing</span>
          <h2 className="text-3xl font-black text-slate-900 sm:text-[2.6rem]">Flexible, transparent pricing</h2>
          <p className="mx-auto mt-3 max-w-md text-[14px] text-slate-500">All plans include BTRC compliance, tenant isolation, and premium support.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4" data-aos="fade-up" data-aos-delay="80">
          {pricing.map((plan) => (
            <motion.div key={plan.name} whileHover={{ y: -8 }}
              className={`relative flex flex-col rounded-2xl border p-7 transition-shadow ${
                plan.highlight
                  ? "border-blue-500 bg-blue-600 shadow-xl shadow-blue-200"
                  : "border-slate-200 bg-white shadow-sm hover:border-blue-200 hover:shadow-md"
              }`}>
              {plan.highlight && (
                <div className="absolute right-4 top-4 rounded-full bg-white px-2.5 py-0.5 text-[9px] font-black uppercase text-blue-600">Popular</div>
              )}
              <h3 className={`text-[18px] font-black ${plan.highlight ? "text-white" : "text-slate-900"}`}>{plan.name}</h3>
              <div className="mt-4">
                <span className={`text-[2.2rem] font-black ${plan.highlight ? "text-white" : "text-blue-600"}`}>
                  {plan.price_bdt ? plan.price_bdt.toLocaleString() : "Custom"}
                </span>
                {plan.price_bdt ? <span className={`ml-1 text-[12px] ${plan.highlight ? "text-blue-100" : "text-slate-400"}`}>BDT / mo</span> : null}
              </div>
              <ul className="mt-5 flex-1 space-y-2.5 text-[13px]">
                {[
                  `${plan.max_users===999 ? "Unlimited" : plan.max_users} users`,
                  `${(plan as { max_devices?: number }).max_devices===999 ? "Unlimited" : (plan as { max_devices?: number }).max_devices ?? "—"} devices`,
                  "Full analytics","BTRC compliance","Multi-tenant logs","Priority support",
                ].map((item) => (
                  <li key={item} className={`flex items-center gap-2 ${plan.highlight ? "text-blue-100" : "text-slate-500"}`}>
                    <CheckCircle2 size={13} className={`shrink-0 ${plan.highlight ? "text-blue-200" : "text-blue-500"}`} /> {item}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => openDemo({ plan: plan.name, title: plan.price_bdt ? "Get Started" : "Contact Sales" })}
                className={`mt-7 block w-full rounded-xl py-3 text-center text-[13px] font-bold transition ${
                  plan.highlight
                    ? "bg-white text-blue-600 hover:bg-blue-50"
                    : "border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}>
                {plan.price_bdt ? "Get Started" : "Contact Sales"}
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="border-y border-slate-100 bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center" data-aos="fade-up">
            <span className="mb-3 inline-block rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-600">Testimonials</span>
            <h2 className="text-3xl font-black text-slate-900 sm:text-[2.6rem]">Trusted by ISPs</h2>
          </div>
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex gap-5">
              {TESTIMONIALS.map((t) => (
                <motion.div key={t.name} whileHover={{ scale: 1.02 }}
                  className="min-w-0 flex-[0_0_90%] rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:flex-[0_0_50%] lg:flex-[0_0_33%]">
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({length:5}).map((_,i) => <Star key={i} size={13} fill="#3b82f6" className="text-blue-500" />)}
                  </div>
                  <p className="text-[14px] leading-relaxed text-slate-600">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[13px] font-black text-white">{t.name[0]}</div>
                    <div>
                      <div className="text-[13px] font-semibold text-slate-800">{t.name}</div>
                      <div className="text-[11px] text-slate-400">{t.role} · {t.company}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex justify-center gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button key={i} type="button" onClick={() => embla?.scrollTo(i)}
                className={`h-1.5 rounded-full transition-all ${i===0 ? "w-6 bg-blue-500" : "w-1.5 bg-slate-300"}`} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
        <div className="mb-10 text-center" data-aos="fade-up">
          <h2 className="text-3xl font-black text-slate-900 sm:text-[2.6rem]">FAQ</h2>
          <p className="mt-2 text-[14px] text-slate-500">Common questions about the platform.</p>
        </div>
        <div className="space-y-2">
          {FAQS.map((f, i) => (
            <motion.div key={f.q} data-aos="fade-up" data-aos-delay={i*50}
              className={`overflow-hidden rounded-xl border transition-all ${
                openFaq===i ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-100"
              }`}>
              <button type="button" onClick={() => setOpenFaq(openFaq===i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-5 text-left text-[14px] font-semibold text-slate-800">
                {f.q}
                <ChevronDown size={16} className={`shrink-0 transition-transform duration-300 ${openFaq===i ? "rotate-180 text-blue-600" : "text-slate-400"}`} />
              </button>
              <AnimatePresence initial={false}>
                {openFaq===i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                    <p className="px-6 pb-5 text-[13px] leading-relaxed text-slate-500">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ CTA — blue section ═══ */}
      <section className="bg-blue-600 px-4 py-24 text-center sm:px-6">
        <div className="mx-auto max-w-xl" data-aos="zoom-in">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
            <Zap size={30} fill="white" className="text-white" />
          </div>
          <h2 className="text-3xl font-black text-white sm:text-[2.4rem]">Ready to transform your NOC?</h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-blue-100/80">
            Talk to our team. We&apos;ll onboard your ISP, provision portals, and configure MikroTik integration in hours — not days.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              onClick={() => openDemo({ title: "Contact Sales" })}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-10 py-4 text-[15px] font-black text-blue-600 shadow-lg hover:bg-blue-50 transition-colors">
              <Mail size={17} /> Contact Sales
            </motion.button>
            <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => openDemo()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-10 py-4 text-[15px] font-semibold text-white hover:bg-white/20 transition-colors">
              Request Demo <ArrowRight size={15} />
            </motion.button>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-slate-200 bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-[11px] font-black text-white">CL</div>
            <span className="text-[13px] font-bold text-slate-700">ISP LogServer</span>
            <span className="text-[12px] text-slate-400">· {COMPANY}</span>
          </div>
          <nav className="flex gap-6 text-[12px] text-slate-400">
            {[["#features","Features"],["#pricing","Pricing"],["#faq","FAQ"]].map(([href,label]) => (
              <a key={href} href={href} className="hover:text-blue-600 transition-colors">{label}</a>
            ))}
            <button type="button" onClick={() => openDemo({ title: "Contact Us" })} className="hover:text-blue-600 transition-colors">Contact</button>
          </nav>
          <p className="text-[11px] text-slate-400">© {new Date().getFullYear()} {COMPANY}</p>
        </div>
      </footer>

      <DemoRequestModal
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        defaultPlan={demoPlan}
        title={demoTitle}
      />
    </div>
  );
}
