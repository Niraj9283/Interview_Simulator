"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  name: string;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  // Generate JSON-LD BreadcrumbList
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://mockmate.ai",
      },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: item.name,
        ...(item.href ? { item: `https://mockmate.ai${item.href}` } : {}),
      })),
    ],
  };

  return (
    <>
      {/* Schema.org BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Visual Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className={`flex items-center text-xs text-[#888888] ${className}`}
      >
        <ol className="flex flex-wrap items-center gap-1.5">
          <li className="flex items-center">
            <Link
              href="/"
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-muted transition hover:bg-white/5 hover:text-ink"
            >
              <Home size={13} className="text-moss" />
              <span className="sr-only">Home</span>
            </Link>
          </li>

          {items.map((item, idx) => {
            const isLast = idx === items.length - 1 || item.current;
            return (
              <li key={idx} className="flex items-center gap-1.5">
                <ChevronRight size={12} className="text-[#444444] shrink-0" />
                {isLast || !item.href ? (
                  <span
                    aria-current="page"
                    className="rounded px-1.5 py-0.5 font-medium text-ink"
                  >
                    {item.name}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="rounded px-1.5 py-0.5 text-muted transition hover:bg-white/5 hover:text-ink"
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
