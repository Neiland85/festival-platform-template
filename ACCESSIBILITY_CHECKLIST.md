# Accessibility Checklist — Festival Platform

## Quick Start

```bash
# Install axe-core for Playwright (if not present)
pnpm add -D @axe-core/playwright

# Run all accessibility tests
pnpm exec playwright test e2e/accessibility.spec.ts

# Run only accessibility-tagged tests
pnpm exec playwright test --grep accessibility

# Run with verbose output (shows violation details)
pnpm exec playwright test e2e/accessibility.spec.ts --reporter=list
```

## Automated Tests (axe-core)

The `e2e/accessibility.spec.ts` file runs the following checks on every page:

| Test | WCAG Level | What it catches |
|------|-----------|-----------------|
| Homepage (ES/EN) | AA | Color contrast, missing labels, ARIA issues |
| Privacy page | AA | Heading hierarchy, link text, landmark roles |
| Cookie banner | AA | Dialog role, button labels, focus management |
| Image alt text | A | Missing or empty alt attributes |
| Keyboard navigation | A | Unreachable interactive elements |
| Heading hierarchy | A | Skipped heading levels (h1 → h3) |

### WCAG tags used

- `wcag2a` — WCAG 2.0 Level A (minimum)
- `wcag2aa` — WCAG 2.0 Level AA (standard target)
- `wcag21a` — WCAG 2.1 Level A
- `wcag21aa` — WCAG 2.1 Level AA

## Common Issues & Fixes

### 1. Insufficient Color Contrast

**axe rule:** `color-contrast`

**Symptom:** Text doesn't meet 4.5:1 contrast ratio (normal text) or 3:1 (large text).

**Fix:**
```css
/* Before — fails contrast */
.muted-text { color: #aaa; background: #fff; }

/* After — passes 4.5:1 */
.muted-text { color: #767676; background: #fff; }
```

**Tools:** Use Chrome DevTools → Inspect → Color picker shows contrast ratio. Or use https://webaim.org/resources/contrastchecker/

### 2. Missing Focus Indicators

**axe rule:** `focus-visible`

**Symptom:** No visible outline when tabbing through interactive elements.

**Fix:**
```css
/* Ensure all interactive elements have visible focus */
a:focus-visible,
button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid var(--sn-text);
  outline-offset: 2px;
}

/* Never do this: */
*:focus { outline: none; }  /* ← breaks keyboard navigation */
```

### 3. Missing ARIA Labels

**axe rule:** `button-name`, `link-name`, `image-alt`

**Symptom:** Buttons/links with only icons, no accessible name.

**Fix:**
```tsx
{/* Before — no accessible name */}
<button onClick={toggle}><IconMenu /></button>

{/* After — screen reader accessible */}
<button onClick={toggle} aria-label="Open menu"><IconMenu /></button>

{/* For icon-only links */}
<a href="/cart" aria-label="Shopping cart">
  <CartIcon aria-hidden="true" />
</a>
```

### 4. Missing Form Labels

**axe rule:** `label`, `input-name`

**Symptom:** Input fields without associated labels.

**Fix:**
```tsx
{/* Before */}
<input type="email" placeholder="Email" />

{/* After — explicit label */}
<label htmlFor="email" className="sr-only">Email</label>
<input id="email" type="email" placeholder="Email" />

{/* Or — aria-label for visual-only fields */}
<input type="email" placeholder="Email" aria-label="Email address" />
```

### 5. Incorrect Heading Hierarchy

**axe rule:** `heading-order`

**Symptom:** Page jumps from `<h1>` to `<h3>` without `<h2>`.

**Fix:** Ensure headings follow sequential order: h1 → h2 → h3. Use CSS classes for visual sizing instead of heading levels:
```tsx
{/* Wrong */}
<h1>Festival</h1>
<h3>Lineup</h3>  {/* ← skips h2 */}

{/* Correct */}
<h1>Festival</h1>
<h2 className="text-lg">Lineup</h2>
```

### 6. Missing lang Attribute

**axe rule:** `html-has-lang`

**Symptom:** `<html>` tag missing `lang` attribute.

**Fix:** Already handled by next-intl — verify with:
```bash
curl -s https://yoursite.com/es | head -5 | grep 'lang='
# Should show: <html lang="es">
```

### 7. Missing Skip Navigation Link

**axe rule:** `bypass`

**Symptom:** No skip link for keyboard users to bypass navigation.

**Fix:**
```tsx
{/* Add as first child of <body> or layout */}
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
    focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black"
>
  Skip to main content
</a>

{/* Add id to main content */}
<main id="main-content">...</main>
```

## Manual Testing Checklist

Run these manually before each release:

- [ ] **Keyboard-only navigation:** Tab through entire page without mouse
- [ ] **Screen reader:** Test with VoiceOver (Mac) or NVDA (Windows)
- [ ] **Zoom 200%:** Page remains usable at 200% browser zoom
- [ ] **Reduced motion:** Respect `prefers-reduced-motion: reduce`
- [ ] **High contrast mode:** Test with Windows High Contrast / forced colors
- [ ] **Mobile touch targets:** All buttons/links are at least 44x44px

## CI Integration

The accessibility tests run as part of the E2E suite. To make them blocking:

1. Add `accessibility` to the required status checks in branch protection
2. Or add a separate job in `ci.yml`:

```yaml
accessibility:
  name: "♿ Accessibility"
  needs: build
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    # ... setup node/pnpm/playwright ...
    - run: pnpm exec playwright test e2e/accessibility.spec.ts
```

## Resources

- [axe-core rules reference](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Playwright axe integration](https://playwright.dev/docs/accessibility-testing)
