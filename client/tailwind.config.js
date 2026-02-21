/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // High Contrast Theme Override
                // Replacing Navy/Cyan with Black/White/Yellow
                navy: {
                    900: '#000000', // Pure Black
                    800: '#1a1a1a', // Dark Gray
                    700: '#333333',
                },
                cyan: {
                    400: '#FFFF00', // High Vis Yellow
                    300: '#FFFFCC', // Light Yellow
                },
                slate: {
                    300: '#FFFFFF', // White Text
                    400: '#CCCCCC', // Light Gray
                    500: '#999999', // Gray
                }
            },
            fontFamily: {
                mono: ['"JetBrains Mono"', 'monospace'],
            },
        },
    },
    plugins: [],
}
