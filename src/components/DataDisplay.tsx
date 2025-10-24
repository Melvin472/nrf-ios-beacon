import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Clock } from "lucide-react";

interface DataDisplayProps {
  data: string[];
}

const DataDisplay = ({ data }: DataDisplayProps) => {
  return (
    <Card className="p-6 bg-gradient-card shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Données reçues</h3>
        </div>
        <Badge variant="secondary">
          {data.length} message{data.length > 1 ? "s" : ""}
        </Badge>
      </div>

      <ScrollArea className="h-96 rounded-md border border-border p-4">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Database className="w-12 h-12 mb-2 opacity-50" />
            <p>En attente de données...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((item, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-muted/50 border border-border animate-fade-in"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date().toLocaleTimeString()}</span>
                </div>
                <p className="font-mono text-sm">{item}</p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};

export default DataDisplay;
