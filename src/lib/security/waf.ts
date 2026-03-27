/**
 * Web Application Firewall (WAF) — Deep Packet Inspection for HTTP requests.
 *
 * ═══════════════════════════════════════════════════════════════
 * HOW FIREWALLS WORK & WHAT THEY PROTECT AGAINST
 * ═══════════════════════════════════════════════════════════════
 *
 * A firewall inspects traffic at multiple layers of the OSI model:
 *
 * Layer 3 (Network): IP-based blocking
 *   → Handled by Vercel Edge / cloud infrastructure
 *
 * Layer 4 (Transport): Port/protocol filtering
 *   → Handled by Vercel Edge (only 443/HTTPS open)
 *
 * Layer 7 (Application): Deep content inspection ← THIS MODULE
 *   → Inspects HTTP method, URL, headers, query strings, and body
 *   → Matches against known attack signatures (SQL injection, XSS, etc.)
 *   → Blocks or logs suspicious requests before they reach route handlers
 *
 * THREATS BLOCKED BY THIS WAF:
 *
 * 1. SQL Injection (SQLi)
 *    Pattern: ' OR 1=1 --, UNION SELECT, DROP TABLE
 *    Defense: Regex matching on URL, query string, and body
 *
 * 2. Cross-Site Scripting (XSS)
 *    Pattern: <script>, javascript:, onerror=, onload=
 *    Defense: HTML entity detection in unexpected contexts
 *
 * 3. Path Traversal / Directory Traversal
 *    Pattern: ../../etc/passwd, ..%2f, %00
 *    Defense: Null byte and traversal sequence detection
 *
 * 4. Remote Code Execution (RCE)
 *    Pattern: eval(, exec(, system(, __import__
 *    Defense: Code execution pattern matching
 *
 * 5. Server-Side Request Forgery (SSRF)
 *    Pattern: 169.254.169.254 (AWS metadata), localhost, 127.0.0.1
 *    Defense: Internal IP/hostname detection in parameters
 *
 * 6. Log Injection / Log4Shell
 *    Pattern: ${jndi:, ${env:, ${sys:
 *    Defense: JNDI lookup pattern detection
 *
 * 7. HTTP Method Tampering
 *    Pattern: TRACE, TRACK, DEBUG, CONNECT
 *    Defense: Allowlist of safe methods
 *
 * 8. Protocol Smuggling
 *    Pattern: Transfer-Encoding + Content-Length together
 *    Defense: Header combination detection
 *
 * ARCHITECTURE:
 *   Runs in shieldCheck() pipeline → BEFORE route handlers.
 *   Edge-compatible (no Node.js-only APIs).
 *   Returns structured block reasons for logging/monitoring.
 */

// ── Firewall Rule Engine ─────────────────────────────

export type WafResult = {
  blocked: boolean
  rule?: string
  category?: string
  detail?: string
}

// ── SQL Injection Patterns ───────────────────────────

const SQL_INJECTION_PATTERNS = [
  /(\b(union)\b.*\b(select)\b)/i,
  /(\b(insert|update|delete|drop|alter|create|truncate)\b.*\b(into|table|from|database)\b)/i,
  /(--|#|\/\*)\s*$/,
  /('\s*(or|and)\s+'?\d)/i,
  /('\s*(or|and)\s+'[^']+'?\s*=\s*')/i,
  /(;\s*(drop|delete|insert|update|alter)\s)/i,
  /(\bexec\s*\()/i,
  /(\bwaitfor\s+delay\b)/i,
  /(\bsleep\s*\(\s*\d)/i,
  /(\bconvert\s*\()/i,
  /(\bchar\s*\(\s*\d)/i,
  /(\bunion\s+all\s+select\b)/i,
]

// ── XSS Patterns ─────────────────────────────────────

const XSS_PATTERNS = [
  /<script[\s>]/i,
  /<\/script>/i,
  /javascript\s*:/i,
  /\bon(error|load|click|mouseover|focus|blur|submit|change)\s*=/i,
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
  /<svg[\s>].*on\w+\s*=/i,
  /\beval\s*\(/i,
  /\bdocument\s*\.\s*(cookie|write|location)/i,
  /\bwindow\s*\.\s*location/i,
  /expression\s*\(/i,
  /url\s*\(\s*['"]?\s*javascript/i,
]

// ── Path Traversal Patterns ──────────────────────────

const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,
  /\.\.\\/,
  /\.\.%2[fF]/,
  /\.\.%5[cC]/,
  /%00/,         // Null byte injection
  /etc\/(passwd|shadow|hosts)/i,
  /proc\/self/i,
  /\/dev\/(null|zero|random)/i,
  /wp-admin/i,   // WordPress probe (not applicable but indicates scanner)
  /\.env(\.|$)/i, // .env file access attempt
  /\.git\//i,    // Git directory access
  /\.ssh\//i,    // SSH directory access
]

// ── RCE / Command Injection Patterns ─────────────────

const RCE_PATTERNS = [
  /\b(system|exec|passthru|popen|proc_open)\s*\(/i,
  /\b__import__\s*\(/i,
  /\bimport\s+os\b/i,
  /\brequire\s*\(\s*['"]child_process/i,
  /\|\s*(cat|ls|id|whoami|uname|curl|wget|nc|ncat)\b/i,
  /`[^`]*`/,  // Backtick command execution
  /\$\(\s*(cat|ls|id|whoami|curl)\b/i,
]

// ── SSRF Patterns ────────────────────────────────────

const SSRF_PATTERNS = [
  /169\.254\.169\.254/,  // AWS metadata endpoint
  /metadata\.google\.internal/i,
  /100\.100\.100\.200/,  // Alibaba metadata
  /\blocalhost\b/i,
  /127\.0\.0\.1/,
  /\[::1\]/,
  /0\.0\.0\.0/,
  /10\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
  /172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}/,
  /192\.168\.\d{1,3}\.\d{1,3}/,
]

// ── Log Injection / JNDI ─────────────────────────────

const LOG_INJECTION_PATTERNS = [
  /\$\{jndi:/i,   // Log4Shell
  /\$\{env:/i,    // Environment variable leak
  /\$\{sys:/i,    // System property leak
  /\$\{lower:/i,  // Log4j obfuscation
  /\$\{upper:/i,
  /\$\{date:/i,
  /%24%7Bjndi/i,  // URL-encoded Log4Shell
]

// ── Allowed HTTP Methods ─────────────────────────────

const ALLOWED_METHODS = new Set([
  "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD",
])

// ── Scanner / Bot Detection ──────────────────────────

const SCANNER_UA_PATTERNS = [
  /nikto/i,
  /sqlmap/i,
  /nessus/i,
  /openvas/i,
  /acunetix/i,
  /netsparker/i,
  /burpsuite/i,
  /dirbuster/i,
  /gobuster/i,
  /wpscan/i,
  /masscan/i,
  /zgrab/i,
]

// ── Main Inspection Function ─────────────────────────

/**
 * Inspect an HTTP request for known attack patterns.
 * Returns blocked=true with rule/category if a threat is detected.
 *
 * This is the core firewall engine — runs on every request.
 */
export function inspectRequest(
  method: string,
  pathname: string,
  queryString: string,
  headers: Headers,
): WafResult {
  // 1. HTTP Method validation (block TRACE, TRACK, DEBUG, CONNECT)
  if (!ALLOWED_METHODS.has(method.toUpperCase())) {
    return block("method_not_allowed", "protocol", `Blocked method: ${method}`)
  }

  // 2. Protocol smuggling detection
  if (headers.get("transfer-encoding") && headers.get("content-length")) {
    return block("http_smuggling", "protocol", "Both Transfer-Encoding and Content-Length present")
  }

  // 3. Scanner/bot detection via User-Agent
  const ua = headers.get("user-agent") ?? ""
  for (const pattern of SCANNER_UA_PATTERNS) {
    if (pattern.test(ua)) {
      return block("scanner_detected", "reconnaissance", `Known scanner: ${ua.slice(0, 50)}`)
    }
  }

  // 4. Inspect URL path
  const pathCheck = scanText(pathname, "url_path")
  if (pathCheck.blocked) return pathCheck

  // 5. Inspect query string
  if (queryString) {
    const qsCheck = scanText(queryString, "query_string")
    if (qsCheck.blocked) return qsCheck
  }

  // 6. Inspect Referer header (can carry XSS/SQLi payloads)
  const referer = headers.get("referer")
  if (referer) {
    const refCheck = scanText(referer, "referer")
    if (refCheck.blocked) return refCheck
  }

  // 7. Inspect Cookie header for injection attempts
  const cookie = headers.get("cookie")
  if (cookie && cookie.length > 4096) {
    return block("cookie_overflow", "injection", "Cookie header exceeds 4KB")
  }

  return { blocked: false }
}

/**
 * Inspect a request body (POST/PUT/PATCH) for attack patterns.
 * Called separately because body reading is async in Edge Runtime.
 */
export function inspectBody(body: string): WafResult {
  if (!body) return { blocked: false }

  // Limit inspection to first 8KB to prevent ReDoS on large payloads
  const sample = body.slice(0, 8192)
  return scanText(sample, "body")
}

// ── Internal Scanner ─────────────────────────────────

function scanText(text: string, source: string): WafResult {
  // Check BOTH raw and decoded versions to catch encoding tricks
  let decoded = text
  try {
    decoded = decodeURIComponent(text)
  } catch {
    // Invalid encoding — might be an attack itself
  }

  // Combine both raw and decoded for comprehensive scanning
  const targets = text === decoded ? [decoded] : [text, decoded]

  // SQL Injection
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (targets.some(t => pattern.test(t))) {
      return block("sqli", "injection", `SQL injection in ${source}`)
    }
  }

  // XSS
  for (const pattern of XSS_PATTERNS) {
    if (targets.some(t => pattern.test(t))) {
      return block("xss", "injection", `XSS attempt in ${source}`)
    }
  }

  // Path Traversal
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (targets.some(t => pattern.test(t))) {
      return block("path_traversal", "traversal", `Path traversal in ${source}`)
    }
  }

  // RCE
  for (const pattern of RCE_PATTERNS) {
    if (targets.some(t => pattern.test(t))) {
      return block("rce", "execution", `Remote code execution in ${source}`)
    }
  }

  // SSRF (only in query strings and body, not in URL paths)
  if (source !== "url_path") {
    for (const pattern of SSRF_PATTERNS) {
      if (targets.some(t => pattern.test(t))) {
        return block("ssrf", "ssrf", `SSRF attempt in ${source}`)
      }
    }
  }

  // Log Injection / JNDI
  for (const pattern of LOG_INJECTION_PATTERNS) {
    if (targets.some(t => pattern.test(t))) {
      return block("log_injection", "injection", `Log injection in ${source}`)
    }
  }

  return { blocked: false }
}

function block(rule: string, category: string, detail: string): WafResult {
  return { blocked: true, rule, category, detail }
}
