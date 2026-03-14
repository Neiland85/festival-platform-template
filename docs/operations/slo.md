# SolarisNerja — Service Level Objectives

This document defines the operational targets of the platform.

---

# Availability Targets

Public website availability

Target: 99.9%

Admin dashboard availability

Target: 99%

API uptime

Target: 99.9%

---

# Performance Targets

Page load time

Target: < 2 seconds

API response time

Target: < 200 ms

---

# Error Rate

Target

< 1% of requests

---

# Monitoring Signals

Health endpoint

/api/healthz

Readiness endpoint

/api/readyz

---

# Incident Handling

Minor incidents

Resolved within 1 hour.

Major incidents

Resolved within 24 hours.

---

# Escalation

1. Check logs
2. Check database connection
3. Redeploy service
4. Investigate code regression
