import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const mobileButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white hover:bg-primary shadow-lg hover:shadow-xl",
        destructive:
          "bg-destructive text-white hover:bg-destructive shadow-lg hover:shadow-xl",
        outline:
          "border-2 border-border bg-white hover:bg-muted/50 hover:border-gray-300",
        secondary: "bg-muted text-foreground hover:bg-muted",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-blue-500 underline-offset-4 hover:underline",
        gradient:
          "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl",
        success:
          "bg-success text-white hover:bg-success shadow-lg hover:shadow-xl",
        warning:
          "bg-accent text-white hover:bg-accent shadow-lg hover:shadow-xl",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 px-4 py-2",
        lg: "h-14 px-8 py-4",
        xl: "h-16 px-10 py-5 text-base",
        icon: "h-12 w-12",
        "icon-sm": "h-10 w-10",
        "icon-lg": "h-14 w-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface MobileButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof mobileButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const MobileButton = React.forwardRef<HTMLButtonElement, MobileButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading,
      icon,
      fullWidth,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const isMobile = useIsMobile();

    return (
      <Comp
        className={cn(
          mobileButtonVariants({ variant, size, className }),
          fullWidth && "w-full",
          isMobile && size === "default" && "h-14 text-base", // Larger on mobile
          loading && "cursor-not-allowed opacity-70",
        )}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {icon && !loading && (
          <span className={cn("mr-2", children ? "" : "mr-0")}>{icon}</span>
        )}
        {children}
      </Comp>
    );
  },
);

MobileButton.displayName = "MobileButton";

export { MobileButton, mobileButtonVariants };
