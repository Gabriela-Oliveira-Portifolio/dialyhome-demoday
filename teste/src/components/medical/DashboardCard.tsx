import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  value?: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  status?: "normal" | "warning" | "critical";
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}

const DashboardCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  status,
  children,
  className,
  onClick
}: DashboardCardProps) => {
  const getStatusStyles = () => {
    switch (status) {
      case "normal":
        return "status-normal";
      case "warning":
        return "status-warning";
      case "critical":
        return "status-critical";
      default:
        return "";
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "text-success";
      case "down":
        return "text-destructive";
      case "stable":
        return "text-muted-foreground";
      default:
        return "";
    }
  };

  return (
    <Card 
      className={cn(
        "medical-card fade-in-up cursor-pointer hover:scale-[1.02] smooth-transition",
        status && getStatusStyles(),
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="metric-label mb-2">{title}</h3>
          {value && (
            <div className="metric-value mb-1">{value}</div>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-4">
            <div className={cn(
              "p-3 rounded-lg",
              status === "normal" && "bg-success/10 text-success",
              status === "warning" && "bg-warning/10 text-warning",
              status === "critical" && "bg-destructive/10 text-destructive",
              !status && "bg-primary/10 text-primary"
            )}>
              {icon}
            </div>
          </div>
        )}
      </div>

      {trend && trendValue && (
        <div className={cn("flex items-center text-sm", getTrendColor())}>
          <span className="font-medium">{trendValue}</span>
          <span className="ml-1">vs. período anterior</span>
        </div>
      )}

      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </Card>
  );
};

export default DashboardCard;