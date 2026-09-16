import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Globe2, Handshake, HeartHandshake, Lightbulb, Target, Users } from "lucide-react";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/about")({
  head: () => pageHead({
    path: "/about",
    title: "About Edusanna | Practical Online Learning & Professional Credentials",
    description: "Discover Edusanna's mission to make practical online education, professional credentials, and trusted learning support accessible to students and professionals worldwide.",
  }),
  component: AboutPage,
});

const principles = [
  { icon: Target, title: "Purposeful learning", text: "Every course is designed to help learners build useful knowledge, confidence, and momentum." },
  { icon: Users, title: "Learners first", text: "Flexible pacing, clear lessons, and practical progress tools keep learning personal and achievable." },
  { icon: Globe2, title: "Global access", text: "We connect learners across Africa and beyond with education that respects different goals and starting points." },
  { icon: HeartHandshake, title: "Trust and support", text: "We communicate clearly, protect learner information, and make support easy to find when it matters." },
];

function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-blue-950">
      <SiteNavbar />
      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-sky-700 px-4 pb-24 pt-36 text-white sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute -right-24 top-20 size-80 rounded-full bg-sky-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 bottom-0 size-72 rounded-full bg-blue-300/15 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-sky-100 backdrop-blur"><Globe2 className="size-4" /> About Edusanna</span>
              <h1 className="mt-7 max-w-4xl text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">Education that moves people forward.</h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-blue-100 sm:text-xl">Edusanna gives learners flexible, affordable access to practical online education designed for real-world progress.</p>
              <div className="mt-9 flex flex-wrap gap-4"><Link to="/courses" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-purple-700 transition hover:bg-sky-50">Explore learning <ArrowRight className="size-4" /></Link><Link to="/partnership-request" className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3 font-bold text-white transition hover:bg-white/10">Partner with us <Handshake className="size-4" /></Link></div>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur"><div className="flex items-center gap-3 text-sky-200"><Lightbulb className="size-6" /><span className="font-semibold">Our north star</span></div><p className="mt-6 text-2xl font-bold leading-relaxed">Learn practical skills. Build professional credentials. Move forward with confidence.</p><div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/15 pt-6"><div><p className="text-3xl font-black">A–Z</p><p className="mt-1 text-sm text-blue-100">learning pathways</p></div><div><p className="text-3xl font-black">Global</p><p className="mt-1 text-sm text-blue-100">learner community</p></div></div></div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center"><div><p className="text-sm font-bold uppercase tracking-[0.22em] text-sky-600">Why we exist</p><h2 className="mt-4 text-4xl font-black tracking-tight text-purple-700 sm:text-5xl">Learning should feel possible.</h2></div><div className="flex flex-col gap-5 text-lg leading-8 text-blue-800"><p>Too many people have the ambition to grow but not the time, access, or support to take the next step. Edusanna is built to make that step clearer and more achievable.</p><p>We bring together practical courses, flexible study, progress visibility, and professional credentials in one welcoming learning environment.</p></div></div></section>

        <section className="bg-blue-50/70 px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[0.22em] text-sky-600">What guides us</p><h2 className="mt-4 text-4xl font-black tracking-tight text-blue-950 sm:text-5xl">Built around progress, not pressure.</h2></div><div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{principles.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><span className="inline-flex size-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><Icon className="size-5" /></span><h3 className="mt-5 text-lg font-bold text-blue-950">{title}</h3><p className="mt-3 text-sm leading-6 text-blue-700">{text}</p></article>)}</div></div></section>

        <section className="px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 rounded-3xl bg-gradient-to-r from-sky-600 to-blue-900 p-8 text-white shadow-xl sm:p-12 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-sm font-bold uppercase tracking-[0.22em] text-sky-100">A shared future</p><h2 className="mt-4 text-3xl font-black sm:text-4xl">When learners grow, communities grow with them.</h2><p className="mt-4 max-w-2xl leading-7 text-blue-100">Edusanna welcomes learners, educators, institutions, and partners who believe education can unlock practical opportunity at every stage of life.</p></div><Link to="/auth" search={{ mode: "signup" }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-white transition hover:bg-sky-50">Start learning <ArrowRight className="size-4" /></Link></div></section>

        <section className="px-4 pb-24 sm:px-6 lg:px-8"><div className="mx-auto max-w-4xl rounded-3xl border border-blue-100 bg-white p-8 text-center shadow-sm sm:p-12"><CheckCircle2 className="mx-auto size-10 text-sky-600" /><h2 className="mt-5 text-3xl font-black text-sky-200">Your next step starts here.</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-blue-700">Whether you are building a new skill, pursuing a credential, or opening doors for others, Edusanna is here to help you move forward.</p><Link to="/courses" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-950 px-6 py-3 font-bold text-white transition hover:bg-blue-900">Browse courses <ArrowRight className="size-4" /></Link></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
