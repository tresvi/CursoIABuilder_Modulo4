import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  active?: boolean;
}

/**
 * Ítem de navegación de la sidebar: ícono + etiqueta cuando está expandida,
 * solo ícono (con tooltip nativo) cuando está colapsada. Reutilizado por la
 * Sidebar y el FileLoader para un look consistente.
 */
export const NavItem = React.forwardRef<HTMLButtonElement, NavItemProps>(
  ({ icon: Icon, label, collapsed, active, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      title={collapsed ? label : props.title}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-40",
        active && "bg-sidebar-accent text-sidebar-accent-foreground",
        collapsed && "justify-center px-0",
        className
      )}
      {...props}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  )
);
NavItem.displayName = "NavItem";
