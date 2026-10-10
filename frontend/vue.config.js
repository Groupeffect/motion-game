const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  publicPath: '/motion-game/',
  outputDir: '../docs',
  pwa: {
    name: 'Steady Hands',
    themeColor: '#0d1117',
    msTileColor: '#0d1117',
    registerType: 'register',
    manifestOptions: {
      name: 'Steady Hands',
      short_name: 'SteadyHands',
      description: 'How steady are your hands? Keep your device still!',
      start_url: '/motion-game/',
      display: 'standalone',
      background_color: '#0d1117',
      theme_color: '#0d1117',
      icons: [
        {
          src: '/motion-game/img/icons/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/motion-game/img/icons/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: '/motion-game/img/icons/android-chrome-maskable-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: '/motion-game/img/icons/android-chrome-maskable-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    },
    workboxOptions: {
      skipWaiting: true,
      clientsClaim: true
    }
  }
})
