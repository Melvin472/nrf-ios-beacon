import { useState } from "react";
import { BleDevice } from "@capacitor-community/bluetooth-le";
import BluetoothScanner from "@/components/BluetoothScanner";
import DeviceConnection from "@/components/DeviceConnection";

const Index = () => {
  const [selectedDevice, setSelectedDevice] = useState<BleDevice | null>(null);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        {!selectedDevice ? (
          <BluetoothScanner onDeviceSelect={setSelectedDevice} />
        ) : (
          <DeviceConnection
            device={selectedDevice}
            onDisconnect={() => setSelectedDevice(null)}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
