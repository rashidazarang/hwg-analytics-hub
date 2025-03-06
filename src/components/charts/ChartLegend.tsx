
import React from 'react';

interface ChartLegendProps {
  statusColors: Record<string, string>;
}

export const ChartLegend: React.FC<ChartLegendProps> = ({ statusColors }) => {
  return (
    <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 mt-2 mb-1 max-w-full">
      {Object.entries(statusColors).map(([status, color]) => (
        <div key={status} className="flex items-center">
          <span 
            className="inline-block w-2 h-2 rounded-full mr-1.5" 
            style={{ backgroundColor: color }}
          ></span>
          <span className="text-xs font-medium">{status}</span>
        </div>
      ))}
    </div>
  );
};
