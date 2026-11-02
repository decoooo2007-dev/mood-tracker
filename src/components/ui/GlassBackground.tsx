"use client";

import { motion } from "framer-motion";

interface GlassBackgroundProps {
  children: React.ReactNode;
}

export default function GlassBackground({ children }: GlassBackgroundProps) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0" 
          style={{ background: 'linear-gradient(to bottom right, var(--bg-gradient-start), var(--bg-gradient-mid), var(--bg-gradient-end))' }} 
        />
        <motion.div
          className="absolute w-[800px] h-[800px] rounded-full"
          style={{
            background: "radial-gradient(circle, var(--blob-1) 0%, transparent 70%)",
            top: "-20%",
            left: "-10%",
          }}
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, var(--blob-2) 0%, transparent 70%)",
            bottom: "-10%",
            right: "-5%",
          }}
          animate={{
            x: [0, -80, 0],
            y: [0, -60, 0],
          }}
          transition={{ duration: 25, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, var(--blob-3) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
          }}
          animate={{
            x: [-50, 50, -50],
            y: [-30, 30, -30],
          }}
          transition={{ duration: 18, repeat: Infinity }}
        />
        {/* Floating decorative circles */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-4 h-4 rounded-full bg-white/10 backdrop-blur-sm"
            style={{
              top: `${20 + i * 15}%`,
              left: `${10 + i * 20}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 pb-24">
        {children}
      </div>
    </div>
  );
}