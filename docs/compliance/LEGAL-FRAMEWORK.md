# Legal & Regulatory Framework — Cybersecurity Compliance

> Last updated: 2026-03-27 | Applicable to: Festival Platform Template v1.5+

## 1. Spain (National Level)

### 1.1 LOPDGDD (Ley Organica 3/2018)
**Ley Organica de Proteccion de Datos Personales y garantia de los derechos digitales**

- Transposes GDPR into Spanish law with additional digital rights
- Regulates processing of personal data by public and private entities
- Establishes AEPD (Agencia Espanola de Proteccion de Datos) as supervisory authority

**Penalties:**
- Minor: up to EUR 40,000
- Serious: EUR 40,001 - EUR 300,000
- Very serious: EUR 300,001 - EUR 20,000,000 (or 4% global turnover)

**Our compliance:**
- [x] Privacy policy page (`/privacidad`)
- [x] Cookie consent (accept/reject)
- [x] ARCO rights documented
- [x] AEPD complaint process referenced
- [x] Data controller identified

### 1.2 Spanish Penal Code (Art. 197-201, 264)
**Cybercrimes and hacking penalties:**

| Offense | Article | Penalty |
|---------|---------|---------|
| Unauthorized access to systems | Art. 197 bis | 6 months - 2 years prison |
| Interception of communications | Art. 197 ter | 6 months - 2 years prison |
| Data destruction/alteration | Art. 264 | 6 months - 3 years prison |
| Critical infrastructure attack | Art. 264 bis | 3 - 5 years prison |
| DDoS attacks | Art. 264 bis | 6 months - 3 years prison |
| Unauthorized data disclosure | Art. 197.3 | 2 - 5 years prison |

### 1.3 ENS (Esquema Nacional de Seguridad) — RD 311/2022
- National Security Framework for public sector and providers
- Defines security levels: Basic, Medium, High
- Requires risk analysis, incident management, audit trail

### 1.4 Ley 34/2002 LSSI-CE
- Law on Information Society Services (e-commerce)
- Requires: legal notice, cookie policy, commercial communications consent
- **Our compliance:** Privacy policy + cookie banner + contact info

## 2. Madrid (Regional)

### 2.1 Comunidad de Madrid — Data Protection
- AEPD is the national authority; no separate Madrid authority
- Madrid's government follows ENS for its own systems
- Regional digital strategy includes cybersecurity awareness programs

### 2.2 Local Business Requirements
- Registro Mercantil: company identification in legal notices
- NIF/CIF displayed on commercial websites
- Consumer protection via Direccion General de Comercio y Consumo

## 3. European Union

### 3.1 GDPR (Regulation 2016/679) — Since May 2018
**Key requirements for our platform:**

| Requirement | Article | Our Implementation |
|-------------|---------|-------------------|
| Lawful basis for processing | Art. 6 | Consent (6.1.a) + Contract (6.1.b) + Legitimate interest (6.1.f) |
| Data minimization | Art. 5.1.c | Only collect necessary fields |
| Purpose limitation | Art. 5.1.b | Clear purposes documented |
| Storage limitation | Art. 5.1.e | Retention periods defined |
| Right to access | Art. 15 | Admin dashboard export |
| Right to rectification | Art. 16 | Lead data editable |
| Right to erasure | Art. 17 | Soft-delete implemented |
| Right to portability | Art. 20 | JSON export available |
| Data breach notification | Art. 33 | 72-hour notification obligation |
| DPIA requirement | Art. 35 | See DPIA document |
| DPO designation | Art. 37 | Required if large-scale processing |
| Privacy by design | Art. 25 | hashIp(), encryption, minimal data |
| Records of processing | Art. 30 | Audit log + PostgreSQL persistence |

### 3.2 NIS2 Directive (2022/2555) — Enforceable Oct 2024
**Network and Information Security:**

- Applies to essential and important entities in 18 critical sectors
- Requires: risk management, incident reporting (24h initial, 72h detailed)
- Supply chain security obligations
- Management body accountability
- Penalties: up to EUR 10M or 2% global turnover

**Our compliance:**
- [x] Incident detection (audit logs, surge predictor)
- [x] Access control (RBAC, middleware auth)
- [x] Encryption (TLS, bcrypt, HMAC-SHA256)
- [x] Supply chain security (Dependabot, pnpm overrides)

### 3.3 ePrivacy Directive (2002/58/EC)
- Cookie consent requirements (prior, informed, specific)
- **Our compliance:** CookieBanner with accept/reject

### 3.4 Digital Services Act (DSA) — 2024+
- Platform accountability and transparency
- Illegal content reporting mechanisms
- Risk assessments for very large platforms

### 3.5 EU Cyber Resilience Act (CRA) — 2024+
- Security requirements for products with digital elements
- Vulnerability handling and disclosure obligations
- CE marking for cyber-secure products

## 4. Global Frameworks

### 4.1 Budapest Convention on Cybercrime (2001)
- International treaty on computer crime (ratified by Spain)
- Covers: illegal access, data interference, system interference, misuse of devices
- Enables cross-border cooperation on cybercrime investigations

### 4.2 ICANN Registration Data Policy (Aug 2025)
- Governs collection, transfer, publication of domain registration data
- Privacy safeguards: admin/billing contacts no longer required
- Registrant accuracy: 7-day update window, 15-day response obligation
- ALAC (At-Large Advisory Committee): represents end-user interests in ICANN policy

### 4.3 ISO/IEC 27001:2022
- International standard for information security management
- Risk-based approach with Annex A controls
- Our alignment: audit logs, access control, encryption, incident response

### 4.4 PCI DSS v4.0 (Payment Card Industry)
- Required for handling payment card data
- **Our compliance:** Stripe handles PCI scope; we never touch card numbers

### 4.5 NIST Cybersecurity Framework 2.0
- Identify, Protect, Detect, Respond, Recover
- **Our alignment:**
  - Identify: env validation, asset inventory
  - Protect: DDoS shield, rate limiting, CSRF, auth
  - Detect: audit logs, surge predictor, correlation engine
  - Respond: dead-letter queue, circuit breaker
  - Recover: graceful degradation, chaos testing

## 5. References

- [LOPDGDD Full Text (BOE)](https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673)
- [GDPR Full Text (EUR-Lex)](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [NIS2 Directive](https://digital-strategy.ec.europa.eu/en/policies/nis2-directive)
- [ICANN Registration Data Policy](https://www.icann.org/en/contracted-parties/consensus-policies/registration-data-policy)
- [ICANN Data Protection Practices](https://www.icann.org/privacy)
- [Spanish Penal Code (cybercrimes)](https://www.cybercrimelaw.net/Spain.html)
- [AEPD (Spanish Data Protection Authority)](https://www.aepd.es)
- [ENS (Esquema Nacional de Seguridad)](https://www.ccn-cert.cni.es/ens.html)
