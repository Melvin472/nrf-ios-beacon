import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bluetooth, Unplug, Activity, Loader2, Signal, Info, Cpu, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BleClient, BleDevice, BleService } from "@capacitor-community/bluetooth-le";
import DataDisplay from "./DataDisplay";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface DeviceConnectionProps {
  device: BleDevice;
  onDisconnect: () => void;
}

const DeviceConnection = ({ device, onDisconnect }: DeviceConnectionProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [receivedData, setReceivedData] = useState<string[]>([]);
  const [services, setServices] = useState<BleService[]>([]);
  const [deviceDetails, setDeviceDetails] = useState({
    rssi: 0,
    servicesCount: 0,
    characteristicsCount: 0,
  });
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
      const discoveredServices = await BleClient.getServices(device.deviceId);
      console.log("Services disponibles:", discoveredServices);
      setServices(discoveredServices);

      // Calculer les statistiques
      let charCount = 0;
      for (const service of discoveredServices) {
        charCount += service.characteristics.length;
      }
      
      setDeviceDetails({
        rssi: 0, // RSSI non disponible après connexion
        servicesCount: discoveredServices.length,
        characteristicsCount: charCount,
      });

      // Lire les caractéristiques disponibles
      for (const service of discoveredServices) {
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

      {isConnected && (
        <>
          <Card className="p-6 bg-gradient-card shadow-soft">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Informations de l'appareil</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Services BLE</p>
                  <p className="text-lg font-bold">{deviceDetails.servicesCount}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Caractéristiques</p>
                  <p className="text-lg font-bold">{deviceDetails.characteristicsCount}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Explication</p>
              <p className="text-sm">
                Les <strong>services</strong> sont les fonctionnalités de votre appareil (comme la lecture de données).
                Les <strong>caractéristiques</strong> sont les informations spécifiques que vous pouvez lire ou modifier.
              </p>
            </div>
          </Card>

          {services.length > 0 && (
            <Card className="p-6 bg-gradient-card shadow-soft">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Services disponibles</h3>
              </div>
              
              <div className="space-y-3">
                {services.map((service, index) => (
                  <Collapsible key={service.uuid}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border hover:bg-muted/70 transition-colors cursor-pointer">
                        <div className="text-left">
                          <p className="font-medium text-sm">Service {index + 1}</p>
                          <p className="text-xs text-muted-foreground font-mono">{service.uuid}</p>
                        </div>
                        <Badge variant="secondary">
                          {service.characteristics.length} caractéristique{service.characteristics.length > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 ml-4 space-y-2">
                        {service.characteristics.map((char) => (
                          <div key={char.uuid} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                            <p className="text-xs font-mono text-muted-foreground mb-1">{char.uuid}</p>
                            <div className="flex gap-2 flex-wrap">
                              {char.properties.read && <Badge variant="outline" className="text-xs">Lecture</Badge>}
                              {char.properties.write && <Badge variant="outline" className="text-xs">Écriture</Badge>}
                              {char.properties.notify && <Badge variant="outline" className="text-xs">Notification</Badge>}
                              {char.properties.indicate && <Badge variant="outline" className="text-xs">Indication</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </Card>
          )}

          <DataDisplay data={receivedData} />
        </>
      )}
    </div>
  );
};

export default DeviceConnection;
