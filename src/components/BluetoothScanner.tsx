import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bluetooth, Loader2, Radio } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BleClient, BleDevice } from "@capacitor-community/bluetooth-le";

interface BluetoothScannerProps {
  onDeviceSelect: (device: BleDevice) => void;
}

const BluetoothScanner = ({ onDeviceSelect }: BluetoothScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const { toast } = useToast();

  const startScan = async () => {
    try {
      setIsScanning(true);
      setDevices([]);

      await BleClient.initialize();
      
      await BleClient.requestLEScan(
        { 
          allowDuplicates: false,
        },
        (result) => {
          setDevices((prev) => {
            const exists = prev.find((d) => d.deviceId === result.device.deviceId);
            if (exists) return prev;
            return [...prev, result.device];
          });
        }
      );

      setTimeout(async () => {
        await BleClient.stopLEScan();
        setIsScanning(false);
      }, 10000);

      toast({
        title: "Scan démarré",
        description: "Recherche d'appareils BLE en cours...",
      });
    } catch (error) {
      console.error("Erreur de scan:", error);
      setIsScanning(false);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer le scan Bluetooth",
        variant: "destructive",
      });
    }
  };

  const stopScan = async () => {
    try {
      await BleClient.stopLEScan();
      setIsScanning(false);
    } catch (error) {
      console.error("Erreur d'arrêt du scan:", error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary shadow-glow">
          <Bluetooth className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          nRF52833 Monitor
        </h1>
        <p className="text-muted-foreground">
          Scannez et connectez-vous à votre module
        </p>
      </div>

      <div className="flex justify-center">
        {!isScanning ? (
          <Button
            onClick={startScan}
            size="lg"
            className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow"
          >
            <Radio className="w-5 h-5 mr-2" />
            Scanner les appareils
          </Button>
        ) : (
          <Button
            onClick={stopScan}
            size="lg"
            variant="secondary"
          >
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Arrêter le scan
          </Button>
        )}
      </div>

      {devices.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Appareils trouvés</h2>
          {devices.map((device) => (
            <Card
              key={device.deviceId}
              className="p-4 cursor-pointer hover:shadow-soft transition-all bg-gradient-card"
              onClick={() => onDeviceSelect(device)}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">
                    {device.name || "Appareil sans nom"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {device.deviceId}
                  </p>
                </div>
                <Bluetooth className="w-6 h-6 text-primary animate-pulse-glow" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BluetoothScanner;
