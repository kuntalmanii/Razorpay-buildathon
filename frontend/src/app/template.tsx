'use client';

import React from 'react';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in-50 motion-safe:slide-in-from-bottom-[3px] motion-safe:duration-150 motion-reduce:animate-none flex-1 flex flex-col">
      {children}
    </div>
  );
}
