import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Thermometer, Droplets, Gauge } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";

export interface BME280Data {
  timestamp: Date;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
}

interface BME280ChartsProps {
  data: BME280Data[];
  latestData: BME280Data | null;
}

const temperatureConfig: ChartConfig = {
  temperature: {
    label: "Température",
    color: "hsl(var(--chart-1))",
  },
};

const humidityConfig: ChartConfig = {
  humidity: {
    label: "Humidité",
    color: "hsl(var(--chart-2))",
  },
};

const pressureConfig: ChartConfig = {
  pressure: {
    label: "Pression",
    color: "hsl(var(--chart-3))",
  },
};

const BME280Charts = ({ data, latestData }: BME280ChartsProps) => {
  const chartData = data.map((d, index) => ({
    time: d.timestamp.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    temperature: d.temperature,
    humidity: d.humidity,
    pressure: d.pressure,
    index,
  }));

  return (
    <div className="space-y-4">
      {/* Current Values Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 bg-gradient-card border-chart-1/30">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-chart-1/20 flex items-center justify-center mb-2">
              <Thermometer className="w-5 h-5 text-chart-1" />
            </div>
            <p className="text-xs text-muted-foreground">Température</p>
            <p className="text-xl font-bold text-chart-1">
              {latestData?.temperature !== null && latestData?.temperature !== undefined
                ? `${latestData.temperature.toFixed(1)}°C`
                : "--"}
            </p>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-card border-chart-2/30">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-chart-2/20 flex items-center justify-center mb-2">
              <Droplets className="w-5 h-5 text-chart-2" />
            </div>
            <p className="text-xs text-muted-foreground">Humidité</p>
            <p className="text-xl font-bold text-chart-2">
              {latestData?.humidity !== null && latestData?.humidity !== undefined
                ? `${latestData.humidity.toFixed(1)}%`
                : "--"}
            </p>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-card border-chart-3/30">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-chart-3/20 flex items-center justify-center mb-2">
              <Gauge className="w-5 h-5 text-chart-3" />
            </div>
            <p className="text-xs text-muted-foreground">Pression</p>
            <p className="text-xl font-bold text-chart-3">
              {latestData?.pressure !== null && latestData?.pressure !== undefined
                ? `${latestData.pressure.toFixed(0)} hPa`
                : "--"}
            </p>
          </div>
        </Card>
      </div>

      {/* Temperature Chart */}
      <Card className="p-4 bg-gradient-card shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-chart-1" />
            <h4 className="font-semibold text-sm">Température</h4>
          </div>
          <Badge variant="outline" className="text-xs">
            {data.length} points
          </Badge>
        </div>
        <ChartContainer config={temperatureConfig} className="h-32 w-full">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              domain={["auto", "auto"]}
              width={35}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="temperature"
              stroke="var(--color-temperature)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      </Card>

      {/* Humidity Chart */}
      <Card className="p-4 bg-gradient-card shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-chart-2" />
            <h4 className="font-semibold text-sm">Humidité</h4>
          </div>
          <Badge variant="outline" className="text-xs">
            {data.length} points
          </Badge>
        </div>
        <ChartContainer config={humidityConfig} className="h-32 w-full">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              width={35}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="humidity"
              stroke="var(--color-humidity)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      </Card>

      {/* Pressure Chart */}
      <Card className="p-4 bg-gradient-card shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-chart-3" />
            <h4 className="font-semibold text-sm">Pression</h4>
          </div>
          <Badge variant="outline" className="text-xs">
            {data.length} points
          </Badge>
        </div>
        <ChartContainer config={pressureConfig} className="h-32 w-full">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              domain={["auto", "auto"]}
              width={45}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="pressure"
              stroke="var(--color-pressure)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      </Card>

      {data.length === 0 && (
        <Card className="p-6 bg-gradient-card shadow-soft">
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
            <Thermometer className="w-12 h-12 mb-2 opacity-50" />
            <p>En attente de données BME280...</p>
            <p className="text-xs mt-1">
              Les données apparaîtront ici dès qu'elles seront reçues via BLE
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default BME280Charts;
