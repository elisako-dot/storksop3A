import React from "react";
import * as LucideIcons from "lucide-react";

interface DynamicIconProps extends Omit<React.ComponentPropsWithoutRef<"svg">, "name"> {
  name: string;
  className?: string;
  size?: number;
}

export default function DynamicIcon({ name, className = "w-4 h-4", size, ...props }: DynamicIconProps) {
  // Map string names to the actual components from lucide-react
  // Safe fallbacks for icons we specified in the static categorizer
  const iconMap: { [key: string]: React.ComponentType<any> } = {
    Building2: LucideIcons.Building2,
    Percent: LucideIcons.Percent,
    Activity: LucideIcons.Activity,
    ClipboardList: LucideIcons.ClipboardList,
    Files: LucideIcons.Files,
    Layers: LucideIcons.Layers,
    Pills: LucideIcons.Pill,
    Snowflake: LucideIcons.Snowflake,
    Heart: LucideIcons.Heart,
    FileText: LucideIcons.FileText,
    ShieldAlert: LucideIcons.ShieldAlert,
    Globe: LucideIcons.Globe,
    Home: LucideIcons.Home,
    Search: LucideIcons.Search,
    Edit: LucideIcons.Edit,
    Trash2: LucideIcons.Trash2,
    Plus: LucideIcons.Plus,
    Save: LucideIcons.Save,
    Lock: LucideIcons.Lock,
    LogOut: LucideIcons.LogOut,
    Menu: LucideIcons.Menu,
    X: LucideIcons.X,
    ChevronDown: LucideIcons.ChevronDown,
    ChevronUp: LucideIcons.ChevronUp,
    Download: LucideIcons.Download,
    Upload: LucideIcons.Upload,
    RefreshCw: LucideIcons.RefreshCw,
    Check: LucideIcons.Check,
    ArrowUp: LucideIcons.ArrowUp,
    ArrowDown: LucideIcons.ArrowDown,
  };

  const IconComponent = iconMap[name] || LucideIcons.HelpCircle;

  return <IconComponent className={className} size={size} {...props} />;
}
