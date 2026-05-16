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
      className={cn("border-none shadow-xl rounded-[2.5rem] overflow-hidden", isMobile ? "mx-2" : "", className)}
    >
      <CardHeader
        className={cn(
          "bg-primary text-primary-foreground",
          isMobile ? "p-6" : "p-8",
        )}
      >
        <CardTitle
          className={cn(
            "flex items-center gap-4 font-black uppercase tracking-tight",
            isMobile ? "text-xl" : "text-2xl",
          )}
        >
          {icon && (
            <div className="p-3 bg-white/10 rounded-2xl shadow-inner">
              {React.cloneElement(icon as React.ReactElement, {
                className: isMobile ? "h-6 w-6" : "h-7 w-7",
              })}
            </div>
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn(isMobile ? "p-6" : "p-8")}>
        <form onSubmit={onSubmit} className="space-y-6">
          <div
            className={cn("space-y-5", isMobile ? "space-y-4" : "space-y-6")}
          >
            {children}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest shadow-2xl transition-all duration-300 active:scale-[0.98] rounded-2xl",
              isMobile ? "h-14 text-base" : "h-16 text-lg",
            )}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
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
