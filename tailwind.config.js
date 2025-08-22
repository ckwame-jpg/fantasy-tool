const { slate } = require("tailwindcss/colors");

const colorFamilies = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime',
  'green', 'emerald', 'teal', 'cyan', 'sky',
  'blue', 'indigo', 'violet', 'purple', 'fuchsia',
  'pink', 'rose'
];

const safelist = colorFamilies.flatMap(color =>
  Array.from({ length: 9 }, (_, i) => {
    const shade = (i + 1) * 100;
    return [
      `bg-${color}-${shade}`,
      `hover:bg-${color}-${shade}`,
      `text-${color}-${shade}`,
      `hover:text-${color}-${shade}`,
      `border-${color}-${shade}`,
      `ring-${color}-${shade}`,
      `dark:bg-${color}-${shade}`,
      `dark:hover:bg-${color}-${shade}`,
      `dark:text-${color}-${shade}`,
      `dark:hover:text-${color}-${shade}`,
      `dark:border-${color}-${shade}`,
      `dark:ring-${color}-${shade}`
    ];
  })
).flat();

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./constants/**/*.{js,ts,jsx,tsx,mdx}",
    "./public/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist,
  theme: {
    extend: {
      colors: {
        tier: {
          T1: '#a855f7',
          T2: '#0effeb',
          T3: '#00ff4cac',
          sleeper: '#999999',
        },
        slate: {
          ...slate,
          bg: 'oklch(37.2% 0.044 257.287)',
        },
      },
    },
  },
  plugins: [],
};