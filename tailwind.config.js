/** @type {import('tailwindcss').Config} */
export default {
    content: ["./posts/**/*.md", ".vitepress/theme/**/*.vue"],
    darkMode: ['class', '.dark'],
    theme: {
        screens: {
            'sm': '640px',
            'md': '768px',
            'lg': '1280px',
        },
        container: {
            center: true,
        },
        extend: {
            colors: {
                'accent': {
                    DEFAULT: '#278BDA',
                    50: '#C4DFF5',
                    100: '#B2D6F2',
                    200: '#8FC3EC',
                    300: '#6DB0E6',
                    400: '#4A9EE0',
                    500: '#278BDA',
                    600: '#1D6DAC',
                    700: '#154E7C',
                    800: '#0D304C',
                    900: '#05121C',
                    950: '#010204'
                },
            }
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}

