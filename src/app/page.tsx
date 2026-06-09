import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import { MarketingTechMarquee } from "@/components/marketing/marketing-tech-marquee";
import { MarketingCourses } from "@/components/marketing/marketing-courses";
import { MarketingProjectsShowcase } from "@/components/marketing/marketing-projects-showcase";
import { MarketingGallery } from "@/components/marketing/marketing-gallery";
import { MarketingAgeTiers } from "@/components/marketing/marketing-age-tiers";
import { MarketingWhyUs } from "@/components/marketing/marketing-why-us";
import { MarketingPortfolio } from "@/components/marketing/marketing-portfolio";
import { MarketingPricing } from "@/components/marketing/marketing-pricing";
import { MarketingSocial } from "@/components/marketing/marketing-social";
import { MarketingTrialForm } from "@/components/marketing/marketing-trial-form";
import { MarketingBranches } from "@/components/marketing/marketing-branches";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { WhatsAppButton } from "@/components/marketing/whatsapp-button";
import { AIChatWidget } from "@/components/marketing/ai-chat-widget";
import { MarketingRevealController } from "@/components/marketing/use-reveal";

export default function HomePage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      name: "Advaspire Robotics Academy",
      url: "https://www.advaspire.com",
      logo: "https://www.advaspire.com/advaspire-logo.png",
      description:
        "Project-based robotics and coding classes for kids aged 7-18. Tracks include Robotics, Game Coding, App Coding, and Data Coding & AI.",
      sameAs: ["https://www.advaspire.com"],
      telephone: "+60173180089",
      address: { "@type": "PostalAddress", addressCountry: "MY" },
    },
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "Advaspire Robotics & Coding Academy — Semenyih",
      telephone: "+60173180089",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Semenyih",
        addressRegion: "Selangor",
        addressCountry: "MY",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "Advaspire Robotics & Coding Academy — Kepong",
      telephone: "+60173180089",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Kepong",
        addressRegion: "Kuala Lumpur",
        addressCountry: "MY",
      },
    },
  ];

  return (
    <main className="bg-[#FAF7F2] text-[#1A1A2E] selection:bg-[#D4FF1A] selection:text-[#1A1A2E]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingRevealController />
      <MarketingNav />
      <MarketingHero />
      <MarketingTechMarquee />
      <MarketingCourses />
      <MarketingProjectsShowcase />
      <MarketingGallery />
      <MarketingAgeTiers />
      <MarketingWhyUs />
      <MarketingPortfolio />
      <MarketingPricing />
      <MarketingTrialForm />
      <MarketingSocial />
      <MarketingBranches />
      <MarketingFooter />
      <WhatsAppButton />
      <AIChatWidget />
    </main>
  );
}
