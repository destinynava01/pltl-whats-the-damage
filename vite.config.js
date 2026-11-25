import { networkInterfaces } from 'node:os'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// This computer's Wi-Fi/Ethernet address, so the lobby's QR code works on phones
// even when the leader opened the site at localhost
function findNetworkAddress() {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (
        address.family === 'IPv4' &&
        !address.internal &&
        !address.address.startsWith('169.254.')
      ) {
        return address.address
      }
    }
  }

  return ''
}

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  define: {
    // Only during `npm run dev`; a deployed site uses its real web address instead
    __DEV_NETWORK_ADDRESS__: JSON.stringify(
      command === 'serve' ? findNetworkAddress() : ''
    ),
  },
}))
