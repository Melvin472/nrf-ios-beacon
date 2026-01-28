import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bluetooth, Unplug, Activity, Lightbulb, Thermometer, Droplets, Gauge, Cpu, Zap, Info } from "lucide-react";
import BME280Charts, { BME280Data } from "./BME280Charts";

interface DemoDeviceProps {
  onDisconnect: () => void;
}

const DemoDevice = ({ onDisconnect }: DemoDeviceProps) => {
  const [ledState, setLedState] = useState(false);
  const [bme280Data, setBme280Data] = useState<BME280Data[]>([]);
  const [buttonPressed, setButtonPressed] = useState(false);

  // Simulate LED blinking
  useEffect(() => {
    const interval = setInterval(() => {
      setLedState(prev => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Simulate BME280 data updates
  useEffect(() => {
    const updateData = () => {
      const baseTemp = 22 + Math.random() * 3;
      const baseHumidity = 45 + Math.random() * 10;
      const basePressure = 1013 + Math.random() * 5;

      setBme280Data(prev => {
        const newEntry: BME280Data = {
          timestamp: new Date(),
          temperature: baseTemp,
          humidity: baseHumidity,
          pressure: basePressure,
        };
        return [...prev, newEntry].slice(-50);
      });
    };

    // Initial data
    updateData();
    const interval = setInterval(updateData, 2000);
    return () => clearInterval(interval);
  }, []);

  // Simulate button press
  useEffect(() => {
    const interval = setInterval(() => {
      setButtonPressed(true);
      setTimeout(() => setButtonPressed(false), 200);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Device Header */}
      <Card className="p-6 bg-gradient-card shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
              <Bluetooth className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold">nRF52833 DK</h2>
              <p className="text-sm text-muted-foreground">Mode Démonstration</p>
            </div>
          </div>
          <Badge variant="default" className="bg-success">
            <Activity className="w-3 h-3 mr-1" />
            Connecté
          </Badge>
        </div>

        <Button
          onClick={onDisconnect}
          variant="destructive"
          className="w-full"
        >
          <Unplug className="w-4 h-4 mr-2" />
          Déconnecter
        </Button>
      </Card>

      {/* LED Status Card */}
      <Card className="p-6 bg-gradient-card shadow-soft overflow-hidden relative">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">État des LEDs</h3>
          <Badge variant="outline" className="ml-auto">Temps réel</Badge>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {/* LED 1 - Blinking */}
          <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50 border border-border">
            <div 
              className={`w-12 h-12 rounded-full mb-2 transition-all duration-200 flex items-center justify-center ${
                ledState 
                  ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]' 
                  : 'bg-muted border-2 border-border'
              }`}
            >
              <Lightbulb className={`w-6 h-6 ${ledState ? 'text-white' : 'text-muted-foreground'}`} />
            </div>
            <p className="text-sm font-medium">LED 1</p>
            <p className="text-xs text-muted-foreground">Clignote</p>
            <Badge variant={ledState ? "default" : "secondary"} className={`mt-1 text-xs ${ledState ? 'bg-green-500' : ''}`}>
              {ledState ? "ON" : "OFF"}
            </Badge>
          </div>

          {/* LED 2 - Fixed ON */}
          <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50 border border-border">
            <div className="w-12 h-12 rounded-full mb-2 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.6)] flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm font-medium">LED 2</p>
            <p className="text-xs text-muted-foreground">Fixe</p>
            <Badge variant="default" className="mt-1 text-xs bg-blue-500">ON</Badge>
          </div>

          {/* LED 3 - OFF */}
          <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50 border border-border">
            <div className="w-12 h-12 rounded-full mb-2 bg-muted border-2 border-border flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">LED 3</p>
            <p className="text-xs text-muted-foreground">Éteinte</p>
            <Badge variant="secondary" className="mt-1 text-xs">OFF</Badge>
          </div>

          {/* LED 4 - Button controlled */}
          <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50 border border-border">
            <div 
              className={`w-12 h-12 rounded-full mb-2 transition-all duration-100 flex items-center justify-center ${
                buttonPressed 
                  ? 'bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.6)]' 
                  : 'bg-muted border-2 border-border'
              }`}
            >
              <Lightbulb className={`w-6 h-6 ${buttonPressed ? 'text-white' : 'text-muted-foreground'}`} />
            </div>
            <p className="text-sm font-medium">LED 4</p>
            <p className="text-xs text-muted-foreground">Bouton</p>
            <Badge variant={buttonPressed ? "default" : "secondary"} className={`mt-1 text-xs ${buttonPressed ? 'bg-yellow-500' : ''}`}>
              {buttonPressed ? "ON" : "OFF"}
            </Badge>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border">
          <p className="text-xs text-muted-foreground">
            💡 <strong>LED 1</strong> clignote à 1Hz • <strong>LED 2</strong> est allumée en permanence • <strong>LED 4</strong> s'allume quand le bouton est pressé
          </p>
        </div>
      </Card>

      {/* Button Status */}
      <Card className="p-6 bg-gradient-card shadow-soft">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">État du Bouton</h3>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border">
          <div 
            className={`w-16 h-16 rounded-full transition-all duration-100 flex items-center justify-center ${
              buttonPressed 
                ? 'bg-primary shadow-glow scale-95' 
                : 'bg-muted border-2 border-border'
            }`}
          >
            <span className={`text-2xl font-bold ${buttonPressed ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
              B1
            </span>
          </div>
          <div>
            <p className="font-medium">Bouton 1 (SW1)</p>
            <p className="text-sm text-muted-foreground">
              {buttonPressed ? "Pressé - LED 4 allumée" : "Relâché - LED 4 éteinte"}
            </p>
            <Badge variant={buttonPressed ? "default" : "outline"} className="mt-2">
              {buttonPressed ? "PRESSED" : "RELEASED"}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Device Info */}
      <Card className="p-6 bg-gradient-card shadow-soft">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Informations Appareil</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">Modèle</p>
            <p className="font-medium">nRF52833 DK</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">Firmware</p>
            <p className="font-medium">v1.0.0</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">Services BLE</p>
            <p className="font-medium">3 actifs</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">RSSI</p>
            <p className="font-medium">-45 dBm</p>
          </div>
        </div>
      </Card>

      {/* BME280 Charts */}
      <Card className="p-6 bg-gradient-card shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Capteur BME280</h3>
          </div>
          <Badge variant="default" className="bg-success">
            Temps réel
          </Badge>
        </div>
        <BME280Charts 
          data={bme280Data} 
          latestData={bme280Data[bme280Data.length - 1] || null} 
        />
      </Card>
    </div>
  );
};

export default DemoDevice;
