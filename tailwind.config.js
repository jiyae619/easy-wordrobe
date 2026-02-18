/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#2D3A2D',
                secondary: '#6B7F5E',
                accent: '#A8B89A',
                surface: '#F4F5F0',
                card: '#FFFFFF',
                muted: '#E8EBE4',
                olive: {
                    50: '#F4F5F0',
                    100: '#E8EBE4',
                    200: '#D1D8C9',
                    300: '#A8B89A',
                    400: '#8A9E78',
                    500: '#6B7F5E',
                    600: '#556849',
                    700: '#3F4F37',
                    800: '#2D3A2D',
                    900: '#1A2419',
                },
            },
            fontFamily: {
                sans: ['Poppins', 'system-ui', '-apple-system', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
