import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";

export interface MobileInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

const MobileInput = React.forwardRef<HTMLInputElement, MobileInputProps>(
  ({ className, type, label, error, icon, rightElement, ...props }, ref) => {
    const isMobile = useIsMobile();

    return (
      <div className="space-y-2">
        {label && (
          <Label
            className={cn(
              "text-sm font-medium",
              isMobile ? "text-base" : "text-sm",
            )}
          >
            {label}
          </Label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex w-full rounded-xl border border-border bg-white px-3 py-3 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              icon && "pl-10",
              rightElement && "pr-10",
              isMobile && "py-4 text-base rounded-2xl", // Larger touch targets on mobile
              error && "border-red-300 focus-visible:ring-red-500",
              className,
            )}
            ref={ref}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p
            className={cn(
              "text-destructive font-medium",
              isMobile ? "text-sm" : "text-xs",
            )}
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

MobileInput.displayName = "MobileInput";

export { MobileInput };
