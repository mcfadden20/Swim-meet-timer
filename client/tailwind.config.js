/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Neumorphic Admin Theme
                admin: {
                    bg: '#1b1d21',
                    surface: '#282a2f',
                    'surface-hover': '#2f3137',
                    'accent-start': '#f25b2a',
                    'accent-end': '#e83323',
                    text: '#ffffff',
                    'text-secondary': '#8F92A1',
                    border: '#3c3e45',
                    'border-subtle': '#31313A',
                    muted: '#6B6D7A',
                    'muted-soft': '#4F5261',
                    success: '#10B981',
                    error: '#EF4444',
                },
                // Outdoor (timer/officials): high-contrast for sunlight
                outdoor: {
                    bg: '#000000',
                    surface: '#0f0f0f',
                    text: '#ffffff',
                    muted: '#a3a3a3',
                    'cta-start': '#22d3ee',
                    'cta-start-hover': '#67e8f9',
                    'cta-stop': '#ef4444',
                    'cta-save': '#facc15',
                    'border': '#262626',
                },
            },
            backgroundImage: {
                'accent-gradient': 'linear-gradient(to right, #f25b2a, #e83323)',
                'accent-gradient-hover': 'linear-gradient(to right, #ff6b3b, #f94434)',
            },
            spacing: {
                '18': '4.5rem',
                '22': '5.5rem',
            },
            fontFamily: {
                mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            fontSize: {
                'timer': ['5.5rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
                'timer-sm': ['4rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
            },
            boxShadow: {
                'neumorphic': '10px 10px 20px #141619, -10px -10px 20px #3c3e45',
                'neumorphic-sm': '5px 5px 10px #141619, -5px -5px 10px #3c3e45',
                'neumorphic-inner': 'inset 5px 5px 10px #1a1b1f, inset -5px -5px 10px #363940',
                'admin-glow': '0 0 15px rgba(242, 91, 42, 0.4)',
            },
            borderRadius: {
                'panel': '24px',
            }
        },
    },
    plugins: [],
};
