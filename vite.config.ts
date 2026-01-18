import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/sina': {
        target: 'https://hq.sinajs.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sina/, ''),
        headers: {
          'Referer': 'https://finance.sina.com.cn',
        },
      },
      '/api/tencent-search': {
        target: 'https://smartbox.gtimg.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tencent-search/, ''),
      },
    },
  },
})
