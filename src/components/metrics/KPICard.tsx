
import React from 'react';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <Card className={cn(
      "overflow-hidden card-hover-effect border border-gray-100",
      colorVariants[color],
      className
    )}>
      <CardContent className="p-4 sm:p-6 md:p-8">
        <div className="flex justify-between items-start">
          <div className="text-left">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="kpi-value mt-2 sm:mt-3 font-bold text-xl sm:text-2xl md:text-3xl tracking-tight">{value}</h3>
            
            {description && (
              <p className="text-xs text-muted-foreground mt-1 sm:mt-2">{description}</p>
            )}
          </div>
          
          <div className={cn(
            "p-2 sm:p-3 rounded-full",
            colorVariants[color],
            "bg-opacity-30"
          )}>
            <Icon className={cn(
              "h-5 w-5 sm:h-6 sm:w-6",
              iconColorVariants[color]
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KPICard;
