/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'status-healthy': '#10b981',
        'status-degraded': '#f59e0b',
        'status-down': '#ef4444',
        'status-unknown': '#6b7280',
      },
    },
  },
  plugins: [],
}
