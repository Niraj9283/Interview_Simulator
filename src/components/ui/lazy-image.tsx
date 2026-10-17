"use client";

import React, { useState } from "react";
import Image, { ImageProps } from "next/image";

export interface LazyImageProps extends Omit<ImageProps, "onLoad"> {
  fallbackSrc?: string;
  aspectRatioClass?: string;
}

/**
 * LazyImage component (Feature #19, #20)
 * Automatically optimizes format to WebP / AVIF, lazy loads off-screen images,
 * and displays a smooth shimmer skeleton placeholder until loaded.
 */
export function LazyImage({
  src,
  alt,
  width,
  height,
  className = "",
  fallbackSrc = "/file.svg",
  aspectRatioClass = "aspect-video",
  priority = false,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  const finalSrc = error ? fallbackSrc : src;

  return (
    <div className={`relative overflow-hidden ${aspectRatioClass} ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 animate-skeleton rounded-inherit bg-white/5" />
      )}
      <Image
        src={finalSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setError(true);
          setIsLoaded(true);
        }}
        className={`transition-opacity duration-300 ${
          isLoaded ? "opacity-100" : "opacity-0"
        } object-cover w-full h-full`}
        {...props}
      />
    </div>
  );
}
