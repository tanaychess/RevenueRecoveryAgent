/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: "#060A11",
        "obsidian-card": "#0A101D",
        surface: "#0F172A",
        "surface-raised": "#141F36",
        "surface-card": "#10192D",
        "surface-highlight": "#1A2846",
        border: "#1E2A42",
        "border-glow": "#334D77",
        rzp: {
          blue: "#3395FF",
          dark: "#0C2340",
          teal: "#00D2C4",
          neon: "#00F0FF",
          indigo: "#6366F1",
          purple: "#8B5CF6",
          emerald: "#10B981",
          amber: "#F59E0B",
          rose: "#F43F5E",
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glow-blue': '0 0 25px rgba(51, 149, 255, 0.25)',
        'glow-teal': '0 0 25px rgba(0, 210, 196, 0.25)',
        'glow-emerald': '0 0 25px rgba(16, 185, 129, 0.25)',
        'glow-purple': '0 0 25px rgba(139, 92, 246, 0.25)',
        'glow-rose': '0 0 25px rgba(244, 63, 94, 0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2.5s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(51, 149, 255, 0.2)' },
          '100%': { boxShadow: '0 0 25px rgba(0, 210, 196, 0.4)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
};
