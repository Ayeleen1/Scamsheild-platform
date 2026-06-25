import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          950: '#020617',
          900: '#081128',
          800: '#0f1b3d',
          700: '#152d61',
          600: '#1b4b90',
          500: '#26a0fb',
          400: '#5ad0ff',
        },
      },
    },
  },
  plugins: [],
}

export default config
