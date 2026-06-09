import Image from "next/image";
import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="relative bg-[#1A1A2E] text-white overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-32 right-1/4 h-[420px] w-[420px] rounded-full opacity-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(212,255,26,0.5) 0%, rgba(233,30,150,0.15) 50%, transparent 75%)",
          filter: "blur(60px)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        {/* Big closing word-mark */}
        <div className="pb-12 border-b border-white/10 mb-14">
          <div className="font-mono text-[10px] text-[#D4FF1A] tracking-[0.3em] mb-6 font-bold">
            12 / READY?
          </div>
          <h3 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-[0.95] tracking-tight">
            Let&apos;s build
            <br />
            <span className="text-[#D4FF1A] italic">something real.</span>
          </h3>
          <a
            href="#trial"
            className="mt-10 inline-flex items-center gap-3 rounded-full bg-[#D4FF1A] pl-7 pr-2 py-2 text-sm font-bold text-[#1A1A2E] uppercase tracking-widest transition-all hover:bg-white"
          >
            Book Free Trial
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1A1A2E] text-white">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white">
                <Image src="/advaspire-logo.png" alt="Advaspire" width={32} height={32} className="h-8 w-8" />
              </span>
              <div>
                <div className="font-bold text-lg tracking-tight">Advaspire</div>
                <div className="text-xs text-white/60">Robotics &amp; Coding Academy</div>
              </div>
            </div>
            <p className="mt-5 text-sm text-white/70 max-w-md leading-relaxed">
              Project-based robotics and coding classes for kids aged 7–18.
              Semenyih · Kepong, Malaysia.
            </p>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#D4FF1A] mb-4">
              Learn
            </div>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#tracks" className="text-white/75 hover:text-white">Courses</a></li>
              <li><a href="#ages" className="text-white/75 hover:text-white">Age Tiers</a></li>
              <li><a href="#pricing" className="text-white/75 hover:text-white">Pricing</a></li>
              <li><a href="#trial" className="text-white/75 hover:text-white">Free Trial</a></li>
            </ul>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#D4FF1A] mb-4">
              Contact
            </div>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="tel:+60173180089" className="text-white/75 hover:text-white">
                  +60 17-318 0089
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/60173180089"
                  target="_blank"
                  rel="noopener"
                  className="text-white/75 hover:text-white"
                >
                  WhatsApp
                </a>
              </li>
              <li>
                <Link href="/login" className="text-white/75 hover:text-white">
                  Parent / student login
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <div>© {new Date().getFullYear()} Advaspire Robotics Academy. All rights reserved.</div>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
