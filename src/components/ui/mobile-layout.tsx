import * as React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Menu, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  className?: string;
  showBackButton?: boolean;
  fullWidth?: boolean;
}

export function MobileLayout({
  children,
  title,
  subtitle,
  headerActions,
  className,
  showBackButton = true,
  fullWidth = false,
}: MobileLayoutProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  if (!isMobile) {
    // Desktop layout - minimal wrapper
    return (
      <div className={cn("space-y-6", className)}>
        {(title || headerActions) && (
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {title}
                </h1>
              )}
              {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
            </div>
            {headerActions && (
              <div className="flex items-center gap-2">{headerActions}</div>
            )}
          </div>
        )}
        <div className={cn(!fullWidth && "max-w-7xl mx-auto")}>{children}</div>
      </div>
    );
  }

  // Mobile layout with app-like styling
  return (
    <div className="min-h-screen bg-muted/50">
      {/* Mobile Header */}
      {(title || headerActions || showBackButton) && (
        <div className="bg-white border-b border-border sticky top-0 z-40">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {showBackButton && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(-1)}
                    className="h-10 w-10 p-0 hover:bg-muted"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
                <div>
                  {title && (
                    <h1 className="text-lg font-semibold text-foreground">
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                  )}
                </div>
              </div>

              {headerActions && (
                <div className="flex items-center gap-2">{headerActions}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Content */}
      <div className={cn("p-4 pb-safe", className)}>{children}</div>
    </div>
  );
}

interface MobileCardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  noPadding?: boolean;
}

export function MobileCard({
  children,
  title,
  description,
  className,
  noPadding = false,
}: MobileCardProps) {
  const isMobile = useIsMobile();

  return (
    <Card
      className={cn(
        "border-0 shadow-sm",
        isMobile && "rounded-2xl shadow-lg",
        className,
      )}
    >
      {(title || description) && (
        <CardHeader className={cn(isMobile && "px-6 py-5")}>
          {title && (
            <CardTitle className={cn(isMobile ? "text-xl" : "text-lg")}>
              {title}
            </CardTitle>
          )}
          {description && (
            <p
              className={cn(
                "text-muted-foreground",
                isMobile ? "text-base" : "text-sm",
              )}
            >
              {description}
            </p>
          )}
        </CardHeader>
      )}
      <CardContent
        className={cn(
          noPadding && "p-0",
          isMobile && !noPadding && "px-6 py-5",
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}

interface MobileFormProps {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}

export function MobileForm({ children, onSubmit, className }: MobileFormProps) {
  const isMobile = useIsMobile();

  return (
    <form
      onSubmit={onSubmit}
      className={cn("space-y-4", isMobile && "space-y-6", className)}
    >
      {children}
    </form>
  );
}

interface MobileGridProps {
  children: React.ReactNode;
  cols?: number;
  className?: string;
}

export function MobileGrid({ children, cols = 2, className }: MobileGridProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        `grid gap-4`,
        isMobile ? "grid-cols-1 gap-6" : `grid-cols-${cols} gap-6`,
        className,
      )}
    >
      {children}
    </div>
  );
}

interface MobileButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  direction?: "horizontal" | "vertical";
}

export function MobileButtonGroup({
  children,
  className,
  direction = "horizontal",
}: MobileButtonGroupProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        "flex gap-3",
        isMobile || direction === "vertical" ? "flex-col" : "flex-row",
        className,
      )}
    >
      {children}
    </div>
  );
}

export { MobileLayout as default };
