// Shared UI primitives — keep every page visually consistent.

export function Card({ children, className = "" }) {
  return (
    <div className={`bg-panel border border-line rounded-lg ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ icon: Icon, title, right }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
        {Icon && <Icon size={15} className="text-muted" />}
        {title}
      </div>
      {right}
    </div>
  );
}

export function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="text-[13px] text-muted mt-0.5">{subtitle}</p>}
    </div>
  );
}

const TONES = {
  up:      "text-up bg-up/10",
  down:    "text-down bg-down/10",
  warn:    "text-warn bg-warn/10",
  accent:  "text-accent bg-accent/10",
  neutral: "text-muted bg-muted/10",
};

export function Badge({ tone = "neutral", children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded
      text-[11px] font-semibold tracking-wide ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function toneFor(value) {
  if (value === "BUY" || value === "STRONG_BUY" || value === "UP") return "up";
  if (value === "SELL" || value === "STRONG_SELL" || value === "DOWN") return "down";
  return "warn";
}

export function Stat({ label, value, tone, sub }) {
  const color = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-ink";
  return (
    <Card className="px-5 py-4">
      <div className="text-[11px] uppercase tracking-wider text-faint font-medium mb-1.5">
        {label}
      </div>
      <div className={`text-xl font-semibold tnum ${color}`}>{value}</div>
      {sub && <div className="text-[12px] text-muted mt-1">{sub}</div>}
    </Card>
  );
}

export function Empty({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-faint">
      {Icon && <Icon size={32} className="mb-3 opacity-40" />}
      <span className="text-[13px]">{text}</span>
    </div>
  );
}

export function cleanSym(s = "") {
  return s.replace("USDT", "").replace(".NS", "").replace("^", "");
}

// DB timestamps are stored UTC with no tz marker ("YYYY-MM-DD HH:MM:SS").
// Parse as UTC, render in IST — the market the bot actually trades on.
export function fmtIST(ts) {
  if (!ts) return "--";
  const d = new Date(ts.replace(" ", "T") + "Z");
  if (isNaN(d)) return ts;
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }) + " IST";
}

export function money(v, inr = false, digits = 2) {
  if (typeof v !== "number") return "--";
  return (inr ? "₹" : "$") + v.toLocaleString("en-IN", {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  });
}
