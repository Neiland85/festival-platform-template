# Arquitectura de Plataforma de Eventos Privados

Este documento describe la estructura multi‑instancia empleada por la plataforma. La plataforma se organiza en cinco capas principales:

* **core/** – motores fundamentales que implementan la lógica de negocio (ticketing, orders, payments, identity, access‑control, events). No contiene código específico por cliente.
* **modules/** – extensiones opcionales activables por instancia (CMS, analytics, QR check‑in, email, CRM‑lite, reporting). Cada módulo define sus dependencias y API.
* **instances/** – carpeta con una subcarpeta por cliente. Cada instancia incluye `config.json` (branding y opciones), `rules.json` (políticas de acceso), `modules.json` (módulos activados) y `.env` (secretos). No se permite código específico por instancia.
* **integrations/** – adaptadores a terceros como Stripe, Xceed o RA y las API públicas/privadas/webhooks/embeds.
* **infra/** – scripts y configuración de infraestructura (bases de datos, cache, colas, cron, observabilidad, provisioning).

La regla de oro es evitar personalización por cliente a nivel de código; toda variabilidad se expresa mediante configuración, reglas o plugins.
