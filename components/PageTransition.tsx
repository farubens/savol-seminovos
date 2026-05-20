"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function PageTransition({ children }: Props) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="route-transition-bar"
          initial={{ scaleX: 0, opacity: 0.8 }}
          animate={{ scaleX: 1, opacity: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        />
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
