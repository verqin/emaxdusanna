import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen, GraduationCap, Trophy, ArrowRight, Settings } from "lucide-react";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getCatalogItem, getCourseModules, type CourseLevel } from "@/lib/courses";
import { getCourseIcon } from "@/lib/course-icons";
import { getCourseImage } from "@/lib/course-images";
import { CertificatePreview } from "@/components/certificate-preview";
import { PriceTag } from "@/components/price-tag";
import { PaymentReceiptDialog, type PaymentReceipt } from "@/components/payment-receipt";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "My Dashboard | Edusanna" }] }),
  component: Dashboard,
});

interface EnrollmentRow {
  id: string;
  course_id: string;
  level: CourseLevel;
  course_title: string | null;
}
interface ProgressRow {
  course_id: string;
  level: CourseLevel;
  completed_modules: number[];
  is_completed: boolean;
}

function Dashboard() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, signup_type, school_name").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: schoolStatus } = useQuery({
    queryKey: ["school-contracted", profile?.school_name],
    enabled: profile?.signup_type === "academia" && !!profile?.school_name,
    queryFn: async () => {
      const { data } = await supabase.rpc("is_school_contracted", { _name: profile!.school_name! });
      return { contracted: Boolean(data) };
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [enr, prog] = await Promise.all([
        supabase.from("enrollments").select("id,course_id,level,course_title").eq("user_id", user!.id).order("created_at", { ascending: false }),
        supabase.from("course_progress").select("course_id,level,completed_modules,is_completed").eq("user_id", user!.id),
      ]);
      return {
        enrollments: (enr.data ?? []) as EnrollmentRow[],
        progress: (prog.data ?? []) as ProgressRow[],
      };
    },
  });

  const enrollments = data?.enrollments ?? [];
  const progress = data?.progress ?? [];
  const completedCount = progress.filter((p) => p.is_completed).length;

  const { data: receipts } = useQuery({
    queryKey: ["academia-receipts", user?.id],
    enabled: !!user && profile?.signup_type === "academia",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificate_payments")
        .select("id, student_name, email, course_name, certificate_type, amount, certificate_id, school_name, class_name, created_at, payment_status")
        .eq("user_id", user!.id)
        .in("payment_status", ["noted", "certificate_sent"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<Record<string, unknown>>;
    },
  });
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);

  const metaName = (user?.user_metadata as { full_name?: string } | undefined)?.full_name;
  const fullName = profile?.full_name || metaName || user?.email?.split("@")[0] || "learner";
  const firstName = fullName.split(" ")[0];

  return (
    <div className="min-h-screen">
      <SiteNavbar />
      <section className="pt-32 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 mb-8 sm:flex sm:justify-between sm:items-center">
            <div className="min-w-0">
              <h1 className="text-3xl md:text-4xl font-black text-blue-900 mb-1 truncate">Welcome back, {firstName}</h1>
              <p className="text-blue-600">Continue where you left off.</p>
            </div>
            <Link to="/settings" className="shrink-0">
              <Button variant="outline" className="min-h-11 border-blue-200 text-blue-700">
                <Settings className="w-4 h-4 mr-2" aria-hidden="true" /> Settings
              </Button>
            </Link>
          </div>

          {profile?.signup_type === "academia" && (
            <div className="mb-8 space-y-3">
              {schoolStatus && !schoolStatus.contracted ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 font-semibold">
                  Your School has not been contracted, so Admin will reach you via formal Email or WhatsApp after you complete your course and you can pay via any suggested possible means in relation to your country payment methods.
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-purple-300 bg-purple-50 p-4 text-purple-900 font-semibold">
                    ACADEMIA Users Are To Pay At School Reception/Administration
                  </div>
                  <div className="rounded-xl border border-sky-300 bg-sky-50 p-4 text-sky-900 font-semibold">
                    You Shall Receive Both Soft &amp; Hard Copies With No Additional Costs
                  </div>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <StatCard icon={<BookOpen className="w-6 h-6" />} label="Enrolled courses" value={enrollments.length} />
            <StatCard icon={<Trophy className="w-6 h-6" />} label="Completed" value={completedCount} />
            <StatCard icon={<GraduationCap className="w-6 h-6" />} label="In progress" value={Math.max(enrollments.length - completedCount, 0)} />
          </div>

          <h2 className="text-xl font-bold text-blue-900 mb-4">My courses</h2>
          {isLoading ? (
            <p className="text-blue-500 py-8">Loading…</p>
          ) : enrollments.length === 0 ? (
            <div className="glass-card-light p-10 text-center">
              <p className="text-blue-700 mb-4">You haven't enrolled in any courses yet.</p>
              <Link to="/courses"><Button className="premium-button">Browse courses</Button></Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {enrollments.map((enr) => {
                const item = getCatalogItem(enr.course_id);
                if (!item) return null;
                const Icon = getCourseIcon(item.icon);
                const image = getCourseImage(item);
                const total = getCourseModules(enr.course_id, enr.level).length;
                const prog = progress.find((p) => p.course_id === enr.course_id && p.level === enr.level);
                const done = prog?.completed_modules.length ?? 0;
                const pct = total ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={enr.id} className="glass-card-light p-6">
                    <div className="flex items-center gap-4 mb-4">
                      {image ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-blue-50">
                          <img src={image} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-bold text-blue-900 truncate">{enr.course_title ?? item.certificateTitle}</h3>
                        <span className="text-xs font-semibold text-purple-600 capitalize">{enr.level}</span>
                      </div>
                    </div>
                    <Progress value={pct} className="h-2 mb-2" />
                    <p className="text-xs text-blue-500 mb-4">{done}/{total} modules · {pct}%</p>
                    <div className="flex gap-2">
                      <Link to="/learn/$courseId/$level" params={{ courseId: enr.course_id, level: enr.level }} className="flex-1">
                        <Button className="premium-button w-full">
                          {prog?.is_completed ? "Review" : "Continue"} <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                      </Link>
                      {prog?.is_completed && profile?.signup_type !== "academia" && (
                        <Link
                          to="/certificate-payment"
                          search={{ courseId: enr.course_id, level: enr.level }}
                          className="flex-shrink-0"
                        >
                          <Button variant="outline" className="border-green-500 text-green-700 hover:bg-green-50">
                            Pay for credential
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {profile?.signup_type === "academia" && (
            <section className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-emerald-950">My approved payment receipts</h2>
                  <p className="mt-1 text-sm text-emerald-800">Receipts appear here after your school administrator approves payment.</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-emerald-700">{receipts?.length ?? 0} approved</span>
              </div>
              {(receipts?.length ?? 0) > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {receipts!.map((row) => (
                    <button
                      type="button"
                      key={String(row.id)}
                      onClick={() => setSelectedReceipt({
                        receiptNo: `RC-${String(row.certificate_id ?? row.id).replace(/^EDU-SCH-/, "")}`,
                        issuedAt: String(row.created_at), schoolName: String(row.school_name ?? profile.school_name ?? ""),
                        className: row.class_name ? String(row.class_name) : null, studentName: String(row.student_name ?? fullName),
                        email: row.email ? String(row.email) : user?.email, courseName: String(row.course_name ?? "Credential"),
                        level: row.certificate_type === "diploma" ? "diploma" : "certificate", amount: Number(row.amount ?? 0),
                        certificateId: String(row.certificate_id ?? "-"), method: "Paid at school",
                      })}
                      className="rounded-xl border border-emerald-200 bg-white p-4 text-left transition hover:border-emerald-400 hover:shadow-sm"
                    >
                      <div className="font-bold text-blue-900">{String(row.course_name ?? "Credential")}</div>
                      <div className="mt-1 text-sm capitalize text-blue-600">{String(row.certificate_type)} · ${Number(row.amount ?? 0).toFixed(2)}</div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-emerald-700">Approved by school</span>
                        <span className="text-emerald-600">View and download</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : <p className="mt-4 text-sm text-emerald-800">No approved receipts yet.</p>}
            </section>
          )}
          <PaymentReceiptDialog receipt={selectedReceipt} open={!!selectedReceipt} onOpenChange={(open) => !open && setSelectedReceipt(null)} />

          <SampleCredentialsMotivation firstName={firstName} />
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="glass-card-light p-6 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 text-blue-600 flex items-center justify-center">{icon}</div>
      <div>
        <div className="text-2xl font-black text-blue-900">{value}</div>
        <div className="text-sm text-blue-600">{label}</div>
      </div>
    </div>
  );
}

function SampleCredentialsMotivation({ firstName }: { firstName: string }) {
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const sampleCert = {
    studentName: firstName,
    courseName: "Your Completed Course",
    level: "certificate" as const,
    date: today,
    certificateId: "EDU-SAMPLE-001",
  };
  const sampleDip = { ...sampleCert, level: "diploma" as const, certificateId: "EDU-SAMPLE-002" };
  return (
    <section className="mt-16">
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-black text-blue-900 mb-2">This could be yours</h2>
        <p className="text-blue-600 max-w-2xl mx-auto">
          Complete any course and earn a credential with your name on it. Choose Certificate or Diploma when you're ready.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
          <PriceTag level="certificate" size="md" showLabel />
          <PriceTag level="diploma" size="md" showLabel />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <p className="text-sm font-bold text-blue-700 mb-2">Sample Certificate</p>
          <CertificatePreview data={sampleCert} />
        </div>
        <div>
          <p className="text-sm font-bold text-purple-700 mb-2">Sample Diploma</p>
          <CertificatePreview data={sampleDip} />
        </div>
      </div>
    </section>
  );
}
