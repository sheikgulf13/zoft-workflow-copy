'use client';
import { useRef, useCallback, useMemo } from 'react';

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

interface SmudgyBackgroundProps {
  colorHex?: string;
  className?: string;
  baseOpacity?: number;
  zIndex?: number;
}

function hexToRGB(hex: string): RGBColor {
  const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return res
    ? {
        r: parseInt(res[1], 16),
        g: parseInt(res[2], 16),
        b: parseInt(res[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function isWhiteOrBlack(color: RGBColor): boolean {
  const { r, g, b } = color;
  // Check if it's white (high values close to 255)
  const isWhite = r > 240 && g > 240 && b > 240;
  // Check if it's black (low values close to 0)
  const isBlack = r < 15 && g < 15 && b < 15;
  return isWhite || isBlack;
}



function generateColorVariations(baseColor: RGBColor): RGBColor[] {
  const { r, g, b } = baseColor;
  
  // Generate darker variations for depth
  const darker1: RGBColor = {
    r: Math.max(0, r - 60),
    g: Math.max(0, g - 60),
    b: Math.max(0, b - 60)
  };

  const darker2: RGBColor = {
    r: Math.max(0, r - 40),
    g: Math.max(0, g - 40),
    b: Math.max(0, b - 40)
  };

  const darker3: RGBColor = {
    r: Math.max(0, r - 20),
    g: Math.max(0, g - 20),
    b: Math.max(0, b - 20)
  };

  // Generate lighter variations for highlights
  const lighter1: RGBColor = {
    r: Math.min(255, r + 30),
    g: Math.min(255, g + 30),
    b: Math.min(255, b + 30)
  };

  const lighter2: RGBColor = {
    r: Math.min(255, r + 15),
    g: Math.min(255, g + 15),
    b: Math.min(255, b + 15)
  };

  return [baseColor, darker1, darker2, darker3, lighter1, lighter2];
}



export default function SmudgyBackground({
  colorHex = '#ff0080',
  className = '',
  baseOpacity = 0.2,
  zIndex = 0,
}: SmudgyBackgroundProps) {
  const divRef = useRef<HTMLDivElement>(null);

  const createStaticGradient = useCallback(() => {
    const baseColor = hexToRGB(colorHex);
    
    // If the color is white or black, make it transparent
    if (isWhiteOrBlack(baseColor)) {
      return 'transparent';
    }

    const colorVariations = generateColorVariations(baseColor);
    
    // Create multiple layered gradients for depth
    const gradients = colorVariations.map((color, index) => {
      const opacity = baseOpacity * (1 - index * 0.1); // Decreasing opacity for depth
      return `radial-gradient(ellipse at ${10 + index * 3}% 50%, rgba(${color.r}, ${color.g}, ${color.b}, ${opacity}) 0%, transparent 30%)`;
    });

    // Add the main fade gradient from 30% to 60%
    const fadeGradient = `linear-gradient(90deg, 
      rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0) 0%,
      rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0) 30%, 
      rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${baseOpacity * 0.3}) 45%,
      transparent 60%,
      transparent 100%
    )`;

    return [...gradients, fadeGradient].join(', ');
  }, [colorHex, baseOpacity]);

  const backgroundStyle = useMemo(() => {
    return {
      background: createStaticGradient(),
      zIndex,
    };
  }, [createStaticGradient, zIndex]);

  return (
    <div
      ref={divRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={backgroundStyle}
    />
  );
}
