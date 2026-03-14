# Runbook — Ticketmaster Outage

## Symptoms

Users cannot purchase tickets.

Ticket links return error.

---

## Impact

Solaris website continues operating.

Ticket purchase temporarily unavailable.

---

## Immediate Action

1. Verify Ticketmaster status
2. Switch ticket links to fallback message

Example message:

"Ticket purchase temporarily unavailable. Please retry shortly."

---

## Recovery

Once Ticketmaster is operational:

Restore original ticket URLs.

---

## Long-term improvement

Add monitoring for Ticketmaster endpoint.
