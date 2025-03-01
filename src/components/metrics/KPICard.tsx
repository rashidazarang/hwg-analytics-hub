
import React from 'react';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

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
    <Card className={`overflow-hidden card-hover-effect ${colorVariants[color]} ${className}`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="kpi-value mt-2">{value}</h3>
            
            {trend && (
              <div className={trend.isPositive ? 'trend-up' : 'trend-down'}>
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span className="text-xs font-medium">{trend.value}% {trend.label}</span>
              </div>
            )}
            
            {description && (
              <p className="text-xs text-muted-foreground mt-2">{description}</p>
            )}
          </div>
          
          <div className={`p-2 rounded-full ${colorVariants[color]} bg-opacity-20`}>
            <Icon className={`h-5 w-5 ${iconColorVariants[color]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KPICard;
