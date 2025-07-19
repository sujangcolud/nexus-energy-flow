import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MobileResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  enableScrollArea?: boolean;
  maxHeight?: string;
}

const MobileResponsiveContainer: React.FC<MobileResponsiveContainerProps> = ({
  children,
  className,
  enableScrollArea = true,
  maxHeight = "calc(100vh - 140px)",
}) => {
  if (enableScrollArea) {
    return (
      <div
        className={cn(
          "w-full",
          // Mobile and tablet responsiveness
          "px-4 sm:px-6 lg:px-8",
          // Ensure proper spacing
          "pb-6 sm:pb-8",
          className,
        )}
      >
        <ScrollArea className="w-full overflow-x-hidden" style={{ maxHeight }}>
          <div className="space-y-6">{children}</div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full",
        // Mobile and tablet responsiveness
        "px-4 sm:px-6 lg:px-8",
        // Ensure proper spacing
        "pb-6 sm:pb-8",
        // Prevent overflow
        "overflow-x-hidden",
        className,
      )}
    >
      <div className="space-y-6">{children}</div>
    </div>
  );
};

// Form container with better mobile handling
interface MobileFormContainerProps {
  children: ReactNode;
  className?: string;
}

export const MobileFormContainer: React.FC<MobileFormContainerProps> = ({
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        "w-full max-w-none",
        // Mobile-first responsive design
        "space-y-4 sm:space-y-6",
        // Better mobile padding
        "p-4 sm:p-6",
        // Prevent horizontal overflow
        "overflow-x-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
};

// Button group with proper mobile wrapping
interface MobileButtonGroupProps {
  children: ReactNode;
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export const MobileButtonGroup: React.FC<MobileButtonGroupProps> = ({
  children,
  className,
  orientation = "horizontal",
}) => {
  return (
    <div
      className={cn(
        "w-full",
        orientation === "horizontal"
          ? "flex flex-wrap gap-2 sm:gap-3"
          : "flex flex-col space-y-2 sm:space-y-3",
        // Ensure buttons don't overflow
        "max-w-full overflow-x-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
};

// Date picker container with mobile optimization
interface MobileDatePickerContainerProps {
  children: ReactNode;
  className?: string;
}

export const MobileDatePickerContainer: React.FC<
  MobileDatePickerContainerProps
> = ({ children, className }) => {
  return (
    <div
      className={cn(
        "w-full",
        // Responsive grid for date pickers
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
        // Prevent overflow
        "overflow-x-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
};

// Card grid with proper mobile responsiveness
interface MobileCardGridProps {
  children: ReactNode;
  className?: string;
  columns?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

export const MobileCardGrid: React.FC<MobileCardGridProps> = ({
  children,
  className,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
}) => {
  const gridClasses = cn(
    "grid gap-4 sm:gap-6",
    `grid-cols-${columns.mobile}`,
    `sm:grid-cols-${columns.tablet}`,
    `lg:grid-cols-${columns.desktop}`,
    "w-full",
    className,
  );

  return <div className={gridClasses}>{children}</div>;
};

export default MobileResponsiveContainer;
