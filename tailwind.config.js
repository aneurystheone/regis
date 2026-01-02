/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                brand: {
                    primary: '#1F3A5F',    // Azul profundo
                    secondary: '#4DA3FF',  // Azul claro
                    accent: '#3CCF91',     // Verde IA
                    bg: '#F5F7FA',         // Fondo claro
                    text: '#2E2E2E',       // Texto principal
                }
            },
            fontFamily: {
                sans: ['Lexend', 'sans-serif'],
            },
            borderRadius: {
                'xl': '12px',
                '2xl': '16px',
                '3xl': '24px',
            }
        },
    },
    plugins: [],
}
