import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Bluetooth, Unplug, Activity, Loader2, Signal, Info, Cpu, Zap, Battery, Smartphone, Edit3, Send } from "lucide-react";
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
  const [readableInfo, setReadableInfo] = useState({
    batteryLevel: null as number | null,
    manufacturer: null as string | null,
    modelNumber: null as string | null,
    serialNumber: null as string | null,
    firmwareVersion: null as string | null,
    hardwareVersion: null as string | null,
  });
  const [writeValues, setWriteValues] = useState<Record<string, string>>({});
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

      // Lire les caractéristiques standard pour informations lisibles
      await readStandardCharacteristics(discoveredServices);

      // Lire toutes les données disponibles immédiatement
      await readAllCharacteristics(discoveredServices);

      // Lire les caractéristiques disponibles pour notifications
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

  const getServiceName = (uuid: string): string => {
    const uuidLower = uuid.toLowerCase();
    const serviceNames: Record<string, string> = {
      '180f': 'Batterie',
      '180a': 'Informations appareil',
      '1800': 'Accès générique',
      '1801': 'Attribut générique',
      '1805': 'Heure actuelle',
      '1810': 'Pression artérielle',
      '1812': 'Interface humaine (HID)',
      '1816': 'Cyclisme',
      '1818': 'Fréquence cardiaque',
      '181a': 'Données environnementales',
      '181c': 'Mesure corporelle',
      '181d': 'Contrôle de poids',
    };
    
    for (const [key, name] of Object.entries(serviceNames)) {
      if (uuidLower.includes(key)) return name;
    }
    return 'Service personnalisé';
  };

  const getCharacteristicName = (uuid: string): string => {
    const uuidLower = uuid.toLowerCase();
    const charNames: Record<string, string> = {
      '2a19': 'Niveau batterie',
      '2a29': 'Fabricant',
      '2a24': 'Numéro modèle',
      '2a25': 'Numéro série',
      '2a26': 'Version logicielle',
      '2a27': 'Version matérielle',
      '2a00': "Nom de l'appareil",
      '2a01': 'Apparence',
      '2a23': 'ID système',
      '2a50': 'Caractéristiques PnP',
    };
    
    for (const [key, name] of Object.entries(charNames)) {
      if (uuidLower.includes(key)) return name;
    }
    return uuid.substring(0, 8);
  };

  const writeCharacteristic = async (serviceUuid: string, charUuid: string, value: string) => {
    try {
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(value);
      const dataView = new DataView(uint8Array.buffer);
      
      await BleClient.write(device.deviceId, serviceUuid, charUuid, dataView);
      
      toast({
        title: "Écriture réussie",
        description: `Valeur "${value}" écrite avec succès`,
      });
      
      // Relire la caractéristique pour voir le changement
      await readAllCharacteristics(services);
    } catch (error) {
      console.error("Erreur d'écriture:", error);
      toast({
        title: "Erreur d'écriture",
        description: "Impossible d'écrire dans cette caractéristique",
        variant: "destructive",
      });
    }
  };

  const readAllCharacteristics = async (discoveredServices: BleService[]) => {
    const dataList: string[] = [];

    console.log(`📡 Lecture de ${discoveredServices.length} services...`);

    for (const service of discoveredServices) {
      const serviceName = getServiceName(service.uuid);
      console.log(`🔍 Service: ${serviceName} (${service.uuid})`);
      
      for (const char of service.characteristics) {
        const charName = getCharacteristicName(char.uuid);
        
        if (char.properties.read) {
          try {
            console.log(`  ↳ Lecture de ${charName}...`);
            const value = await BleClient.read(device.deviceId, service.uuid, char.uuid);
            const decoder = new TextDecoder();
            let text = decoder.decode(value);
            
            // Si c'est des données binaires, afficher en hexadécimal
            if (!text || text.includes('�')) {
              const bytes = new Uint8Array(value.buffer);
              const hex = Array.from(bytes)
                .map(b => b.toString(16).padStart(2, '0'))
                .join(' ');
              
              // Essayer de détecter le type de données
              if (bytes.length === 1) {
                text = `${bytes[0]} (0x${hex})`;
              } else {
                text = `[HEX] ${hex}`;
              }
            }
            
            dataList.push(`${serviceName} - ${charName}: ${text}`);
            console.log(`  ✓ ${charName}: ${text}`);
          } catch (e) {
            console.log(`  ✗ Impossible de lire ${charName}:`, e);
            dataList.push(`${serviceName} - ${charName}: ⚠️ Accès refusé`);
          }
        } else {
          console.log(`  ⊝ ${charName}: Lecture non disponible`);
        }
      }
    }

    console.log(`✓ ${dataList.length} caractéristiques lues`);
    
    if (dataList.length > 0) {
      setReceivedData(dataList);
    } else {
      setReceivedData(['ℹ️ Aucune donnée lisible trouvée. Certains appareils limitent l\'accès aux données.']);
    }
  };

  const readStandardCharacteristics = async (discoveredServices: BleService[]) => {
    const newReadableInfo = { ...readableInfo };

    for (const service of discoveredServices) {
      try {
        // Battery Service (0x180F)
        if (service.uuid.toLowerCase().includes('180f')) {
          for (const char of service.characteristics) {
            if (char.uuid.toLowerCase().includes('2a19') && char.properties.read) {
              try {
                const value = await BleClient.read(device.deviceId, service.uuid, char.uuid);
                const batteryLevel = new DataView(value.buffer).getUint8(0);
                newReadableInfo.batteryLevel = batteryLevel;
              } catch (e) {
                console.log("Impossible de lire le niveau de batterie", e);
              }
            }
          }
        }

        // Device Information Service (0x180A)
        if (service.uuid.toLowerCase().includes('180a')) {
          for (const char of service.characteristics) {
            if (char.properties.read) {
              try {
                const value = await BleClient.read(device.deviceId, service.uuid, char.uuid);
                const decoder = new TextDecoder();
                const text = decoder.decode(value);

                // Manufacturer Name (0x2A29)
                if (char.uuid.toLowerCase().includes('2a29')) {
                  newReadableInfo.manufacturer = text;
                }
                // Model Number (0x2A24)
                else if (char.uuid.toLowerCase().includes('2a24')) {
                  newReadableInfo.modelNumber = text;
                }
                // Serial Number (0x2A25)
                else if (char.uuid.toLowerCase().includes('2a25')) {
                  newReadableInfo.serialNumber = text;
                }
                // Firmware Revision (0x2A26)
                else if (char.uuid.toLowerCase().includes('2a26')) {
                  newReadableInfo.firmwareVersion = text;
                }
                // Hardware Revision (0x2A27)
                else if (char.uuid.toLowerCase().includes('2a27')) {
                  newReadableInfo.hardwareVersion = text;
                }
              } catch (e) {
                console.log("Impossible de lire une caractéristique", e);
              }
            }
          }
        }
      } catch (error) {
        console.log("Erreur lors de la lecture du service:", error);
      }
    }

    setReadableInfo(newReadableInfo);
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
              <Smartphone className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Informations de l'appareil</h3>
            </div>
            
            <div className="space-y-3">
              {/* Device Name */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bluetooth className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Nom de l'appareil</p>
                  <p className="text-base font-semibold">{device.name || "Appareil sans nom"}</p>
                </div>
              </div>

              {/* Battery Level */}
              {readableInfo.batteryLevel !== null && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                    <Battery className="w-5 h-5 text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Niveau de batterie</p>
                    <p className="text-base font-semibold">{readableInfo.batteryLevel}%</p>
                  </div>
                </div>
              )}

              {/* Manufacturer */}
              {readableInfo.manufacturer && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Info className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Fabricant</p>
                    <p className="text-base font-semibold">{readableInfo.manufacturer}</p>
                  </div>
                </div>
              )}

              {/* Model Number */}
              {readableInfo.modelNumber && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Modèle</p>
                    <p className="text-base font-semibold">{readableInfo.modelNumber}</p>
                  </div>
                </div>
              )}

              {/* Serial Number */}
              {readableInfo.serialNumber && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Info className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Numéro de série</p>
                    <p className="text-base font-mono text-sm">{readableInfo.serialNumber}</p>
                  </div>
                </div>
              )}

              {/* Firmware Version */}
              {readableInfo.firmwareVersion && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Version logicielle</p>
                    <p className="text-base font-mono text-sm">{readableInfo.firmwareVersion}</p>
                  </div>
                </div>
              )}

              {/* Hardware Version */}
              {readableInfo.hardwareVersion && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Version matérielle</p>
                    <p className="text-base font-mono text-sm">{readableInfo.hardwareVersion}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-1">ℹ️ Note de sécurité</p>
              <p className="text-sm">
                Seules les informations que l'appareil choisit de partager via Bluetooth sont visibles. 
                Les données sensibles comme les mots de passe ne sont jamais accessibles pour des raisons de sécurité.
              </p>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card shadow-soft">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Détails techniques</h3>
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
                          <p className="font-medium text-sm">{getServiceName(service.uuid)}</p>
                          <p className="text-xs text-muted-foreground font-mono">{service.uuid}</p>
                        </div>
                        <Badge variant="secondary">
                          {service.characteristics.length} caractéristique{service.characteristics.length > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 ml-4 space-y-2">
                        {service.characteristics.map((char) => {
                          const charKey = `${service.uuid}-${char.uuid}`;
                          return (
                            <div key={char.uuid} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                              <div>
                                <p className="text-sm font-medium">{getCharacteristicName(char.uuid)}</p>
                                <p className="text-xs font-mono text-muted-foreground">{char.uuid}</p>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                {char.properties.read && <Badge variant="outline" className="text-xs">Lecture</Badge>}
                                {char.properties.write && <Badge variant="outline" className="text-xs">Écriture</Badge>}
                                {char.properties.notify && <Badge variant="outline" className="text-xs">Notification</Badge>}
                                {char.properties.indicate && <Badge variant="outline" className="text-xs">Indication</Badge>}
                              </div>
                              
                              {char.properties.write && (
                                <div className="flex gap-2 mt-2">
                                  <Input
                                    placeholder="Valeur à écrire..."
                                    value={writeValues[charKey] || ""}
                                    onChange={(e) => setWriteValues(prev => ({...prev, [charKey]: e.target.value}))}
                                    className="text-sm"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (writeValues[charKey]) {
                                        writeCharacteristic(service.uuid, char.uuid, writeValues[charKey]);
                                      }
                                    }}
                                    disabled={!writeValues[charKey]}
                                  >
                                    <Send className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
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
