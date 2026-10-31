import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  define: { __BPM_PREVIEW__: JSON.stringify(process.env.VERCEL_ENV === 'preview'), __BPM_KIT_GATE_PREVIEW__: JSON.stringify(process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF === 'codex/library-gate' && process.env.KIT_GATE_TEST === '1') },
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
  },
})

