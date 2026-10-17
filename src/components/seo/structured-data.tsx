import React from "react";
import { FAQS } from "@/lib/faq-data";

export function StructuredData() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mockmate.ai";

  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "MockMate AI",
    alternateName: "MockMate Interview Simulator",
    url: baseUrl,
    applicationCategory: "EducationalApplication, BusinessApplication",
    operatingSystem: "All (Web Browser, Chrome, Firefox, Safari, Edge)",
    browserRequirements: "Requires modern WebAudio, WebRTC, and WebAssembly support",
    description:
      "Autonomous real-time AI interview simulator with speech cadence analysis, system design diagramming canvas, live coding sandbox, eye contact tracking, and resume-aware question generation.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "1280",
      bestRating: "5",
      worstRating: "1",
    },
    featureList: [
      "Real-time speech analytics and WPM cadence metrics",
      "Interactive distributed system design whiteboard canvas",
      "In-browser multi-language coding sandbox",
      "Local edge AI processing via WebAssembly",
      "Behavioral STAR rubric automated grading",
      "Eye-contact and candidate integrity tracking",
    ],
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MockMate AI",
    url: baseUrl,
    logo: `${baseUrl}/icon.svg`,
    sameAs: [
      "https://github.com",
      "https://twitter.com",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Support",
      url: `${baseUrl}/#contact`,
      email: "support@mockmate.ai",
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
