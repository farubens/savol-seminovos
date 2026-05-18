"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  index?: number;
  className?: string;
};

export function AnimatedCard({ children, index = 0, className }: Props) {
  return (
    <motion.article
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: "easeOut" }}
    >
      {children}
    </motion.article>
  );
}