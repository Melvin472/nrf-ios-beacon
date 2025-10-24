import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bluetooth, Unplug, Activity, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BleClient, BleDevice } from "@capacitor-community/bluetooth-le";
import DataDisplay from "./DataDisplay";

interface DeviceConnectionProps {
  device: BleDevice;
  onDisconnect: () => void;
}

const DeviceConnection = ({ device, onDisconnect }: DeviceConnectionProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [receivedData, setReceivedData] = useState<string[]>([]);
  const { toast } = useToast();

  const connect = async () => {
    try {
      setIsConnecting(true);
      
      await BleClient.connect(device.deviceId, (deviceId) => {
        console.log(`Appareil déconnecté: ${deviceId}`);
        setIsConnected(false);
        toast({
          title: "Déconnecté",
          description: "L'appareil a été déconnecté",
        });
      });

      setIsConnected(true);
      setIsConnecting(false);
      
      toast({
        title: "Connecté",
        description: `Connecté à ${device.name || device.deviceId}`,
      });

      // Découvrir les services et caractéristiques
      const services = await BleClient.getServices(device.deviceId);
      console.log("Services disponibles:", services);

      // Lire les caractéristiques disponibles
      for (const service of services) {
        for (const characteristic of service.characteristics) {
          try {
            // S'abonner aux notifications si disponible
            if (characteristic.properties.notify) {
              await BleClient.startNotifications(
                device.deviceId,
                service.uuid,
                characteristic.uuid,
                (value) => {
                  const decoder = new TextDecoder();
                  const data = decoder.decode(value);
                  setReceivedData((prev) => [...prev, data]);
                }
              );
            }
          } catch (error) {
            console.error("Erreur de notification:", error);
          }
        }
      }
    } catch (error) {
      console.error("Erreur de connexion:", error);
      setIsConnecting(false);
      toast({
        title: "Erreur",
        description: "Impossible de se connecter à l'appareil",
        variant: "destructive",
      });
    }
  };

  const disconnect = async () => {
    try {
      await BleClient.disconnect(device.deviceId);
      setIsConnected(false);
      onDisconnect();
      toast({
        title: "Déconnecté",
        description: "Déconnexion réussie",
      });
    } catch (error) {
      console.error("Erreur de déconnexion:", error);
    }
  };

  useEffect(() => {
    connect();
    return () => {
      if (isConnected) {
        BleClient.disconnect(device.deviceId).catch(console.error);
      }
    };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-6 bg-gradient-card shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
              <Bluetooth className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {device.name || "Appareil BLE"}
              </h2>
              <p className="text-sm text-muted-foreground">{device.deviceId}</p>
            </div>
          </div>
          <Badge
            variant={isConnected ? "default" : "secondary"}
            className={isConnected ? "bg-success" : ""}
          >
            <Activity className="w-3 h-3 mr-1" />
            {isConnecting
              ? "Connexion..."
              : isConnected
              ? "Connecté"
              : "Déconnecté"}
          </Badge>
        </div>

        <Button
          onClick={disconnect}
          variant="destructive"
          className="w-full"
          disabled={!isConnected}
        >
          {isConnecting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Unplug className="w-4 h-4 mr-2" />
          )}
          Déconnecter
        </Button>
      </Card>

      {isConnected && <DataDisplay data={receivedData} />}
    </div>
  );
};

export default DeviceConnection;
