import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

interface HoverScaleProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  lift?: number;
  scale?: number;
}

export function HoverScale({
  children,
  lift = 2,
  scale = 1.02,
  ...rest
}: HoverScaleProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -lift, scale }}
      whileTap={reduce ? undefined : { scale: scale - 0.04 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
