---
name: Premium FinTech Narrative
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#44474e'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#75777f'
  outline-variant: '#c5c6cf'
  surface-tint: '#4e5e81'
  primary: '#031635'
  on-primary: '#ffffff'
  primary-container: '#1a2b4b'
  on-primary-container: '#8293b8'
  inverse-primary: '#b6c6ef'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#001c10'
  on-tertiary: '#ffffff'
  tertiary-container: '#003320'
  on-tertiary-container: '#00a774'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#b6c6ef'
  on-primary-fixed: '#081b3a'
  on-primary-fixed-variant: '#364768'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Sora
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.25'
  headline-lg-mobile:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style

This design system establishes a premium, authoritative, yet highly accessible environment for modern financial management. The aesthetic balances **Corporate Modern** precision with **Glassmorphic** and **Tactile** subtle cues to ensure the interface feels both high-value and technologically advanced.

The visual narrative focuses on "Clarity through Depth." By utilizing a generous white-space strategy and a layered surface architecture, the system reduces cognitive load for complex financial data. The emotional response is one of security and control—achieved through stable color choices—and optimism, driven by vibrant accent colors and smooth, rounded geometry.

**Key Design Pillars:**
- **Institutional Trust:** Solid navy foundations and structured layouts.
- **Dynamic Growth:** Vibrant blue and emerald green accents for interactive and positive data states.
- **Soft Precision:** High-radius corners (16px+) and diffused shadows create a welcoming, "consumer-grade" feel for professional tools.

## Colors

The palette is engineered for financial clarity and high contrast.

- **Primary (Deep Navy):** Reserved for core branding, primary navigation backgrounds, and high-level headings. It provides the "anchor" of trust.
- **Secondary (Vibrant Blue):** The action color. Used for primary buttons, active states, and focus indicators.
- **Success (Emerald Green):** Specifically for positive financial trends, profit indicators, and completed status.
- **Neutral (Slate):** A range of cool grays used for secondary text, borders, and disabled states to maintain a clean, "tech" appearance.

The background uses a very slight off-white (`#F8FAFC`) to allow white surface cards (`#FFFFFF`) to "pop" via elevation.

## Typography

This system employs a dual-font strategy to balance character with utility.

**Sora** is used for headings and display numbers. Its geometric construction and wide apertures feel modern and tech-forward, making financial figures appear clear and prestigious.

**Inter** is the workhorse for all UI components, body text, and data tables. Its tall x-height and neutral tone ensure maximum readability even at small sizes in dense dashboards.

- **Numbers:** Always use tabular lining figures in data-heavy views to ensure vertical alignment of currency.
- **Hierarchy:** Use font weight (Semi-Bold to Bold) rather than just size to differentiate headings from body content.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a strict 8px spacing power-of-two scale. 

- **Desktop (1280px+):** 12-column grid with 24px gutters. Use 48px or 80px vertical section spacing to maintain a "premium" airy feel.
- **Tablet (768px - 1279px):** 8-column grid with 24px gutters. Side margins reduce to 32px.
- **Mobile (Up to 767px):** 4-column grid with 16px gutters. Margins are 16px.

**Information Density:** In dashboards, use "Comfortable" padding (24px) for cards. For data tables or transaction lists, density may increase to "Compact" (12px padding) to show more information at once.

## Elevation & Depth

Visual hierarchy is established using **Ambient Shadows** and **Tonal Layers**. Shadows are never pure black; they are tinted with the Primary Navy color to ensure they feel integrated into the UI.

- **Level 0 (Background):** `#F8FAFC`. No shadow.
- **Level 1 (Cards/Surfaces):** White background with a "Soft Ambient" shadow: `0px 4px 20px rgba(26, 43, 75, 0.05)`.
- **Level 2 (Dropdowns/Modals):** White background with a "Focused" shadow: `0px 12px 32px rgba(26, 43, 75, 0.12)`.
- **Interactive Depth:** Buttons utilize a very subtle 2px vertical offset shadow that disappears on "Active" (pressed) states to mimic physical tactile feedback.

## Shapes

The shape language is consistently "Rounded" to soften the serious nature of financial data.

- **Core Components:** Buttons, inputs, and small widgets use a **12px (rounded-lg)** radius.
- **Containers:** Dashboard cards and main content areas use a **16px to 24px (rounded-xl)** radius to create a friendly, "app-like" containerized feel.
- **Data Indicators:** Progress bars and status chips use **Pill-shaped** (full round) corners to differentiate them from structural elements.

## Components

### Buttons
- **Primary:** Solid Vibrant Blue background, White text. 12px radius. 
- **Secondary:** Transparent background, Vibrant Blue border (1.5px), Vibrant Blue text.
- **Ghost:** Primary Navy text, no border, light gray background on hover.

### Input Fields
- **Default State:** 1.5px border in Light Slate, 12px radius, Inter 16px text.
- **Focus State:** 2px Vibrant Blue border with a 4px soft blue outer glow (halo).
- **Validation:** Use Emerald Green for success and Red for errors, including small helper icons.

### Cards
- Always white background.
- 16px-24px padding.
- Use Level 1 shadow. 
- Internal dividers should be subtle (1px, `#E2E8F0`).

### Chips & Badges
- **Status Badges:** Soft tinted backgrounds (e.g., 10% opacity Emerald) with high-contrast text for status indicators like "Completed" or "Pending."
- **Interactive Chips:** Solid border, 12px radius, used for filtering data.

### Progress Bars
- 8px height. 
- Background: Light Gray.
- Fill: Vibrant Blue or Emerald Green. 
- Fully rounded ends.