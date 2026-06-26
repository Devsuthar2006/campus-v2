# Campusly V2 — UI Guidelines & Design System

> **Document type:** Design system & UI/UX handbook — official standard
> **Product:** Campusly V2 (formerly PU Chat)
> **Status:** Authoritative v1.0
> **Authority:** Every designer, frontend developer, and AI assistant MUST follow this document when designing or building any screen. It defines the visual language, design philosophy, and component standards. No code, CSS, or Tailwind classes — only design specifications and principles.
> **Companion documents:** `PROJECT_VISION.md` §9 (design philosophy), `TECH_STACK.md` §2 (frontend stack), `PRODUCT_REQUIREMENTS.md` §6 (principles)
> **Design inspiration:** Apple, Linear, Notion, Arc Browser — for consistency, hierarchy, and clarity. Never copy; always adapt to Campusly's identity.

---

## Table of Contents
1. [Design Philosophy](#1-design-philosophy)
2. [Brand Personality](#2-brand-personality)
3. [Color System](#3-color-system)
4. [Theme System](#4-theme-system)
5. [Typography](#5-typography)
6. [Spacing System](#6-spacing-system)
7. [Corner Radius](#7-corner-radius)
8. [Shadows & Elevation](#8-shadows--elevation)
9. [Icons](#9-icons)
10. [Components](#10-components)
11. [Navigation](#11-navigation)
12. [Screen Design Guidelines](#12-screen-design-guidelines)
13. [Animations](#13-animations)
14. [Accessibility](#14-accessibility)
15. [Responsive Design](#15-responsive-design)
16. [Empty & Error States](#16-empty--error-states)
17. [Design Principles](#17-design-principles)

---

## 1. Design Philosophy

Campusly should feel like a **professionally designed startup product**, not an AI-generated template or a side project. Every screen communicates care, precision, and respect for the student.

- **Student-first design.** Every decision starts with *how does this serve the student?* Remove friction, reduce cognitive load, reward clarity.
- **Minimalism.** Show only what matters. Every element earns its place; remove before adding.
- **Function before decoration.** The UI communicates and enables action — decoration is secondary, never the goal.
- **Consistency.** The same patterns, spacing, colors, and components everywhere. A student should never feel they left the product.
- **Premium experience.** Polished, precise, fast, delightful. The quality signals that this platform takes students seriously.
- **Long-term maintainability.** A small, well-defined system of primitives (shadcn/ui, Tailwind tokens) that scales without entropy.

---

## 2. Brand Personality

Campusly must feel:

| Attribute | Meaning |
|-----------|---------|
| **Professional** | Reliable, serious, well-made |
| **Welcoming** | Friendly, approachable, warm |
| **Trustworthy** | Honest, safe, consistent |
| **Modern** | Current, sharp, forward |
| **Community-driven** | Belonging-focused, participatory |
| **Student-focused** | Built for *them*, in their language |

**Never:** childish, cartoonish, gaming-inspired, overly playful, clickbait, loud, or cheap. The personality is a thoughtful, kind upperclassman — not a children's app or a Twitch stream.

---

## 3. Color System

Only **two brand colors** — Orange (primary) and White (secondary). Dark mode inverts White to Black; Orange stays. Neutrals serve text, borders, and states.

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| **Primary (Orange)** | `#F97316` | `#F97316` (unchanged) | Primary actions, active accents, brand identity |
| **Secondary (White)** | `#FFFFFF` | `#000000` (inverts) | Backgrounds, cards |
| **Text Primary** | `#111827` (near-black) | `#F9FAFB` (near-white) | Headlines, body |
| **Text Secondary** | `#6B7280` | `#9CA3AF` | Captions, secondary info |
| **Border** | `#E5E7EB` | `#1F2937` | Lines, dividers, input borders |
| **Surface** | `#F9FAFB` | `#111827` | Elevated cards/sections over background |
| **Divider** | `#F3F4F6` | `#1F2937` | Subtle separators |
| **Disabled** | `#D1D5DB` | `#374151` | Disabled text, buttons |
| **Success** | `#10B981` | `#10B981` | Confirmations, positive states |
| **Warning** | `#F59E0B` | `#F59E0B` | Caution signals |
| **Danger** | `#EF4444` | `#EF4444` | Errors, destructive actions |

**Rules.**
- No additional brand colors. The palette is Orange + neutral grayscale + semantic states.
- Grays are for text, borders, disabled states, dividers, and shadows **only**.
- Orange is used sparingly for maximum impact — primary CTA, active indicators, brand moments. Never overwhelming.

---

## 4. Theme System

| Rule | Behavior |
|------|----------|
| **Light Theme** | White/light-gray backgrounds; dark text; light borders |
| **Dark Theme** | Pure black/very-dark-gray backgrounds; light text; dark borders |
| **Theme switching** | User preference + system default; instant toggle with no layout change |
| **Inversion principle** | **Only colors change** between themes; layout, spacing, hierarchy, and component structure remain **identical** |
| **Accessibility** | Both themes meet WCAG AA contrast (§14) |

**Backgrounds are always solid.** Never use gradients, mesh, glass, neon, or blended backgrounds in either theme. Flat, minimal, intentional.

---

## 5. Typography

| Element | Size (rem) | Weight | Line height | Notes |
|---------|-----------|--------|-------------|-------|
| **H1 (Page title)** | 1.875 | Bold (700) | 1.2 | Used once per page at most |
| **H2 (Section)** | 1.5 | Semibold (600) | 1.25 | Major sections |
| **H3 (Subsection)** | 1.25 | Semibold (600) | 1.3 | Cards, subsections |
| **Body** | 1.0 | Regular (400) | 1.5 | Primary reading text |
| **Caption** | 0.875 | Regular (400) | 1.4 | Timestamps, secondary info |
| **Small** | 0.75 | Medium (500) | 1.3 | Badges, labels |
| **Button** | 0.875–1.0 | Medium (500) | 1.0 | Buttons, links |
| **Numbers/Data** | Tabular | Medium (500) | 1.0 | Counters, stats — use tabular figures |

**Recommended font:** **Inter** — geometric, highly readable, variable-weight, free, and widely supported. Fallback: system UI stack. (SF Pro Display is acceptable on Apple platforms.)

**Why Inter.** Neutral, professional, excellent for both body and display; designed for screens with clear letterforms at small sizes — matching our readability and mobile-first priorities.

---

## 6. Spacing System

An **8-point grid** ensures consistency and visual harmony across the product.

| Token | Value | Usage |
|-------|-------|-------|
| **space-1** | 4px | Tight internal gaps (icon ↔ label) |
| **space-2** | 8px | Default internal padding, tight gaps |
| **space-3** | 12px | Small card padding |
| **space-4** | 16px | Standard padding, input padding |
| **space-5** | 20px | Card inner padding |
| **space-6** | 24px | Section padding |
| **space-8** | 32px | Screen-edge padding, section gaps |
| **space-10** | 40px | Large section separation |
| **space-12** | 48px | Page-level spacing |
| **space-16** | 64px | Major section breaks |

**Rules.** Always use 4/8-multiple spacing. Card internal padding: `space-4`–`space-5`. Button padding: `space-2` vertical, `space-4` horizontal. Screen horizontal margin: `space-4` on mobile, `space-8` on desktop. Maintain consistent density — content-rich but never cramped.

---

## 7. Corner Radius

| Element | Radius | Reasoning |
|---------|--------|-----------|
| **Buttons** | 8px | Rounded but structured |
| **Cards** | 12px | Soft, premium feel |
| **Dialogs / Bottom Sheets** | 16px (top corners) | Visible, friendly |
| **Inputs** | 8px | Match buttons |
| **Profile Images** | Full circle | Avatar standard |
| **Tags / Badges** | Full (pill) | Small, rounded elements |
| **Tooltips** | 6px | Subtle |

Never use harsh square corners on interactive elements. Never use extreme radius on large containers (it wastes space). The scale is 6–8–12–16px, consistent everywhere.

---

## 8. Shadows & Elevation

**Keep shadows minimal.** Campusly does not float.

| Rule | Behavior |
|------|----------|
| Light mode | Very subtle, small-radius shadow for cards/dialogs; one elevation level sufficient for most surfaces |
| Dark mode | **Rely on contrast and border, not shadow** — shadows are nearly invisible on dark backgrounds |
| No heavy blur | No `blur(20px)` diffuse glows |
| No floating effects | No hover-lifts, no 3D-card depth |

Elevation is communicated through **background color differentiation** (background → surface → elevated surface) more than through drop shadows. This keeps the UI flat, fast, and modern — inspired by Linear and Notion.

---

## 9. Icons

| Standard | Details |
|----------|---------|
| **Style** | Outlined, rounded edges, simple geometry |
| **Size** | 20px default; 16px small; 24px large |
| **Consistency** | One library across the product; same weight and optical size |
| **Color** | Inherit text color or primary/orange for active |

**Recommended libraries (in preference order):** Lucide → Phosphor → Heroicons. All are outline-first, rounded, and well-maintained. Pick **one** and use it exclusively for consistency.

---

## 10. Components

Standards for core primitives (shadcn/ui is the base; we own the code and style it to these rules).

| Component | Purpose | Visual style | Do | Don't |
|-----------|---------|--------------|----|----|
| **Primary Button** | Main CTA | Solid orange background, white text | Use for one primary action per section | Scatter orange buttons everywhere |
| **Secondary Button** | Supporting actions | Outlined or surface-colored | Use alongside a primary for secondary | Make it look like the primary |
| **Text Button** | Tertiary/inline action | Text-only, underlined on hover | Use for low-emphasis actions | Use for the primary action |
| **Icon Button** | Icon-only action | Ghost/transparent with icon | Use where label is obvious from context | Use without accessible label |
| **Card** | Container for content | Surface background, subtle border, radius-12 | Keep internal padding consistent | Add heavy shadow or decoration |
| **Input Field** | Data entry | Border, radius-8, clear label above | Always include a label; show validation inline | Use placeholder as label |
| **Search Bar** | Find content | Icon-left, minimal border, radius-8 | Keep prominent and simple | Over-style |
| **Dropdown** | Select from options | Surface-colored panel, subtle shadow | Limit visible options | Nest deeply |
| **Bottom Sheet** | Mobile contextual panel | Slides up, radius-16 top, overlay backdrop | Use for actions/details on mobile | Use on desktop where a dialog works |
| **Dialog** | Focused task/confirmation | Centered, radius-12, dim backdrop | Use for confirmations, focused input | Block the user needlessly |
| **Toast** | Brief feedback | Corner-positioned, auto-dismiss, radius-8 | Use for success/error/info | Stack many simultaneously |
| **Badge** | Status/count | Small pill, subtle color | Use sparingly for important status | Decorate everything with badges |
| **Tabs** | Switch between views | Underline active, minimal style | Limit to 3–5 tabs | Nest tabs within tabs |
| **Avatar** | User identity | Circular, sized consistently | Show initials if no image | Leave empty/broken |
| **Navigation Bar** | App structure | Fixed, minimal, clear active state | Max 5 items | Crowd with icons |
| **Loading (Skeleton)** | Perceived performance | Animated placeholder matching layout | Match the final layout shape | Use spinners for full-page loads |
| **Empty State** | No content | Friendly message + optional action | Offer guidance (e.g., "Start a match") | Leave a blank screen |
| **Error State** | Something failed | Clear message + retry/action | Explain in student language; offer recovery | Show technical errors |

---

## 11. Navigation

Navigation is always **simple, predictable, and consistent**. A first-year student should understand where they are and how to get anywhere in seconds.

| Navigation type | Behavior | Rule |
|-----------------|----------|------|
| **Bottom Navigation (mobile)** | Primary product areas (e.g., Wall, Match, Chat, Notifications, Profile) | Maximum **5 items**; always visible; clear active state (orange) |
| **Top Navigation (desktop)** | Mirrors bottom nav in a horizontal bar | Same 5 items; more room for labels |
| **Back Navigation** | Chevron-left at top-left; returns to previous context | Present on every sub-screen; predictable |
| **Search Navigation** | Accessible from primary areas; search bar at top | Never hidden more than one tap away |
| **Profile Navigation** | Avatar tap → profile/settings | Quick access to identity/settings |
| **Settings Navigation** | Linear list of grouped preferences | Flat, never nested more than one level |
| **Admin Navigation** | Sidebar (desktop) or hamburger (mobile) with module list | Separate from student nav; role-gated |

**Rule.** If a student has to think about how to navigate, we have failed. Navigation should be invisible in its simplicity.

---

## 12. Screen Design Guidelines

Layout principles per key screen. The goal is **layout consistency** — every screen should feel like it belongs to the same product.

| Screen | Layout principle |
|--------|-----------------|
| **Splash / Loading** | Centered brand mark (orange on white/black); no unnecessary animation |
| **Onboarding** | Progressive, minimal; one idea per step; skip-able |
| **Authentication** | Single centered card; one-tap Google sign-in dominant; calm, trustworthy |
| **Profile** | Avatar + verified info prominently; editable fields in a clean form; settings accessible |
| **Anonymous Matching** | Central action ("Find Someone"); clear queue/status feedback; minimal UI during session |
| **Friend Chat** | Message list (bottom-aligned input); sender/receiver distinguished by position and subtle color; voice/media inline |
| **Campus Wall** | Full-width card feed; category filter at top; FAB or inline compose; pull-to-refresh |
| **Notifications** | Chronological list; unread distinguished; swipe actions; badge on nav icon |
| **Marketplace** | Grid/list toggle; image-first cards; filter/search bar prominent |
| **Communities** | List of joined/discoverable; community detail = its own feed; membership badge |
| **Events** | Date-sorted cards; RSVP button prominent; reminders visible |
| **Settings** | Grouped flat list; toggles and pickers; no deep nesting |
| **Admin Dashboard** | Dense but clear; data panels/cards; queue counts prominent; sidebar nav |

**Universal rules.** Consistent horizontal padding (`space-4` mobile, `space-8` desktop). Cards maintain the same radius, padding, and shadow. Action buttons in the same position per screen type (bottom/FAB for create; top-right for secondary). Orange used only for the primary action and active state on every screen.

---

## 13. Animations

Framer Motion is used **conservatively**. Every animation has a purpose: orient (where did this come from), confirm (the action worked), or delight (a small moment of craft). Never to decorate, delay, or distract.

| Animation | Behavior | Guideline |
|-----------|----------|-----------|
| **Page transitions** | Subtle fade/slide (150–250ms) | Fast; never block navigation |
| **Button feedback** | Scale-down on press (50ms) | Immediate, tactile |
| **Matching animation** | Purposeful motion showing pairing (300–500ms) | The one moment of delight; still fast |
| **Modal / Bottom Sheet** | Slide-up + fade backdrop (200ms) | Smooth; interruptible |
| **Toast** | Fade-in + slide; auto-dismiss (3–5s) | Unobtrusive |
| **Loading** | Skeleton shimmer (smooth, low-intensity) | Perceived performance; never spinners for layout |

**Rules.**
- Duration: 100–300ms for micro-interactions; never > 500ms.
- Easing: ease-out for entrances; ease-in for exits.
- Reduced motion: respect `prefers-reduced-motion` — disable non-essential animations.
- No flashy effects, no particle systems, no bouncing, no 3D, no parallax.

---

## 14. Accessibility

Accessibility is not an enhancement — it is a requirement. A premium product is usable by everyone.

| Standard | Requirement |
|----------|-------------|
| **WCAG AA contrast** | All text meets 4.5:1 (normal) and 3:1 (large) contrast ratio in both themes |
| **Readable typography** | Minimum 16px body; generous line height; no thin fonts below 14px |
| **Large touch targets** | Minimum 44×44px for interactive elements on mobile |
| **Keyboard navigation** | All interactive elements reachable and operable by keyboard; visible focus ring |
| **Reduced motion** | Respect system `prefers-reduced-motion`; disable non-essential animation |
| **Screen reader support** | Semantic HTML; ARIA labels on icon-only buttons; meaningful alt text |
| **Color independence** | Information never conveyed by color alone (use icons, text, or patterns as backup) |

*Full WCAG conformance requires ongoing testing with assistive technologies and expert review.*

---

## 15. Responsive Design

Mobile-first is the default posture — most students access on mobile — with graceful expansion to larger screens.

| Breakpoint | Target | Behavior |
|-----------|--------|----------|
| **Mobile** (< 640px) | Phones | Single column; bottom nav; full-width cards; `space-4` padding |
| **Tablet** (640–1024px) | Tablets / landscape | Optional second column; content max-width centered |
| **Desktop** (> 1024px) | Laptops / desktops | Multi-column where appropriate; sidebar nav for admin; `space-8` padding |
| **Large** (> 1440px) | Wide monitors | Content centered within max-width; generous whitespace |

**Rules.** Spacing and hierarchy remain consistent across breakpoints — only column count and container width adapt. Components never change their internal anatomy between sizes (a card is a card). Touch targets remain large even on desktop (accessibility). Navigation switches between bottom (mobile) and top/sidebar (desktop) without altering the information architecture.

---

## 16. Empty & Error States

Every state where content is absent or something failed must have a **designed, helpful response** — never a blank screen or a raw error.

| State | Design | Content |
|-------|--------|---------|
| **No Posts** | Centered illustration/icon + message + action | "The wall is quiet. Be the first to post." + compose CTA |
| **No Friends** | Centered message + action | "No friends yet. Start a match to meet someone." + match CTA |
| **No Matches** | Feedback during wait | "Looking for someone... this usually takes a few seconds." |
| **No Notifications** | Clean empty state | "You're all caught up." |
| **Offline** | Banner/indicator + cached content if possible | "You're offline. Some features are unavailable." |
| **Loading Failure** | Friendly message + retry | "Something went wrong. Tap to retry." |
| **Server Error** | Generic message + retry (never expose internals) | "We hit a snag. Try again in a moment." |
| **Permission Denied** | Clear explanation | "You don't have access to this." (no technical jargon) |

**Rules.** Every empty/error state uses the same visual language: centered, minimal, friendly copy, optional small icon (never large illustrations), and a clear action (retry, navigate, compose). Tone is warm and honest, never blaming the student.

---

## 17. Design Principles — Non-Negotiable Rules

The permanent design rules. Every screen, every component, every decision must honor these.

1. **Only two brand colors** — Orange + White (inverts to Black in dark mode). No additional brand colors.
2. **Solid backgrounds only** — no gradients, mesh, glass, neon, blending, ever.
3. **No heavy shadows** — minimal elevation; contrast over depth.
4. **Consistent spacing** — 8-point grid; never arbitrary values.
5. **Simple navigation** — max 5 primary items; instantly understandable.
6. **Readable typography** — Inter; clear hierarchy; generous line height.
7. **Premium appearance** — every pixel intentional; no visual clutter.
8. **Accessibility first** — contrast, touch targets, keyboard, screen readers.
9. **Performance first** — skeletons over spinners; lazy load; no heavy assets.
10. **Student-first experience** — calm, respectful, useful; no dark patterns; no manufactured anxiety.
11. **Every screen belongs to the same product** — the system is consistent; novelty per-screen is a bug, not creativity.

---

## Closing Note

This document is the official design system and UI/UX handbook for Campusly V2. Every designer, frontend developer, and AI assistant must follow it. Deviations require explicit design-team approval and an update to this document.

The system is deliberately **small, strict, and maintainable** — two brand colors, one font, one spacing scale, one radius scale, one shadow philosophy, one icon library. This constraint is what makes the product feel consistent, premium, and trustworthy. Complexity creeps in through exceptions; we resist exceptions.

It references rather than repeats the frontend stack (`TECH_STACK.md` §2), design philosophy (`PROJECT_VISION.md` §9), and product principles (`PRODUCT_REQUIREMENTS.md` §6). Where visual or UX intent is unclear, this document decides.

*— Chief Design Officer, Senior Product Designer, Design System Architect & UX Lead, Campusly V2*
