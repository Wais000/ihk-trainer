import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        success: "bg-success text-success-foreground hover:bg-success/90",
        link: "text-primary underline-offset-4 hover:underline",
        // The "selected" look for a filter/toggle pill (see size: "pill")
        // — pair with `outline` for its unselected sibling so every such
        // pill in the app shares one definition instead of each screen
        // hand-rolling its own active/inactive classes.
        accent: "border border-primary bg-accent text-accent-foreground hover:bg-accent/80",
      },
      // "lg"/"touch" sizes exist to keep click targets large (low physical effort requirement)
      size: {
        default: "h-10 px-4 py-2 [&_svg]:size-4",
        sm: "h-9 rounded-md px-3 [&_svg]:size-4",
        lg: "h-12 rounded-md px-6 text-base [&_svg]:size-5",
        touch: "h-14 min-w-14 rounded-lg px-6 text-base [&_svg]:size-5",
        icon: "h-10 w-10 [&_svg]:size-4",
        // A small rounded-pill chip — filter tabs, flag-type pickers, etc.
        // Use with variant="accent" (selected) or variant="outline" (not).
        pill: "h-8 rounded-pill px-3 text-sm [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
