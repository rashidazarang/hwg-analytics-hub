
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
    <Card className={`overflow-hidden ${colorVariants[color]} ${className}`}>
      <CardContent className="p-2.5 xs:p-3 sm:p-4">
        <div>
          <p className="text-xs xs:text-sm font-medium mb-0.5 xs:mb-1">{title}</p>
          <h3 className="text-xl xs:text-2xl sm:text-3xl font-semibold">{value}</h3>
          
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 xs:mt-1 line-clamp-1">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default KPICard;
