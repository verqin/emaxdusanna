import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { submitSchoolAdminInvitation } from "@/lib/school.functions";

export const Route = createFileRoute("/school-admin-invite/$token")({
  head: () => ({ meta: [{ title: "School administrator onboarding | Edusanna" }] }),
  component: SchoolAdminInvitePage,
});

function SchoolAdminInvitePage() {
  const { token } = Route.useParams();
  const submit = useServerFn(submitSchoolAdminInvitation);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("school_manager");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await submit({ data: { token, email, fullName, phone, role } });
      setSubmitted(true);
      toast.success("Your onboarding request is ready for approval.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit request");
    } finally {
      setBusy(false);
    }
  };

  return <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-4 py-16">
    <div className="mx-auto max-w-xl">
      <div className="mb-8 text-center"><img src="/logo.webp" alt="Edusanna" className="mx-auto h-20 w-20 object-contain" /><p className="mt-2 text-sm font-semibold tracking-[0.25em] text-blue-700">EDUSANNA</p></div>
      <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/60 sm:p-10">
        {submitted ? <div className="text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" /><h1 className="mt-5 text-3xl font-black text-blue-950">Request submitted</h1><p className="mt-3 text-blue-700">An Edusanna administrator will review your details. If approved, your school dashboard will be created automatically and you will receive sign-in instructions.</p><Link to="/auth"><Button className="premium-button mt-8">Go to sign in</Button></Link></div> : <><div className="mb-8"><div className="flex items-center gap-3"><div className="rounded-2xl bg-blue-50 p-3"><Building2 className="h-6 w-6 text-blue-700" /></div><div><h1 className="text-2xl font-black text-blue-950">School administrator onboarding</h1><p className="text-sm text-blue-600">Complete your details for a secure approval review.</p></div></div><div className="mt-5 flex gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><ShieldCheck className="h-5 w-5 shrink-0" /> This private invitation is verified by Edusanna and can only be used by the invited email.</div></div><form onSubmit={onSubmit} className="space-y-5"><div><Label htmlFor="invite-name">Full name</Label><Input id="invite-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Your full name" /></div><div><Label htmlFor="invite-email">Invited email</Label><Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@school.edu" /></div><div><Label htmlFor="invite-phone">Phone number</Label><Input id="invite-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" /></div><div><Label htmlFor="invite-role">Requested permission level</Label><select id="invite-role" value={role} onChange={(e) => setRole(e.target.value)} className="mt-2 flex h-10 w-full rounded-md border border-blue-200 bg-white px-3 text-sm text-blue-950"><option value="school_manager">School manager — roster, progress, payments, reports</option><option value="school_finance">School finance — payments and reports</option><option value="school_viewer">School viewer — read-only progress and reports</option></select></div><Button type="submit" disabled={busy} className="premium-button w-full">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit for approval</Button></form></>}
      </section>
    </div>
  </main>;
}
