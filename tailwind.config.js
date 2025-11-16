/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light theme colors (matching the sidebar image)
        light: {
          bg: {
            primary: '#ffffff',      // Main background
            secondary: '#2C3544',    // Sidebar background (navy/grey)
            tertiary: '#3a4556',     // Elevated elements
            hover: '#3d4858',        // Hover states
          },
          text: {
            primary: '#ffffff',      // Main text on sidebar
            secondary: '#9ca3af',    // Secondary text/labels
            tertiary: '#6b7280',     // Muted text
            body: '#1f2937',         // Body text on light background
          },
          border: {
            primary: '#374151',      // Subtle borders
            secondary: '#4b5563',    // More visible borders
          },
          accent: {
            blue: '#3b82f6',         // Blue highlight for active items
            orange: '#fb923c',       // Orange for logo text
          },
        },
        // Dark theme baseline colors
        dark: {
          bg: {
            primary: '#0a0a0a',      // Main background
            secondary: '#1a1a1a',    // Card/container background
            tertiary: '#2a2a2a',     // Elevated elements
            hover: '#333333',        // Hover states
          },
          text: {
            primary: '#ffffff',      // Main text
            secondary: '#a0a0a0',    // Secondary text/labels
            tertiary: '#6b7280',     // Muted text
            disabled: '#4b5563',     // Disabled text
          },
          border: {
            primary: '#2d2d2d',      // Subtle borders
            secondary: '#404040',    // More visible borders
            focus: '#525252',        // Focus states
          },
          accent: {
            blue: '#06b6d4',         // Cyan/blue (confidence gauge, chart)
            purple: '#8b5cf6',       // Purple (chart line)
            green: '#10b981',        // Green/teal (chart line)
            orange: '#f59e0b',       // Orange (status indicators)
            cyan: '#14b8a6',         // Alternative cyan
          },
          status: {
            success: '#10b981',      // Success states
            warning: '#f59e0b',      // Warning states (MEDIUM)
            error: '#ef4444',        // Error states
            info: '#06b6d4',         // Info states
          },
          chart: {
            line1: '#8b5cf6',        // Purple line
            line2: '#10b981',        // Green line
            line3: '#06b6d4',        // Blue line
            forecast: '#f59e0b',     // Forecast line
            grid: '#2d2d2d',         // Grid lines
          }
        }
      }
    },
  },
  plugins: [],
}

