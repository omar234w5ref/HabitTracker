"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect } from "react";

export default function MouseGlow() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const springX = useSpring(x, { stiffness: 260, damping: 28 });
  const springY = useSpring(y, { stiffness: 260, damping: 28 });

  useEffect(() => {
    const move = (event: PointerEvent) => {
      x.set(event.clientX - 16);
      y.set(event.clientY - 16);
    };

    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [x, y]);

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[70] hidden h-8 w-8 rounded-full border border-[#5f9672] bg-[#a9d7b7]/45 mix-blend-multiply shadow-[0_0_22px_rgba(95,150,114,0.35)] md:block"
      style={{ x: springX, y: springY }}
    />
  );
}
