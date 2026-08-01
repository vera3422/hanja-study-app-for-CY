import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/hanja-study-app-for-CY/',   // ← 이 줄을 추가하세요
  plugins: [
    react(),
    tailwindcss(),
  ],
})