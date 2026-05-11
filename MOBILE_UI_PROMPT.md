# Mobile UI Design Prompt

This prompt is designed to be used with AI UI generation tools (like v0.dev, Bolt.new, or Midjourney) to recreate the mobile layout of the Energy Palace Nexus / EcoSoft Pro dashboard and landing page.

## Implementation Prompt

"Create a high-fidelity mobile-first dashboard and landing page UI using React, Tailwind CSS, and Lucide Icons.

**1. Landing Page Design:**
- **Background:** A subtle diagonal gradient from `slate-50` to `blue-50`.
- **Hero Section:** Centered layout with a large bold title, a professional icon in a dark rounded container, and a 5-star 'Trusted by' badge.
- **Auth Card:** A clean white card with Tabs for 'Sign In' and 'Sign Up'. Use dark slate (`bg-slate-800`) for primary buttons with a 'ChevronRight' icon.
- **Features:** A single-column list of cards, each with a colored icon (Blue, Yellow, Green), a bold title, and a descriptive paragraph.

**2. Mobile Dashboard Design:**
- **App Bar:** A vibrant gradient header (`from-blue-600 to-purple-600`) with a Menu icon, Bell icon, and Search icon. Use white text.
- **Welcome Widget:** A soft blue-to-purple gradient card at the top displaying 'Welcome back, User', the current date, and a profile icon. Include a 3-column row of small stats (e.g., '18 Modules', 'System Status').
- **Module Grid:** Categorized sections (Transactions, Reports, Management). Under each category, show a 2-column grid of cards. Each card should have:
  - A large, colorful gradient icon box (e.g., Orange, Red, Emerald, Purple).
  - A semi-bold title (`text-sm`).
  - A tiny descriptive text (`text-xs`) in muted gray.
- **Quick Actions:** A 'Quick Actions' section at the bottom with two large, outlined, high-tap-target buttons with icons for 'New Order' and 'Add Expense'.

**Design Details:**
- Use 'Inter' or a similar clean sans-serif font.
- Ensure all cards have `rounded-2xl` corners and subtle shadows.
- Add active states like `active:scale-95` to buttons and cards for a native mobile app feel.
- Use `bg-gray-50` for the main dashboard body background to make the white cards pop."

## Design Elements Summary
*   **Color Palette:** Primary gradients (`blue-600` to `purple-600`), neutral backgrounds (`slate-50`, `gray-50`), and vibrant category icons.
*   **Typography:** Bold headings (`text-xl` to `text-3xl`) and clean labels (`text-sm`).
*   **Structure:** 2-column card grid for the dashboard, single-column for the landing page features.
*   **Icons:** Lucide-react (ShoppingCart, Zap, Receipt, BarChart3, etc.).
