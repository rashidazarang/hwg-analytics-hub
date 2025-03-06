
import React from 'react';

interface ChartLegendProps {
  statusColors: Record<string, string>;
}

export const ChartLegend: React.FC<ChartLegendProps> = ({ statusColors }) => {
  return (
    <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 mt-2">
      {Object.entries(statusColors).map(([status, color]) => (
        <div key={status} className="flex items-center">
          <span 
            className="inline-block w-3 h-3 rounded-full mr-2" 
            style={{ backgroundColor: color }}
          ></span>
          <span className="text-xs font-medium text-gray-700">{status}</span>
        </div>
      ))}
    </div>
  );
};
