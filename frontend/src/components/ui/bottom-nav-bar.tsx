"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Home,
  Activity,
  Video,
  ShieldCheck,
  User,
  HeartPulse,
  Stethoscope
} from "lucide-react";

import { cn } from "@/lib/utils";

const defaultNavItems = [
  { label: "Home", icon: Home, action: 'landing' },
  { label: "Features", icon: Activity, action: 'features' },
  { label: "For Doctors", icon: Stethoscope, action: 'doctors' },
  { label: "For Patients", icon: HeartPulse, action: 'patients' },
  { label: "Sign In", icon: User, action: 'login' },
];

const MOBILE_LABEL_WIDTH = 90;

type BottomNavBarProps = {
  className?: string;
  defaultIndex?: number;
  stickyBottom?: boolean;
  onNavClick?: (action: string) => void;
};

export function BottomNavBar({
  className,
  defaultIndex = 0,
  stickyBottom = true,
  onNavClick,
}: BottomNavBarProps) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  return (
    <motion.nav
      initial={{ scale: 0.9, opacity: 0, y: 50 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      role="navigation"
      aria-label="Bottom Navigation"
      className={cn(
        "bg-background/80 backdrop-blur-xl border border-border/50 rounded-full flex items-center p-2 shadow-2xl space-x-1 min-w-[320px] max-w-[95vw] h-[52px]",
        stickyBottom && "fixed inset-x-0 bottom-6 mx-auto z-50 w-fit",
        className,
      )}
    >
      {defaultNavItems.map((item, idx) => {
        const Icon = item.icon;
        const isActive = activeIndex === idx;

        return (
          <motion.button
            key={item.label}
            whileTap={{ scale: 0.97 }}
            className={cn(
              "flex items-center gap-0 px-3 py-2 rounded-full transition-colors duration-200 relative h-10 min-w-[44px] min-h-[40px] max-h-[44px]",
              isActive
                ? "bg-primary/20 text-white gap-2"
                : "bg-transparent text-white/70 hover:bg-white/10 hover:text-white",
              "focus:outline-none focus-visible:ring-0",
            )}
            onClick={() => {
              setActiveIndex(idx);
              if (onNavClick) onNavClick(item.action);
            }}
            aria-label={item.label}
            type="button"
          >
            <Icon
              size={22}
              strokeWidth={2}
              aria-hidden
              className="transition-colors duration-200"
            />

            <motion.div
              initial={false}
              animate={{
                width: isActive ? `${MOBILE_LABEL_WIDTH}px` : "0px",
                opacity: isActive ? 1 : 0,
                marginLeft: isActive ? "8px" : "0px",
              }}
              transition={{
                width: { type: "spring", stiffness: 350, damping: 32 },
                opacity: { duration: 0.19 },
                marginLeft: { duration: 0.19 },
              }}
              className={cn("overflow-hidden flex items-center max-w-[72px]")}
            >
              <span
                className={cn(
                  "font-medium text-xs whitespace-nowrap select-none transition-opacity duration-200 overflow-hidden text-ellipsis leading-[1.9]",
                  isActive ? "text-white" : "opacity-0",
                )}
                title={item.label}
              >
                {item.label}
              </span>
            </motion.div>
          </motion.button>
        );
      })}
    </motion.nav>
  );
}

export default BottomNavBar;
