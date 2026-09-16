import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { checkIsAdmin } from "@/lib/admin.functions";
const logo = { url: "/logo.webp" };
import { SmartBack } from "@/components/smart-back";

export const Route = createFileRoute("/admin-gate")({
  head: () => ({ meta: [{ title: "Admin Access | Edusanna" }, { name: "robots", content: "noindex" }] }),
  component: AdminGatePage,
});

function AdminGatePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const checkAdmin = useServerFn(checkIsAdmin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const signIn = await supabase.auth.signInWithPassword({ email, password });
      if (signIn.error) throw signIn.error;

      // Authorization is decided server-side by the admin role in the database.
      // No email, password or role identifier is ever hardcoded in the client.
      const result = await checkAdmin();
      if (!result?.isAdmin) {
        await supabase.auth.signOut();
        throw new Error("This account is authenticated but is not assigned the admin role.");
      }

      toast.success("Welcome back, admin.");
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md glass-card-light p-8">
        <SmartBack fallback="/" label="Back" />
        <div className="flex flex-col items-center mb-6">
          <img src={logo.url} alt="Edusanna logo" width={80} height={80} className="w-20 h-20 object-contain mb-2" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /> Restricted Admin Area
          </div>
        </div>

        <h1 className="text-2xl font-bold text-blue-900 text-center mb-1">Admin sign in</h1>
        <p className="text-sm text-blue-600 text-center mb-6">Enter your admin credentials to access the dashboard.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Admin email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
          </div>
          <Button type="submit" disabled={submitting} className="premium-button w-full py-3">
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
