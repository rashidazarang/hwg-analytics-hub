
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// Table row loading skeleton
function TableRowSkeleton({ columns }: { columns: number }) {
  return (
    <div className="flex w-full animate-pulse">
      {[...Array(columns)].map((_, i) => (
        <div 
          key={i} 
          className="flex-1 h-12 px-4 py-2 border-b border-border/50"
        >
          <div className="h-4 bg-muted rounded w-3/4"></div>
        </div>
      ))}
    </div>
  )
}

export { Skeleton, TableRowSkeleton }
