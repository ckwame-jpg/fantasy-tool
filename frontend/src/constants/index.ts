// Normalize the API base URL so accidental values like "undefined", "null", or relative paths
// (e.g. "/api") don't produce requests like "/undefined/..." on the Next dev server.
const raw = (process.env.NEXT_PUBLIC_API_URL || "").trim()
const looksAbsolute = /^https?:\/\//i.test(raw)
const isBadValue = !raw || raw === "undefined" || raw === "null" || raw === "/" || raw.startsWith("/")

export const API_BASE_URL = !isBadValue && looksAbsolute
	? raw.replace(/\/+$/, "") // strip trailing slashes
	: "http://localhost:8004"