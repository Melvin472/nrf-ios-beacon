import { useState } from "react";
import { BleDevice } from "@capacitor-community/bluetooth-le";
import BluetoothScanner from "@/components/BluetoothScanner";
import DeviceConnection from "@/components/DeviceConnection";
import DemoDevice from "@/components/DemoDevice";

const Index = () => {
  const [selectedDevice, setSelectedDevice] = useState<BleDevice | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const handleDisconnect = () => {
    setSelectedDevice(null);
    setIsDemoMode(false);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        {isDemoMode ? (
          <DemoDevice onDisconnect={handleDisconnect} />
        ) : !selectedDevice ? (
          <BluetoothScanner 
            onDeviceSelect={setSelectedDevice} 
            onDemoMode={() => setIsDemoMode(true)}
          />
        ) : (
          <DeviceConnection
            device={selectedDevice}
            onDisconnect={handleDisconnect}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
