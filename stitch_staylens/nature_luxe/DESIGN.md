---
name: Nature Luxe
colors:
  surface: '#f8f9ff'
  surface-dim: '#d0dbed'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dee9fc'
  surface-container-highest: '#d9e3f6'
  on-surface: '#121c2a'
  on-surface-variant: '#404943'
  inverse-surface: '#27313f'
  inverse-on-surface: '#eaf1ff'
  outline: '#707973'
  outline-variant: '#bfc9c1'
  surface-tint: '#2c694e'
  primary: '#0f5238'
  on-primary: '#ffffff'
  primary-container: '#2d6a4f'
  on-primary-container: '#a8e7c5'
  inverse-primary: '#95d4b3'
  secondary: '#0060ac'
  on-secondary: '#ffffff'
  secondary-container: '#64a8fe'
  on-secondary-container: '#003c70'
  tertiary: '#6a5e36'
  on-tertiary: '#ffffff'
  tertiary-container: '#baaa7c'
  on-tertiary-container: '#493f1a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b1f0ce'
  primary-fixed-dim: '#95d4b3'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#0e5138'
  secondary-fixed: '#d4e3ff'
  secondary-fixed-dim: '#a4c9ff'
  on-secondary-fixed: '#001c39'
  on-secondary-fixed-variant: '#004883'
  tertiary-fixed: '#f3e2af'
  tertiary-fixed-dim: '#d6c695'
  on-tertiary-fixed: '#231b00'
  on-tertiary-fixed-variant: '#514620'
  background: '#f8f9ff'
  on-background: '#121c2a'
  surface-variant: '#d9e3f6'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
---

## Brand & Style
The design system is built on the intersection of high-end hospitality and environmental serenity. It targets affluent travelers seeking curated, nature-focused experiences without sacrificing modern convenience. The emotional response is one of "Atmospheric Luxury"—calm, expansive, and deeply trustworthy.

The design style leverages **Modern Minimalism** with **Organic Tactility**. It prioritizes high-quality, full-bleed imagery framed by generous white space. Subtle glassmorphism is used for overlays to ensure the photography remains the focal point while maintaining UI legibility. The aesthetic is clean and systematic, yet softened by significant roundedness and nature-inspired color accents to avoid a cold, corporate feel.

## Colors
The palette is rooted in a biophilic foundation. The **Forest Green** primary color establishes a connection to the natural world and conveys stability. **Sky Blue** is used sparingly for interactive highlights and status indicators, providing a breath of fresh air against the grounded greens. 

**Warm Beige** serves as an organic accent, used for high-end decorative elements or specialized tags to differentiate premium listings. Surfaces are kept crisp with **Pure White** to ensure a high-contrast, professional reading environment, while the **Soft White** background prevents screen fatigue and adds a subtle "paper-like" quality to the interface.

## Typography
The typography strategy contrasts the contemporary, geometric friendliness of **Plus Jakarta Sans** for headlines with the utilitarian precision of **Inter** for long-form content. 

Headlines utilize tighter letter-spacing and bold weights to command attention and evoke a modern editorial feel. Body text is optimized for legibility with generous line heights (1.5x) and standard tracking. For mobile, display sizes scale down aggressively to ensure headlines do not wrap awkwardly, maintaining the "luxury" whitespace ratio even on smaller viewports.

## Layout & Spacing
This design system utilizes a **12-column fluid grid** for desktop and tablet, transitioning to a **stacked 2-column or 1-column layout** for mobile. The spacing rhythm is based on a 4px/8px incremental scale, emphasizing "breathing room."

- **Desktop (1280px+):** 24px gutters with 64px side margins.
- **Tablet (768px - 1279px):** 24px gutters with 40px side margins.
- **Mobile (< 768px):** 16px gutters with 16px side margins.

Content blocks should use the `xl` (64px) spacing for vertical separation to maintain a premium, unhurried pace throughout the user journey.

## Elevation & Depth
Depth is created through **Ambient Shadows** rather than stark borders. To reinforce the brand's connection to nature, shadows are not neutral gray but carry a subtle **Forest Green tint** (`rgba(45, 106, 79, 0.08)`).

The system uses three primary elevation tiers:
1. **Flat:** Background surfaces and secondary input fields.
2. **Low (Resting):** Cards and primary containers, using the signature tinted shadow (0 8px 30px).
3. **High (Interaction):** Hover states and modals, where the shadow expands and slightly deepens (0 12px 40px) to simulate the element lifting toward the user.

## Shapes
The shape language is characterized by "Hyper-Softness." The significant corner radii reflect natural forms—river stones and rolling hills—rather than the sharp angles of urban environments. 

- **Cards:** 20px radius creates a frame-like quality for photography.
- **Buttons:** 14px radius offers a comfortable, modern touch target.
- **Inputs:** 12px radius maintains consistency while being slightly more structured than buttons.
- **Imagery:** Large hero images should use a 24px-32px radius when not full-bleed to emphasize the containerized "luxury" feel.

## Components

### Buttons
- **Primary:** Features the Primary CTA gradient. 14px border radius. Text is white, semi-bold. On hover, the gradient shifts slightly darker.
- **Secondary:** Forest Green outline (1.5px) with a transparent background.
- **Ghost:** Minimalist, Sky Blue text for low-priority actions.

### Cards
- **Product/Destination Cards:** 20px corner radius, white surface, signature tinted shadow. Images must have a `5:4` or `16:9` aspect ratio. Content within cards uses `md` (24px) internal padding.

### Input Fields
- **Search & Forms:** 12px border radius. 1.5px border in Slate Gray, shifting to Forest Green on focus. Background is Pure White.

### Chips & Tags
- **Category Tags:** Pill-shaped (fully rounded). Background is Warm Beige with Charcoal text for "Premium" status, or light Forest Green tint for "Nature" categories.

### Lists
- **Experience Lists:** Use generous vertical padding (20px) between items with a light `1px` Soft White divider to maintain a clean, organized flow.

### Navigation
- **Header:** Sticky with a `backdrop-filter: blur(12px)` and 80% opacity Soft White background to allow photography to peek through while maintaining text legibility.