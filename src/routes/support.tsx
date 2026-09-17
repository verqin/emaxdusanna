import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, MessageCircle, ShieldAlert, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/support")({
  head: () => pageHead({ title: "Support & Payment Issues | Edusanna", description: "Contact Edusanna support about payment issues, disputes, account access, or credential assistance.", path: "/support" }),
  component: SupportPage,
});

function SupportPage() {
  const [topic, setTopic] = useState("Payment support");
  const [message, setMessage] = useState("");

  const submitSupport = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = encodeURIComponent(topic);
    const body = encodeURIComponent(message.trim() || "Please describe how Edusanna can help.");
    window.location.href = `mailto:edusannaonlinelearning@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-blue-50/30">
      <SiteNavbar />
      <main className="px-4 pb-20 pt-32 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-black hover:text-blue-700">
            <ArrowLeft aria-hidden="true" /> Back to Edusanna
          </Link>
          <section className="rounded-3xl border border-blue-100 bg-white p-8 shadow-xl sm:p-12">
            <div className="mb-8 flex size-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <ShieldAlert aria-hidden="true" />
            </div>
            <h1 className="text-4xl font-black text-blue-950">Payment &amp; learner support</h1>
            <p className="mt-4 text-lg leading-relaxed text-blue-800">We are here to help with payment disputes, duplicate charges, account access, credential submissions, and other learner concerns.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <a href="mailto:edusannaonlinelearning@gmail.com?subject=Payment%20support" className="block">
                <Button className="w-full bg-blue-700 text-white hover:bg-blue-800"><Mail data-icon="inline-start" /> Email payment support</Button>
              </a>
              <a href="mailto:edusannaonlinelearning@gmail.com?subject=Learner%20support" className="block">
                <Button variant="outline" className="w-full"><MessageCircle data-icon="inline-start" /> Contact learner support</Button>
              </a>
            </div>
            <form onSubmit={submitSupport} className="mt-8 space-y-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-5" aria-labelledby="support-form-title">
              <div>
                <h2 id="support-form-title" className="font-bold text-blue-950">Send a support request</h2>
                <p className="mt-1 text-sm text-blue-700">Complete the form and your email app will open with the request ready to send.</p>
              </div>
              <label className="block text-sm font-semibold text-blue-900" htmlFor="support-topic">Topic</label>
              <select id="support-topic" value={topic} onChange={(event) => setTopic(event.target.value)} className="min-h-11 w-full rounded-lg border border-blue-200 bg-white px-3 text-blue-950">
                <option>Payment support</option><option>Learner support</option><option>Account access</option><option>Credential support</option>
              </select>
              <label className="block text-sm font-semibold text-blue-900" htmlFor="support-message">What do you need help with?</label>
              <textarea id="support-message" value={message} onChange={(event) => setMessage(event.target.value)} required rows={4} maxLength={2000} className="w-full rounded-lg border border-blue-200 bg-white p-3 text-blue-950" placeholder="Include your account email, payment reference, course, and transaction date." />
              <Button type="submit" className="bg-blue-700 text-white hover:bg-blue-800"><Send data-icon="inline-start" /> Prepare support email</Button>
            </form>
            <p className="mt-5 text-sm leading-relaxed text-blue-700">Do not send passwords or full card details. Support email: <a className="font-semibold underline" href="mailto:edusannaonlinelearning@gmail.com">edusannaonlinelearning@gmail.com</a></p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
