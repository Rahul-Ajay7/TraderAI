// Backend location. Priority:
//   1. VITE_BACKEND_URL env (set in Vercel → Settings → Environment Variables)
//   2. localhost dev server
//   3. legacy Railway URL (dead after trial — set the env var instead)
const raw =
  import.meta.env.VITE_BACKEND_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "https://traderai-backend.up.railway.app");

export const API_URL = raw.replace(/\/+$/, "");
export const WS_URL  = API_URL.replace(/^http/, "ws") + "/ws";
