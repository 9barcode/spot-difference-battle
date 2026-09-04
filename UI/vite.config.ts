import path from 'path'
import aitDevtools from '@apps-in-toss/devtools/unplugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { requireHttpsUrl } from './src/app/url-policy'

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  if (mode === 'apps-in-toss') {
    const environment = loadEnv(mode, __dirname, '')
    const configuredServerUrl = environment.VITE_SERVER_URL?.trim()
    if (!configuredServerUrl) {
      throw new Error(
        'VITE_SERVER_URL is required for Apps in Toss builds. Enter the public HTTPS game server origin in UI/.env.apps-in-toss.',
      )
    }
    requireHttpsUrl(configuredServerUrl, 'VITE_SERVER_URL')
  }

  return {
    plugins: [
      figmaAssetResolver(),
      ...(mode === 'apps-in-toss'
        ? [
            aitDevtools.vite({
              sdkVersion: '3',
              initialState: {
                viewport: {
                  orientation: 'landscape',
                  aitNavBar: true,
                  aitNavBarType: 'game',
                },
              },
            }),
          ]
        : []),
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: true,
    },
    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
