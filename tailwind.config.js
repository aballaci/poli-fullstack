/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          '500': '#2F80ED',
        },
        indigo: {
          '500': '#6C5CE7',
        },
        cyan: {
          '500': '#22D3EE',
        },
        emerald: {
          '500': '#10B981',
        },
        coral: {
          '500': '#FF6B6B',
        },
        amber: {
          '500': '#F59E0B',
        },
        lilac: {
          '500': '#A78BFA',
        },
      },
    },
  },
  plugins: [],
}
