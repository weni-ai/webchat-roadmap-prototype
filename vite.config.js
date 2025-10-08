import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  if (mode === 'development') {
    return {
      plugins: [react()],
      root: '.',
      server: {
        port: 3000,
        open: true
      }
    }
  }
  

  return {
    plugins: [react()],
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.js'),
        name: 'WeniWebchatTemplateReact',
        formats: ['es', 'cjs'],
        fileName: (format) => `index.${format === 'es' ? 'esm' : 'cjs'}.js`
      },
      rollupOptions: {
        external: ['react', 'react-dom', '@weni/webchat-service'],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            '@weni/webchat-service': 'WeniWebchatService'
          }
        }
      }
    }
  }
})

