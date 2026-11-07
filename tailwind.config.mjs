/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mango: {
          light: '#6b8ff7',
          DEFAULT: '#4270f5',
          dark: '#0a59f8',
          hover: '#0056b3',
        },
        dark: {
          bg: '#191919',
          card: '#212121',
          header: '#151516',
          accent: '#ffc008',
        },
      },
      maxWidth: {
        'mango': '900px',
        // 主栏 + 边栏的总宽（3:1，侧栏 281px 不变），与 src/config/site.ts 的 layout.wideWidth 一致
        'mango-wide': '1180px',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#333',
            fontSize: '14px',
            lineHeight: '1.8',
            fontWeight: '300',
            a: {
              color: theme('colors.mango.DEFAULT'),
              '&:hover': {
                color: theme('colors.mango.hover'),
              },
            },
          },
        },
        invert: {
          css: {
            color: '#ccc',
            a: {
              color: theme('colors.mango.light'),
              '&:hover': {
                color: theme('colors.mango.DEFAULT'),
              },
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
