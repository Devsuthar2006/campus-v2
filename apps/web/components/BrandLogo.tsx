import React from 'react';
import Image from 'next/image';

interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className = 'h-8 w-8' }: BrandLogoProps) {
  return (
    <div className={`${className} relative overflow-hidden flex items-center justify-center`}>
      <Image src="/logo.png" alt="AnonymousU Logo" fill className="object-contain" priority />
    </div>
  );
}
