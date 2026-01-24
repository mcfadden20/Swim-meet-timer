/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                navy: {
                    900: '#0a192f', // Deep Navy
                    800: '#112240', // Slightly lighter navy for cards
                },
                cyan: {
                    400: '#64ffda', // Neon Cyan
                },
                yellow: {
                    400: '#f9e05e', // Neon Yellow
                }
            },
            fontFamily: {
                mono: ['"JetBrains Mono"', 'monospace'],
            }
        },
    },
    plugins: [],
}
