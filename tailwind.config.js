/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'text-hint': 'var(--color-text-hint)',
        'bg-card': 'var(--color-bg-card)',
        'bg-card-owner': 'var(--color-bg-card-owner)',
        'bg-menu-owner': 'var(--color-bg-menu-owner)',
        'border-light': 'var(--color-border-light)',
        'border-light-owner': 'var(--color-border-light-owner)',
        'border-input': 'var(--color-border-input)',
        'border-divider': 'var(--color-border-divider)',
        'badge-temp-freelancer': 'var(--color-badge-temp-freelancer)',
        'badge-temp-owner': 'var(--color-badge-temp-owner)',
        'badge-perm': 'var(--color-badge-perm)',
        'badge-danger': 'var(--color-badge-danger)',
        'accent-freelancer': 'var(--color-accent-freelancer)',
        'accent-owner': 'var(--color-accent-owner)',
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'btn-freelancer': 'var(--shadow-btn-freelancer)',
        'btn-owner': 'var(--shadow-btn-owner)',
        'card-lg': '0 10px 24px rgba(109,40,217,0.22)',
      },
      borderRadius: {
        'card': '14px',
        'input': '12px',
        'chip': '999px',
      },
    },
  },
  plugins: [],
}
