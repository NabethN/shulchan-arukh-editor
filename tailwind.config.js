/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            // כאן אנחנו מחברים את הפונטים שהגדרנו קודם
            fontFamily: {
                sans: ['var(--font-interface)', 'sans-serif'],
                serif: ['var(--font-torah)', 'serif'],
            },
        },
    },
    plugins: [],
}