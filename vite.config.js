import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  // This project is simple enough that it doesn't require special
  // configuration. Vite will automatically handle the index.html entry point,
  // TypeScript compilation, and dependency bundling.
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY)
  }
})