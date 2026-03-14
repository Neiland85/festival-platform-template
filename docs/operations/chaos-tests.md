# Chaos Testing — SolarisNerja

Chaos testing ensures the system survives unexpected failures.

The goal is to validate that the platform remains operational even when components fail.

---

# Test 1 — Database Connection Failure

Simulation

Break the database connection.

Example:

DATABASE_URL=invalid next dev

Expected result

API returns 500
Problem JSON returned

Website remains operational.

---

# Test 2 — Lead API Flood

Simulation

for i in {1..100}; do
curl -X POST http://localhost:3000/api/v1/leads
done

Expected result

Rate limit triggers.

Response:

429 Too Many Requests

System remains stable.

---

# Test 3 — External Service Failure

Simulation

Ticketmaster endpoint unavailable.

Expected result

Users see ticket fallback message.

System remains operational.

---

# Test 4 — Dashboard Failure

Simulation

Break admin metrics API.

Expected result

Dashboard metrics fail gracefully.

Public website unaffected.

---

# Chaos Frequency

Recommended

Run tests before major deployments.
