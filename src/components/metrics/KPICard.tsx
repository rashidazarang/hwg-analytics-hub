
import React from 'react';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

type KPICardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  description?: string;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info';
  className?: string;
};

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  description,
  color = 'default',
  className = '',
}) => {
  const colorVariants = {
    default: 'bg-card',
    primary: 'bg-primary/10',
    success: 'bg-success/10',
    warning: 'bg-warning/10',
    destructive: 'bg-destructive/10',
    info: 'bg-info/10'
  };

  const iconColorVariants = {
    default: 'text-primary',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
    info: 'text-info'
  };

  return (
    <Card className={`overflow-hidden card-hover-effect ${colorVariants[color]} ${className} border border-gray-100`}>
      <CardContent className="p-6 sm:p-8">
        <div className="flex justify-between items-start">
          <div className="text-left">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="kpi-value mt-3 font-bold text-2xl sm:text-3xl tracking-tight">{value}</h3>
            
            {description && (
              <p className="text-xs text-muted-foreground mt-2">{description}</p>
            )}
          </div>
          
          <div className={`p-3 rounded-full ${colorVariants[color]} bg-opacity-30`}>
            <Icon className={`h-6 w-6 ${iconColorVariants[color]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KPICard;
