/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        // Humanitarian Design System Colors
        emergency: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#DC2626', // Primary emergency red
          600: '#dc2626',
          900: '#7f1d1d',
        },
        humanitarian: {
          blue: '#0066CC', // UN Blue for coordinator actions
          green: '#059669', // Relief Green for completed items
          orange: '#D97706', // Warning Orange for pending items
          slate: '#64748B', // Neutral slate for general UI
        },
        // Status-specific colors
        status: {
          verified: '#059669',
          pending: '#D97706',
          failed: '#DC2626',
          offline: '#D97706',
          syncing: '#0066CC',
        }
      },
    },
  },
  plugins: [],
}