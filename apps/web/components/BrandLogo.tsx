import React from 'react';

interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className = 'h-8 w-8' }: BrandLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="AnonymousU Logo"
      className={`${className} object-contain`}
      width={128}
      height={128}
    />
  );
}
