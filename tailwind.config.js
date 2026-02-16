/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#1a1a2e',
                secondary: '#e94560',
                accent: '#0f3460',
                background: '#f5f5f5',
            },
        },
    },
    plugins: [],
}
