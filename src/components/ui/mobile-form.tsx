import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface MobileFormProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  submitText: string;
  isSubmitting?: boolean;
  className?: string;
  submitIcon?: React.ReactNode;
}

const MobileForm: React.FC<MobileFormProps> = ({
  title,
  icon,
  children,
  onSubmit,
  submitText,
  isSubmitting = false,
  className,
  submitIcon,
}) => {
  const isMobile = useIsMobile();

  return (
    <Card
      className={cn("border-0 shadow-lg", isMobile ? "mx-2" : "", className)}
    >
      <CardHeader
        className={cn(
          "bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg",
          isMobile ? "p-4" : "p-6",
        )}
      >
        <CardTitle
          className={cn(
            "flex items-center gap-3",
            isMobile ? "text-lg" : "text-xl",
          )}
        >
          {icon && (
            <div className="p-2 bg-white/20 rounded-lg">
              {React.cloneElement(icon as React.ReactElement, {
                className: isMobile ? "h-5 w-5" : "h-6 w-6",
              })}
            </div>
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div
            className={cn("space-y-4", isMobile ? "space-y-3" : "space-y-4")}
          >
            {children}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 text-white font-semibold shadow-lg transition-all duration-300 transform hover:scale-105",
              isMobile ? "h-12 text-base" : "h-12 text-lg",
            )}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                {isMobile ? "Processing..." : `Processing ${submitText}...`}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {submitIcon}
                {submitText}
              </div>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default MobileForm;
