// Central API base URL.
// Reads VITE_API_URL at build time (set this in the deploy env), and
// falls back to the local backend so `npm run dev` works unchanged.
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
