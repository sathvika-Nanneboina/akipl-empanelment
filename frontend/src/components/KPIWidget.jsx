import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function KPIWidget({ title, value, icon: Icon, colorClass = "bg-primary/5 text-primary", prefix = "", suffix = "" }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // If the value is not a number, set it directly
    if (typeof value !== 'number') {
      setCount(value);
      return;
    }

    let start = 0;
    const end = value;
    if (start === end) {
      setCount(end);
      return;
    }

    const duration = 1000; // 1 second animation
    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    
    // Fallback if stepTime is too small
    const timer = setInterval(() => {
      current += Math.max(1, Math.ceil(range / 60)); // 60 frames per second approx
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  const formattedCount = typeof count === 'number' 
    ? prefix + count.toLocaleString() + suffix 
    : count;

  return (
    <motion.div
      className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-all duration-300 relative overflow-hidden"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
    >
      {/* Accent strip */}
      <div className="absolute top-0 left-0 bottom-0 w-1 bg-transparent group-hover:bg-accent transition-colors" />

      <div className="space-y-1.5 text-left">
        <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">{title}</span>
        <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight font-outfit">
          {formattedCount}
        </h3>
      </div>

      <div className={`p-3 rounded-lg ${colorClass} shrink-0 transition-transform group-hover:scale-105 duration-300`}>
        <Icon className="w-6 h-6" />
      </div>
    </motion.div>
  );
}
