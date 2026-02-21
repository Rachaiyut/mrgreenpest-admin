import React, { useMemo } from 'react';

const Leaf: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className,
  style,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12,2 C6,8 3,14 12,22 C21,14 18,8 12,2 Z" />
  </svg>
);

// Deterministic random number generator to ensure consistent rendering between server and client
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const generateLeaves = (count: number) => {
  return Array.from({ length: count }).map((_, i) => {
    // Use index as seed for consistent generation
    const r1 = seededRandom(i * 7 + 1); // Position X
    const r2 = seededRandom(i * 7 + 2); // Position Y
    const r3 = seededRandom(i * 7 + 3); // Rotation
    const r4 = seededRandom(i * 7 + 4); // Size
    const r5 = seededRandom(i * 7 + 5); // Opacity

    // Available tailwind sizes that are safe to use
    const sizes = [
      'w-6 h-6',
      'w-8 h-8',
      'w-10 h-10',
      'w-12 h-12',
      'w-14 h-14',
      'w-16 h-16',
      'w-20 h-20',
      'w-24 h-24',
    ];

    return {
      top: `${r2 * 100}%`,
      left: `${r1 * 100}%`,
      rotate: `${r3 * 360}deg`,
      size: sizes[Math.floor(r4 * sizes.length)],
      opacity: 0.12 + r5 * 0.18, // Opacity range: 0.12 to 0.30
    };
  });
};

export const LeafBackground: React.FC<{
  className?: string;
  color?: string;
}> = ({ className = '', color = 'text-green-500' }) => {
  // Generate 80 leaves for a very dense pattern
  const leaves = useMemo(() => generateLeaves(80), []);

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      {leaves.map((leaf, index) => (
        <div
          key={index}
          className={`absolute ${color} ${leaf.size}`}
          style={{
            top: leaf.top,
            left: leaf.left,
            transform: `rotate(${leaf.rotate})`,
            opacity: leaf.opacity,
          }}
        >
          <Leaf className="w-full h-full" />
        </div>
      ))}
    </div>
  );
};
