import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Users, Globe, GraduationCap, Play, CheckCircle, ShieldCheck, Star, TrendingUp, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { platformBenefits, platformFeatures } from "@/lib/seo-content";
import { getCommunityStats } from "@/lib/stats.functions";
import { getSampleCertificate } from "@/lib/admin.functions";
import { CertificatePreview } from "@/components/certificate-preview";
import { PriceTag } from "@/components/price-tag";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead({
      title: "Edusanna - Free Online Learning Platform | African Education",
      description:
        "Create a free Edusanna account and study 200+ certificate and diploma courses A-Z. Learn free, track your progress, and only pay when you're ready for an official credential.",
      path: "/",
    }),
  component: Index,
});

const features = [
  { icon: <Award className="w-8 h-8" />, title: "Dual Certification System", description: "Choose Certificate or Diploma level for any course you complete." },
  { icon: <Users className="w-8 h-8" />, title: "Global Community", description: "Connect with learners from Africa and around the world." },
  { icon: <GraduationCap className="w-8 h-8" />, title: "Stackable Credentials", description: "Start with a Certificate, upgrade to a Diploma with a discount." },
  { icon: <Globe className="w-8 h-8" />, title: "Accessible Anywhere", description: "Mobile-first design for learning on any device." },
];

const stats = [
  { number: "200+", label: "Courses (A-Z)" },
  { number: "2 Levels", label: "Certificate & Diploma" },
  { number: "FREE", label: "Learning" },
  { number: "24/7", label: "Support" },
];

const testimonials = [
  {
    name: "Tariro M.",
    badge: "+57%",
    quote: "I didn’t think online learning could be this easy and flexible. I could study whenever I had a free moment, track how I was doing and go back to anything I didn’t understand. I started with very little confidence and finished with a Certificate and a completely different mindset.",
  },
  {
    name: "Bongani K.",
    badge: "Top 5%",
    quote: "I didn’t expect online learning to feel this practical. The lessons were easy to follow, I could learn at my own pace and I was building skills I could actually use. Earning my Diploma was the perfect bonus.",
  },
  {
    name: "Aisha R.",
    badge: "Distinction",
    quote: "I loved being able to see my progress as I learned. The lessons and quizzes kept me motivated and helped me know where I needed to improve. When I finally earned my distinction, I felt genuinely proud of how far I’d come.",
  },
];

function TrustRevealTestimonials({ userCount }: { userCount: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setRevealed(true);
        observer.disconnect();
      }
    }, { threshold: 0.2 });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-4xl font-bold gradient-text">What users say</h2>
          <p className="mx-auto max-w-2xl text-xl text-blue-700">Real learners. Real results. Join {userCount} people preparing right now.</p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3" style={{ perspective: "1200px" }}>
          {testimonials.map((t, index) => (
            <div
              key={t.name}
              className={`group flex flex-col rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-8 shadow-md transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl ${revealed ? "trust-card-visible" : "trust-card-hidden"}`}
              style={{ animationDelay: `${index * 180}ms`, "--trust-breathe": `${6.5 + index * 0.35}s` } as Record<string, string>}
            >
              <div className="mb-4 flex items-center justify-between trust-layer-identity" style={{ animationDelay: `${index * 180 + 120}ms` }}>
                <span className="font-bold text-blue-900 transition-colors group-hover:text-blue-700">{t.name}</span>
                <span className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white transition-colors group-hover:bg-blue-700">{t.badge}</span>
              </div>
              <span className="flex text-amber-400 trust-layer-rating" style={{ animationDelay: `${index * 180 + 260}ms` }} aria-label="Five star rating">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400" style={{ animationDelay: `${index * 180 + 300 + i * 70}ms` }} />)}
              </span>
              <p className="mt-3 leading-relaxed italic text-blue-800 trust-layer-quote" style={{ animationDelay: `${index * 180 + 420}ms` }}>&quot;{t.quote}&quot;</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`\n        .trust-card-hidden { opacity: 0; transform: translate3d(0, 45px, -20px) scale(.88) rotateX(3deg); filter: blur(6px) brightness(.92); }\n        .trust-card-visible { animation: trust-emerge 820ms cubic-bezier(.22,1,.36,1) forwards, trust-breathe var(--trust-breathe) ease-in-out 1.15s infinite; }\n        .trust-layer-identity, .trust-layer-rating, .trust-layer-quote { opacity: 0; transform: translateY(10px); animation: trust-layer 520ms cubic-bezier(.22,1,.36,1) forwards; }\n        .trust-layer-rating svg { opacity: 0; animation: trust-star 420ms ease-out forwards; }\n        @keyframes trust-emerge { to { opacity: 1; transform: translate3d(0,0,0) scale(1) rotateX(0); filter: blur(0) brightness(1); } }\n        @keyframes trust-layer { to { opacity: 1; transform: translateY(0); } }\n        @keyframes trust-star { to { opacity: 1; } }\n        @keyframes trust-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.008); } }\n        @media (prefers-reduced-motion: reduce) { .trust-card-hidden, .trust-card-visible, .trust-layer-identity, .trust-layer-rating, .trust-layer-quote, .trust-layer-rating svg { animation: none !important; opacity: 1 !important; transform: none !important; filter: none !important; } }\n      `}</style>
    </section>
  );
}

function Index() {
  const [hideUsers, setHideUsers] = useState(false);

  useEffect(() => {
    setHideUsers(sessionStorage.getItem("edusanna-hide-user-count") === "1");
  }, []);

  const { data: community } = useQuery({
    queryKey: ["community-stats"],
    queryFn: () => getCommunityStats(),
    initialData: { totalUsers: 104317 },
    staleTime: 30_000,
  });
  const userCount = hideUsers ? "International" : community.totalUsers.toLocaleString("en-US");

  const { data: sample } = useQuery({
    queryKey: ["sample-cert"],
    queryFn: () => getSampleCertificate(),
    initialData: {
      value: {
        studentName: "Tariro Moyo",
        courseName: "Data Science Fundamentals",
        level: "certificate" as const,
        date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
        certificateId: "EDU-SAMPLE-001",
      },
    },
    staleTime: 60_000,
  });

  return (
    <div className="min-h-screen relative overflow-hidden">
      <SiteNavbar />

      {/* Hero - fits within one viewport on desktop */}
      <section
        className="relative z-10 px-4 sm:px-6 lg:px-8 flex items-center"
        style={{ minHeight: "100svh", paddingTop: "clamp(5.5rem, 10vh, 7.5rem)", paddingBottom: "clamp(1rem, 3vh, 2.5rem)" }}
      >
        <div className="max-w-7xl mx-auto text-center w-full">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center rounded-full backdrop-blur-md bg-[rgba(3,169,244,0.12)] text-[#03A9F4] font-semibold shadow-sm border border-[rgba(3,169,244,0.4)]"
            style={{ padding: "clamp(0.4rem,0.9vh,0.7rem) clamp(1rem,2vw,1.5rem)", fontSize: "clamp(0.75rem,1.4vh,0.875rem)", marginBottom: "clamp(0.75rem,2vh,1.5rem)" }}
          >
            Free Learning · Certificate &amp; Diploma Programs A-Z
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-black leading-tight tracking-tight"
            style={{ fontSize: "clamp(2.25rem, 5.2vh + 1vw, 4rem)", marginBottom: "clamp(0.75rem,2vh,1.5rem)" }}
          >
            <span className="text-white">Learn Anything.</span>
            <br />
            <span className="text-[#03A9F4]">Completely Free.</span>

          </motion.h1>

          <p
            className="text-blue-800 max-w-3xl mx-auto leading-relaxed font-light"
            style={{ fontSize: "clamp(0.95rem, 1.9vh, 1.25rem)", marginBottom: "clamp(0.75rem,2vh,1.25rem)" }}
          >
            Create a free account and access all courses instantly. Learn at your own pace, track your progress and
            only pay when you're ready for an official Certificate or Diploma.
          </p>

          <div
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-3"
            style={{ marginBottom: "clamp(0.6rem,1.8vh,1.25rem)" }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-green-200 shadow-sm">
              <span className="text-xs font-bold text-blue-900">Certificate</span>
              <PriceTag level="certificate" size="sm" />
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-green-200 shadow-sm">
              <span className="text-xs font-bold text-blue-900">Diploma</span>
              <PriceTag level="diploma" size="sm" />
            </span>
          </div>

          {/* Social proof bar */}
          <div
            className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-4"
            style={{ marginBottom: "clamp(0.75rem,2vh,1.5rem)" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-blue-200 shadow-sm">
              <span className="flex text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </span>
              <span className="text-sm font-bold text-blue-900">4.9 / 5</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-blue-200 shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
              <span className="text-sm font-bold text-blue-900">{userCount}</span>
              <span className="text-sm text-blue-600">Users</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-blue-200 shadow-sm">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-bold text-blue-900">Join the race</span>
            </div>
          </div>

          <div
            className="flex flex-col sm:flex-row gap-3 justify-center items-center"
            style={{ marginBottom: "clamp(1rem,3vh,2.5rem)" }}
          >
            <Link to="/courses">
              <Button className="premium-button text-base px-7 py-3">
                <Play className="w-5 h-5 mr-2" />
                Browse All Courses
              </Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button className="premium-button-outline text-base px-7 py-3">Get Started Free</Button>
            </Link>
            <Link to="/verify">
              <Button className="premium-button text-base px-7 py-3">
                <ShieldCheck className="w-5 h-5 mr-2" />
                Verify a Certificate
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center group">
                <div
                  className="font-black gradient-text mb-1"
                  style={{ fontSize: "clamp(1.5rem, 3.2vh, 2.25rem)" }}
                >
                  {stat.number}
                </div>
                <div className="text-blue-700 font-semibold text-sm sm:text-base">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>


      <TrustRevealTestimonials userCount={userCount} />


      {/* Benefits */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold gradient-text mb-4">Edusanna Benefits for Everyone</h2>
            <p className="text-xl text-blue-700 max-w-2xl mx-auto">
              Whether you're a student, professional, teacher or entrepreneur, Edusanna empowers you to succeed.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {platformBenefits.map((category) => (
              <div key={category.title} className="bg-gradient-to-br from-white to-blue-50 rounded-2xl p-8 border border-blue-100 shadow-md hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-bold text-blue-900 mb-4">{category.title}</h3>
                <ul className="space-y-3">
                  {category.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex gap-3 items-start">
                      <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-blue-800">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold gradient-text mb-4">Why Choose EDUSANNA?</h2>
            <p className="text-xl text-blue-700 max-w-2xl mx-auto">Africa's online learning platform.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="course-card text-center border-blue-100">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-blue-900">{feature.title}</h3>
                  <p className="text-blue-700 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="benefits-portal mt-14 space-y-4 overflow-hidden" aria-label="Edusanna Benefits for Everyone">
            <BenefitMarqueeRow features={platformFeatures.slice(0, 5)} direction="left" />
            <BenefitMarqueeRow features={platformFeatures.slice(5, 10)} direction="right" />
          </div>
          <style>{`\n            .benefits-portal .benefit-marquee-row { animation: benefits-portal-in 900ms cubic-bezier(.22,1,.36,1) both; }\n            .benefits-portal .benefit-marquee-row:nth-child(2) { animation-delay: 180ms; }\n            .benefits-portal .benefit-marquee-card { transform-style: preserve-3d; }
            .benefit-portal-ring { opacity: 0; transform: scale(.86); transition: opacity 240ms ease, transform 240ms ease; }
            .benefit-portal-ring-active { opacity: 1; transform: scale(1.04); animation: benefit-portal-pulse 1.4s ease-in-out infinite; }
            .benefit-portal-spark { opacity: 0; transform: translate(0, 8px) scale(.5); }
            .benefit-marquee-card:hover .benefit-portal-spark { opacity: 1; animation: benefit-spark 900ms ease-out infinite; }
            @keyframes benefit-portal-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgb(56 189 248 / .12); } 50% { box-shadow: 0 0 0 8px rgb(56 189 248 / 0); } }
            @keyframes benefit-spark { 0% { transform: translate(0, 8px) scale(.5); } 100% { transform: translate(-16px, -12px) scale(1); opacity: 0; } }\n            @keyframes benefits-portal-in { from { opacity: 0; transform: translateY(28px) scale(.96); filter: blur(5px); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }\n            @keyframes benefit-card-glow { 0%, 100% { box-shadow: 0 1px 2px rgb(30 64 175 / .06); } 50% { box-shadow: 0 10px 24px rgb(56 189 248 / .16); } }\n            @media (prefers-reduced-motion: reduce) { .benefits-portal .benefit-marquee-row, .benefits-portal .benefit-marquee-card { animation: none !important; } }\n          `}</style>
          <div className="mt-10 flex justify-center">
            <Link to="/partnership-request" id="partnership-request">
              <Button className="premium-button text-base px-7 py-3">Partner with Us</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center hero-gradient-premium rounded-3xl p-12 shadow-2xl">
          <ShieldCheck className="w-14 h-14 text-white mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Start learning today - it's free</h2>
          <p className="text-blue-50 text-lg mb-8 max-w-2xl mx-auto">
            Join Edusanna and unlock 200+ courses. Pay only when you're ready for your official credential.
          </p>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button className="bg-white text-blue-700 hover:bg-blue-50 text-lg font-bold px-8 py-4 rounded-xl shadow-lg">
              Create your free account
            </Button>
          </Link>
        </div>
      </section>

      {/* Sample certificate */}
      {sample?.value && <SampleCertificateSection sample={sample.value} />}


      <SiteFooter />
    </div>
  );
}

function BenefitMarqueeRow({ features, direction }: { features: string[]; direction: "left" | "right" }) {
  const sequence = [...features, ...features];
  const reduceMotion = useReducedMotion();

  return (
    <div className="benefit-marquee-row overflow-visible" role="list">
      <div className={`benefit-marquee-track flex w-max gap-4 ${direction === "left" ? "benefit-marquee-left" : "benefit-marquee-right"}`}>
        {sequence.map((feature, index) => (
          <BenefitPortalCard key={`${feature}-${index}`} feature={feature} index={index} reduceMotion={Boolean(reduceMotion)} />
        ))}
      </div>
    </div>
  );
}

function BenefitPortalCard({ feature, index, reduceMotion }: { feature: string; index: number; reduceMotion: boolean }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const delay = (index % 5) * 0.12;

  return (
    <motion.div
      role="listitem"
      className="benefit-marquee-card group relative flex w-[260px] shrink-0 items-center gap-2 rounded-xl border border-blue-100 bg-white p-4 shadow-sm transition-[border-color,box-shadow] hover:border-blue-300 hover:shadow-xl"
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.72, y: 36, rotateX: 14 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, amount: 0.55 }}
      transition={{ delay, type: "spring", stiffness: 180, damping: 18, mass: 0.7 }}
      animate={reduceMotion ? undefined : { rotateX: tilt.x, rotateY: tilt.y }}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => { setActive(false); setTilt({ x: 0, y: 0 }); }}
      onPointerMove={(event) => {
        if (reduceMotion || window.matchMedia("(max-width: 767px)").matches) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        setTilt({ x: Number((-y * 8).toFixed(2)), y: Number((x * 8).toFixed(2)) });
      }}
      style={{ transformStyle: "preserve-3d", perspective: 700 }}
    >
      <span className={`benefit-portal-ring pointer-events-none absolute -inset-2 rounded-2xl border border-sky-300/50 ${active ? "benefit-portal-ring-active" : ""}`} aria-hidden="true" />
      <span className="benefit-portal-spark pointer-events-none absolute right-5 top-2 size-1 rounded-full bg-sky-400" aria-hidden="true" />
      <CheckCircle className="relative z-10 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
      <span className="relative z-10 text-sm font-medium text-blue-800">{feature}</span>
    </motion.div>
  );
}

const SAMPLE_DIPLOMA_SKILLS = [
  "Research & Analysis",
  "Strategic Thinking",
  "Project Leadership",
  "Communication",
  "Problem Solving",
];

function SampleCertificateSection({
  sample,
}: {
  sample: { studentName: string; courseName: string; level: "certificate" | "diploma"; date: string; certificateId: string };
}) {
  const [view, setView] = useState<"certificate" | "diploma">(sample.level);
  const data =
    view === "diploma"
      ? {
          ...sample,
          level: "diploma" as const,
          courseName: sample.level === "diploma" ? sample.courseName : `${sample.courseName} (Diploma)`,
          certificateId: sample.certificateId.replace(/CERT|EDU-SAMPLE/i, "DIP-SAMPLE"),
          skills: SAMPLE_DIPLOMA_SKILLS,
        }
      : { ...sample, level: "certificate" as const };

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-blue-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold gradient-text mb-3">Preview Your Future Credential</h2>
          <p className="text-lg text-blue-700 max-w-2xl mx-auto">
            Every learner who completes a course receives an official Edusanna {view} like this one.
          </p>
          <div className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-blue-700">
            <span className={view === "certificate" ? "opacity-100" : "opacity-50"}>Certificate</span>
            <span>/</span>
            <span className={view === "diploma" ? "opacity-100" : "opacity-50"}>Diploma</span>
          </div>
        </div>
        <div className="relative">
          <CertificatePreview data={data} />
          <button
            type="button"
            aria-label="Previous sample"
            onClick={() => setView(view === "certificate" ? "diploma" : "certificate")}
            className="absolute left-2 sm:-left-5 top-1/2 -translate-y-1/2 z-10 h-11 w-11 rounded-full bg-white/90 hover:bg-white shadow-lg border border-blue-200 flex items-center justify-center text-blue-700 transition"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Next sample"
            onClick={() => setView(view === "certificate" ? "diploma" : "certificate")}
            className="absolute right-2 sm:-right-5 top-1/2 -translate-y-1/2 z-10 h-11 w-11 rounded-full bg-white/90 hover:bg-white shadow-lg border border-blue-200 flex items-center justify-center text-blue-700 transition"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </div>
    </section>
  );
}
