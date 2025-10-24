import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.lovable.0b6b747458ec4242ab20a263a9a99ae3',
  appName: 'nRF52833 Monitor',
  webDir: 'dist',
  // Commenté pour utiliser les fichiers locaux sur l'appareil
  // server: {
  //   url: 'https://0b6b7474-58ec-4242-ab20-a263a9a99ae3.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: "Recherche d'appareils...",
        cancel: "Annuler",
        availableDevices: "Appareils disponibles",
        noDeviceFound: "Aucun appareil trouvé"
      }
    }
  }
};

export default config;
