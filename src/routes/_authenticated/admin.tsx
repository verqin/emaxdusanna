import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { downloadCertificatePdf } from "@/lib/cert-pdf";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, CreditCard, Award, DollarSign, Clock, ShieldAlert, Loader2, School, FileEdit, Trash2,
  Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Copy,
} from "lucide-react";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  checkIsAdmin, getAdminStats, listPayments, listUsers, updatePaymentStatus,
  createManualPayment, getLearnerCourses,
  listContractedSchools, addContractedSchool, removeContractedSchool,
  listPartnershipProgramRequests, updatePartnershipProgramRequestStatus,
  getSampleCertificate, saveSampleCertificate,
  type SampleCertificateValue,
} from "@/lib/admin.functions";
import { createSchoolAdmin, listSchoolAdmins, deleteSchoolAdmin, createSchoolAdminInvitation, listSchoolAdminInvitations, approveSchoolAdminInvitation, setSchoolOnboardingAccess, listSchoolPaymentReconciliation } from "@/lib/school.functions";
import { listAltPaymentRequests, markAltPaymentReceived } from "@/lib/alt-payment.functions";
import { listEnrollmentCertificateIds } from "@/lib/tracking.functions";
import { getBackendHealth, type HealthState } from "@/lib/health.functions";
import { CertificatePreview, type CertificateData } from "@/components/certificate-preview";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpecialProgramTab } from "@/components/admin/special-program-tab";
import { HiddenCoursesTab } from "@/components/admin/hidden-courses-tab";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard | Edusanna" }] }),
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  component: AdminPage,
});

const STATUS_OPTIONS = [
  { value: "paid_pending_admin", label: "Pending" },
  { value: "noted", label: "Noted" },
  { value: "certificate_sent", label: "Sent" },
] as const;

function statusBadge(status: string) {
  const map: Record<string, string> = {
    paid_pending_admin: "bg-amber-100 text-amber-700",
    noted: "bg-blue-100 text-blue-700",
    certificate_sent: "bg-green-100 text-green-700",
  };
  const label = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
  return <Badge className={`${map[status] ?? "bg-gray-100 text-gray-700"} border-0`}>{label}</Badge>;
}

function AdminPage() {
  const checkAdmin = useServerFn(checkIsAdmin);
  const { data: adminCheck, isLoading: checking } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => checkAdmin(),
  });

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!adminCheck?.isAdmin) {
    return (
      <div className="min-h-screen">
        <SiteNavbar />
        <section className="pt-40 pb-20 px-4 text-center max-w-md mx-auto">
          <ShieldAlert className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-blue-900 mb-2">Access denied</h1>
          <p className="text-blue-600 mb-6">You do not have permission to view the admin dashboard.</p>
          <Link to="/dashboard"><Button className="premium-button">Back to dashboard</Button></Link>
        </section>
        <SiteFooter />
      </div>
    );
  }

  return <AdminContent />;
}

function AdminContent() {
  const navigate = useNavigate();
  const fetchStats = useServerFn(getAdminStats);
  const { data: stats } = useQuery({ queryKey: ["admin-stats"], queryFn: () => fetchStats() });
  const { tab } = Route.useSearch();
  const validTabs = [
    "userManagement", "certificates", "schools", "schoolAdmins", "sample", "health",
    "specialProgram", "hiddenCourses", "partnershipReception",
  ];
  const initialTab = tab && validTabs.includes(tab) ? tab : "userManagement";

  return (
    <div className="min-h-screen">
      <SiteNavbar />
      <section className="pt-32 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-black text-blue-900 mb-1">Admin Dashboard</h1>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4"><p className="text-blue-600">Manage payments, learners and credentials.</p><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => { sessionStorage.removeItem("edusanna-hide-user-count"); void navigate({ to: "/" }); }}>Review 104,317 users</Button><Button variant="outline" size="sm" onClick={() => { sessionStorage.setItem("edusanna-hide-user-count", "1"); void navigate({ to: "/" }); }}>Hide homepage count</Button></div></div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
            <StatCard icon={<Users className="w-5 h-5" />} label="Users" value={stats?.totalUsers ?? "…"} />
            <StatCard icon={<CreditCard className="w-5 h-5" />} label="Payments" value={stats?.totalPayments ?? "…"} />
            <StatCard icon={<DollarSign className="w-5 h-5" />} label="Revenue" value={stats ? `$${stats.totalRevenue.toFixed(2)}` : "…"} />
            <StatCard icon={<Clock className="w-5 h-5" />} label="Pending" value={stats?.pending ?? "…"} />
            <StatCard icon={<Award className="w-5 h-5" />} label="Sent" value={stats?.certificatesSent ?? "…"} />
          </div>

          <Tabs defaultValue={initialTab}>
            <TabsList className="mb-6 flex-wrap h-auto">
              <TabsTrigger value="userManagement">User Management</TabsTrigger>
              <TabsTrigger value="contractedSchools">Contracted Schools</TabsTrigger>
              <TabsTrigger value="certificates">Certificates</TabsTrigger>
              <TabsTrigger value="programsContent">Programs &amp; Content</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
            </TabsList>
            <TabsContent value="userManagement"><UserManagementTab /></TabsContent>
            <TabsContent value="contractedSchools"><ContractedSchoolsTab /></TabsContent>
            <TabsContent value="certificates"><CertificatesTab /></TabsContent>
            <TabsContent value="programsContent"><ProgramsContentTab /></TabsContent>
            <TabsContent value="operations"><OperationsTab /></TabsContent>
          </Tabs>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function UserManagementTab() {
  return <div className="flex flex-col gap-10"><section><h2 className="text-xl font-bold text-blue-950 mb-4">Payments</h2><PaymentsTab /></section><section><h2 className="text-xl font-bold text-blue-950 mb-4">Alternative payments</h2><AltPaymentsTab /></section><section><h2 className="text-xl font-bold text-blue-950 mb-4">Users</h2><UsersTab /></section><section><h2 className="text-xl font-bold text-blue-950 mb-4">Credential IDs</h2><CredentialIdsTab /></section></div>;
}

function SchoolReconciliationTab() {
  const fetchReport = useServerFn(listSchoolPaymentReconciliation);
  const { data = [], isLoading } = useQuery({ queryKey: ["school-reconciliation"], queryFn: () => fetchReport() });
  return <div className="glass-card-light overflow-x-auto p-4"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-bold text-blue-950">Payment reconciliation</h3><p className="text-sm text-blue-700">Gross, reconciled, and pending school payments.</p></div><Badge variant="outline">{data.length} schools</Badge></div><Table><TableHeader><TableRow><TableHead>School</TableHead><TableHead>Payments</TableHead><TableHead>Gross</TableHead><TableHead>Reconciled</TableHead><TableHead>Pending</TableHead></TableRow></TableHeader><TableBody>{isLoading ? <TableRow><TableCell colSpan={5}>Loading report…</TableCell></TableRow> : data.map((row: any) => <TableRow key={row.school_id}><TableCell className="font-medium">{row.school_name}</TableCell><TableCell>{row.payment_count}</TableCell><TableCell>${Number(row.gross_amount ?? 0).toFixed(2)}</TableCell><TableCell className="text-emerald-700">${Number(row.reconciled_amount ?? 0).toFixed(2)}</TableCell><TableCell className="text-amber-700">${Number(row.pending_amount ?? 0).toFixed(2)}</TableCell></TableRow>)}</TableBody></Table></div>;
}

function ContractedSchoolsTab() {
  return <div className="flex flex-col gap-10"><section><h2 className="text-xl font-bold text-blue-950 mb-4">Schools and school payments</h2><SchoolsTab /></section><section><SchoolReconciliationTab /></section><section><h2 className="text-xl font-bold text-blue-950 mb-4">Private school administrator onboarding</h2><SchoolAdminInvitationTab /></section></div>;
}

function ProgramsContentTab() {
  return <div className="flex flex-col gap-10"><section><h2 className="text-xl font-bold text-blue-950 mb-4">Special programs</h2><SpecialProgramTab /></section><section><h2 className="text-xl font-bold text-blue-950 mb-4">Hidden courses</h2><HiddenCoursesTab /></section><section><h2 className="text-xl font-bold text-blue-950 mb-4">Sample certificates</h2><SampleCertificateTab /></section></div>;
}

function OperationsTab() {
  return <div className="flex flex-col gap-10"><section><h2 className="text-xl font-bold text-blue-950 mb-4">Partnerships</h2><PartnershipReceptionTab /></section><section><h2 className="text-xl font-bold text-blue-950 mb-4">Health monitor</h2><HealthTab /></section><section className="glass-card-light p-6"><h2 className="text-xl font-bold text-blue-950">Audit logs</h2><p className="mt-2 text-sm text-blue-700">Review operational actions with actor, timestamp, resource and outcome when audit logging is enabled.</p></section></div>;
}

function PartnershipReceptionTab() {
  const fetchRequests = useServerFn(listPartnershipProgramRequests);
  const updateStatus = useServerFn(updatePartnershipProgramRequestStatus);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["partnership-requests"], queryFn: () => fetchRequests() });
  const mutation = useMutation({ mutationFn: (input: { id: string; status: string }) => updateStatus({ data: input }), onSuccess: () => { toast.success("Request status updated"); qc.invalidateQueries({ queryKey: ["partnership-requests"] }); }, onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed") });
  if (isLoading) return <p className="text-blue-500 py-8">Loading partnership requests...</p>;
  const requests = data?.requests ?? [];
  return <div className="glass-card-light p-2 sm:p-4 overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Partner</TableHead><TableHead>Organization</TableHead><TableHead>Programme</TableHead><TableHead>Audience</TableHead><TableHead>Submitted</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{requests.map((request: any) => <TableRow key={request.id}><TableCell><div className="font-medium text-blue-950">{request.partner_name}</div><div className="text-xs text-blue-500">{request.email}</div></TableCell><TableCell>{request.organization_name}<div className="text-xs text-blue-500">{request.organization_type}</div></TableCell><TableCell className="min-w-[220px]"><div className="font-medium">{request.program_title}</div><p className="text-xs text-blue-600 line-clamp-2">{request.program_description}</p></TableCell><TableCell>{request.audience}</TableCell><TableCell className="text-xs text-blue-500">{new Date(request.created_at).toLocaleDateString()}</TableCell><TableCell><Select value={request.status} onValueChange={(status) => mutation.mutate({ id: request.id, status })}><SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger><SelectContent>{["new", "reviewing", "contacted", "approved", "declined"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></TableCell></TableRow>)}</TableBody></Table>{requests.length === 0 && <p className="p-8 text-center text-blue-600">No partnership requests yet.</p>}</div>;
}

function PaymentsTab() {
  const qc = useQueryClient();
  const fetchPayments = useServerFn(listPayments);
  const updateStatus = useServerFn(updatePaymentStatus);
  const { data, isLoading } = useQuery({ queryKey: ["admin-payments"], queryFn: () => fetchPayments() });

  const mutation = useMutation({
    mutationFn: (vars: { id: string; status: "paid_pending_admin" | "noted" | "certificate_sent" }) =>
      updateStatus({ data: vars }),
    onSuccess: () => {
      toast.success("Payment updated");
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  if (isLoading) return <p className="text-blue-500 py-8">Loading payments…</p>;
  const payments = data?.payments ?? [];

  return (
    <div className="space-y-6">
      <CashPaymentForm />
      {payments.length === 0 ? (
        <div className="glass-card-light p-10 text-center text-blue-700">No payments yet.</div>
      ) : (
      <div className="glass-card-light p-2 sm:p-4 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p: any) => (
            <TableRow key={p.id}>
              <TableCell>
                <div className="font-medium text-blue-900">{p.student_name ?? "-"}</div>
                <div className="text-xs text-blue-500">{p.email ?? ""}</div>
              </TableCell>
              <TableCell className="max-w-[180px] truncate">{p.course_name ?? p.course_id}</TableCell>
              <TableCell className="capitalize">{p.certificate_type}</TableCell>
              <TableCell>${Number(p.amount).toFixed(2)}</TableCell>
              <TableCell className="text-xs text-blue-500">{new Date(p.created_at).toLocaleDateString()}</TableCell>
              <TableCell>{statusBadge(p.payment_status)}</TableCell>
              <TableCell>
                <Select
                  value={p.payment_status}
                  onValueChange={(v) => mutation.mutate({ id: p.id, status: v as any })}
                >
                  <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      )}
    </div>
  );
}

function CashPaymentForm() {
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const fetchLearnerCourses = useServerFn(getLearnerCourses);
  const recordPayment = useServerFn(createManualPayment);
  const { data: usersData } = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers() });
  const users = usersData?.users ?? [];

  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [courseName, setCourseName] = useState("");
  const [level, setLevel] = useState<"certificate" | "diploma">("certificate");
  const [manualMode, setManualMode] = useState(false);

  const { data: learnerCoursesData, isFetching: loadingCourses } = useQuery({
    queryKey: ["learner-courses", userId],
    queryFn: () => fetchLearnerCourses({ data: { userId } }),
    enabled: Boolean(userId),
  });
  const learnerCourses = learnerCoursesData?.courses ?? [];

  const pickCourse = (key: string) => {
    const c = learnerCourses.find((x: any) => `${x.courseId}::${x.level}` === key);
    if (!c) return;
    setCourseId(c.courseId);
    setCourseName(c.title);
    setLevel(c.level);
  };

  const mutation = useMutation({
    mutationFn: () => recordPayment({ data: { userId, courseId, courseName, level } }),
    onSuccess: () => {
      toast.success("Cash payment recorded");
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["learner-courses", userId] });
      setUserId(""); setCourseId(""); setCourseName(""); setLevel("certificate");
      setManualMode(false); setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to record payment"),
  });

  if (!open) {
    return (
      <div className="glass-card-light p-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-bold text-blue-900">Paid with cash?</h3>
          <p className="text-sm text-blue-600">Pick a learner and we'll auto-detect the courses they've studied.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="premium-button">Record cash payment</Button>
      </div>
    );
  }

  const hasCourses = learnerCourses.length > 0;

  return (
    <div className="glass-card-light p-5 space-y-4">
      <h3 className="font-bold text-blue-900">Record a cash / offline payment</h3>
      <div>
        <Label>Learner</Label>
        <Select value={userId} onValueChange={(v) => { setUserId(v); setCourseId(""); setCourseName(""); setManualMode(false); }}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Select learner" /></SelectTrigger>
          <SelectContent>
            {users.map((u: any) => (
              <SelectItem key={u.id} value={u.id}>
                {(u.full_name ?? "Learner")} - {u.email ?? "no email"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {userId && (
        <>
          {loadingCourses ? (
            <p className="text-sm text-blue-500">Loading their courses…</p>
          ) : hasCourses && !manualMode ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Course this learner studied</Label>
                <button type="button" onClick={() => setManualMode(true)} className="text-xs text-blue-600 hover:underline">
                  Enter manually instead
                </button>
              </div>
              <Select value={courseId && level ? `${courseId}::${level}` : ""} onValueChange={pickCourse}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Pick from their progress" /></SelectTrigger>
                <SelectContent>
                  {learnerCourses.map((c: any) => {
                    const key = `${c.courseId}::${c.level}`;
                    return (
                      <SelectItem key={key} value={key} disabled={c.alreadyPaid}>
                        {c.title} - {c.level === "diploma" ? "Diploma" : "Certificate"}
                        {c.isCompleted ? " (completed)" : c.completedModules ? ` (${c.completedModules} modules)` : ""}
                        {c.alreadyPaid ? " - already paid" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cashCourse">Course name</Label>
                <Input id="cashCourse" value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="Data Science" />
              </div>
              <div>
                <Label>Level</Label>
                <Select value={level} onValueChange={(v) => setLevel(v as "certificate" | "diploma")}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="certificate">Certificate ($12)</SelectItem>
                    <SelectItem value="diploma">Diploma ($18)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasCourses && (
                <button type="button" onClick={() => setManualMode(false)} className="text-xs text-blue-600 hover:underline justify-self-start">
                  ← Back to detected courses
                </button>
              )}
            </div>
          )}

          {courseName && (
            <div className="text-sm text-blue-700 bg-blue-50 rounded-md px-3 py-2">
              Recording <strong>{courseName}</strong> ({level}) - <strong>${level === "diploma" ? 18 : 12}</strong>
            </div>
          )}
        </>
      )}

      <div className="flex gap-3">
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !userId || !courseName}
          className="premium-button"
        >
          {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save as paid
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

function UsersTab() {
  const fetchUsers = useServerFn(listUsers);
  const fetchSchools = useServerFn(listContractedSchools);
  const { data, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers() });
  const { data: schoolsData } = useQuery({ queryKey: ["admin-schools"], queryFn: () => fetchSchools() });
  const contracted = new Set((schoolsData?.schools ?? []).map((s: any) => (s.name as string).trim().toLowerCase()));

  if (isLoading) return <p className="text-blue-500 py-8">Loading users…</p>;
  const users = data?.users ?? [];
  if (users.length === 0) return <div className="glass-card-light p-10 text-center text-blue-700">No users yet.</div>;

  return (
    <div className="glass-card-light p-2 sm:p-4 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>School</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u: any) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium text-blue-900">{u.full_name ?? "-"}</TableCell>
              <TableCell className="text-blue-600">{u.email ?? "-"}</TableCell>
              <TableCell className="capitalize">
                <Badge className={`border-0 ${u.signup_type === "academia" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                  {u.signup_type ?? "standard"}
                </Badge>
              </TableCell>
              <TableCell>
                {u.school_name ? (
                  <span className="inline-flex items-center gap-2">
                    {u.school_name}
                    {u.signup_type === "academia" && !contracted.has(u.school_name.trim().toLowerCase()) && (
                      <Badge className="border-0 bg-amber-100 text-amber-700">Not contracted</Badge>
                    )}
                  </span>
                ) : "-"}
              </TableCell>
              <TableCell className="text-xs text-blue-500">{[u.city, u.country].filter(Boolean).join(", ") || "-"}</TableCell>
              <TableCell className="text-xs text-blue-500">{new Date(u.created_at).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="glass-card-light p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 text-blue-600 flex items-center justify-center flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-xl font-black text-blue-900 truncate">{value}</div>
        <div className="text-xs text-blue-600">{label}</div>
      </div>
    </div>
  );
}

function genCertId() {
  const rnd = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EDU-${rnd()}-${rnd()}`;
}

function CertificatesTab() {
  const fetchPayments = useServerFn(listPayments);
  const updateStatus = useServerFn(updatePaymentStatus);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-payments"], queryFn: () => fetchPayments() });
  const payments = data?.payments ?? [];

  const [cert, setCert] = useState<CertificateData>({
    studentName: "",
    courseName: "",
    level: "certificate",
    date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    certificateId: genCertId(),
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!previewRef.current || downloading) return;
    const node = previewRef.current.querySelector<HTMLElement>(".cert-print-area") ?? previewRef.current;
    setDownloading(true);
    try {
      const safe = (cert.studentName || "certificate").replace(/[^\w\-]+/g, "_");
      await downloadCertificatePdf(node, `${safe}-${cert.level}.pdf`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  const loadFromPayment = (id: string) => {
    setSelectedId(id);
    const p = payments.find((x: any) => x.id === id);
    if (!p) return;
    setCert((c) => ({
      ...c,
      studentName: p.student_name ?? "",
      courseName: p.course_name ?? p.course_id ?? "",
      level: p.certificate_type === "diploma" ? "diploma" : "certificate",
      certificateId: p.certificate_id ?? genCertId(),
    }));
  };

  const markSent = useMutation({
    mutationFn: (id: string) => updateStatus({ data: { id, status: "certificate_sent" } }),
    onSuccess: () => {
      toast.success("Marked as sent");
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      <div className="glass-card-light p-5 space-y-4 no-print h-fit">
        <h3 className="font-bold text-blue-900">Create a certificate</h3>

        {payments.length > 0 && (
          <div>
            <Label>Fill from a payment</Label>
            <Select onValueChange={loadFromPayment}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select a paid student" /></SelectTrigger>
              <SelectContent>
                {payments.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {(p.student_name ?? "Student")} - {p.course_name ?? p.course_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label htmlFor="sn">Student name</Label>
          <Input id="sn" value={cert.studentName} onChange={(e) => setCert((c) => ({ ...c, studentName: e.target.value }))} placeholder="Luke Jakes" />
        </div>
        <div>
          <Label htmlFor="cn">Course name</Label>
          <Input id="cn" value={cert.courseName} onChange={(e) => setCert((c) => ({ ...c, courseName: e.target.value }))} placeholder="Data Science" />
        </div>
        <div>
          <Label>Level</Label>
          <Select value={cert.level} onValueChange={(v) => setCert((c) => ({ ...c, level: v as CertificateData["level"] }))}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="certificate">Certificate</SelectItem>
              <SelectItem value="diploma">Diploma</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="dt">Date</Label>
          <Input id="dt" value={cert.date} onChange={(e) => setCert((c) => ({ ...c, date: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="cid">Verification ID</Label>
          <Input id="cid" value={cert.certificateId} onChange={(e) => setCert((c) => ({ ...c, certificateId: e.target.value }))} />
        </div>
        <Button onClick={handleDownload} disabled={downloading} className="premium-button w-full">
          {downloading ? "Generating PDF..." : "Download PDF"}
        </Button>
        {selectedId && (
          <Button
            variant="outline"
            disabled={markSent.isPending}
            onClick={() => markSent.mutate(selectedId)}
            className="w-full border-green-200 text-green-700 hover:bg-green-50"
          >
            Mark certificate as sent
          </Button>
        )}
        <p className="text-xs text-blue-500">Downloads a single-page A4 PDF that matches the preview exactly.</p>
      </div>

      <div ref={previewRef}>
        <CertificatePreview data={cert} />
      </div>
    </div>
  );
}

function SchoolsTab() {
  const qc = useQueryClient();
  const fetchSchools = useServerFn(listContractedSchools);
  const addSchool = useServerFn(addContractedSchool);
  const removeSchool = useServerFn(removeContractedSchool);
  const { data, isLoading } = useQuery({ queryKey: ["admin-schools"], queryFn: () => fetchSchools() });
  const [name, setName] = useState("");

  const add = useMutation({
    mutationFn: () => addSchool({ data: { name } }),
    onSuccess: () => {
      toast.success("School added");
      setName("");
      qc.invalidateQueries({ queryKey: ["admin-schools"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeSchool({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["admin-schools"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const schools = data?.schools ?? [];

  return (
    <div className="space-y-6">
      <div className="glass-card-light p-5">
        <h3 className="font-bold text-blue-900 mb-1 flex items-center gap-2">
          <School className="w-5 h-5" /> Add a contracted school
        </h3>
        <p className="text-sm text-blue-600 mb-3">
          Academia signups whose school is on this list are treated as contracted students.
        </p>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="St. John's High School"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (name.trim()) add.mutate(); } }}
          />
          <Button onClick={() => add.mutate()} disabled={add.isPending || !name.trim()} className="premium-button">
            {add.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Add
          </Button>
        </div>
      </div>
      {isLoading ? (
        <p className="text-blue-500 py-8">Loading schools…</p>
      ) : schools.length === 0 ? (
        <div className="glass-card-light p-10 text-center text-blue-700">No contracted schools yet.</div>
      ) : (
        <div className="glass-card-light p-2 sm:p-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow><TableHead>School</TableHead><TableHead>Added</TableHead><TableHead></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {schools.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-blue-900">{s.name}</TableCell>
                  <TableCell className="text-xs text-blue-500">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" disabled={remove.isPending} onClick={() => remove.mutate(s.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function CredentialIdsTab() {
  const fetchIds = useServerFn(listEnrollmentCertificateIds);
  const { data, isLoading } = useQuery({ queryKey: ["admin-cert-ids"], queryFn: () => fetchIds() });
  const [q, setQ] = useState("");

  if (isLoading) return <p className="text-blue-500 py-8">Loading credential IDs…</p>;
  const rows = (data?.rows ?? []).filter((r: any) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return [r.student_name, r.course_title, r.course_id, r.certificate_id]
      .filter(Boolean)
      .some((v: string) => v.toLowerCase().includes(needle));
  });

  return (
    <div className="space-y-4">
      <div className="glass-card-light p-5">
        <h3 className="font-bold text-blue-900 mb-1">Private credential IDs</h3>
        <p className="text-sm text-blue-600 mb-3">
          Every enrolment is allocated a unique credential ID. Learners never see these - only this dashboard does,
          so a certificate cannot be fabricated without payment.
        </p>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by student, course or ID"
          className="max-w-sm"
        />
      </div>
      {rows.length === 0 ? (
        <div className="glass-card-light p-10 text-center text-blue-700">No enrolments yet.</div>
      ) : (
        <div className="glass-card-light p-2 sm:p-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Credential ID</TableHead>
                <TableHead>Enrolled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-blue-900">{r.student_name ?? "-"}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{r.course_title ?? r.course_id}</TableCell>
                  <TableCell className="capitalize">{r.level}</TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-purple-700">{r.certificate_id}</TableCell>
                  <TableCell className="text-xs text-blue-500">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function SampleCertificateTab() {
  const qc = useQueryClient();
  const fetchSample = useServerFn(getSampleCertificate);
  const saveSample = useServerFn(saveSampleCertificate);
  const { data, isLoading } = useQuery({ queryKey: ["sample-cert"], queryFn: () => fetchSample() });
  const [draft, setDraft] = useState<SampleCertificateValue | null>(null);
  const value = draft ?? data?.value ?? null;

  const save = useMutation({
    mutationFn: () => saveSample({ data: value! }),
    onSuccess: () => {
      toast.success("Sample certificate updated");
      qc.invalidateQueries({ queryKey: ["sample-cert"] });
      setDraft(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (isLoading || !value) return <p className="text-blue-500 py-8">Loading…</p>;

  const update = (patch: Partial<SampleCertificateValue>) =>
    setDraft({ ...(draft ?? value), ...patch });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      <div className="glass-card-light p-5 space-y-4 no-print h-fit">
        <h3 className="font-bold text-blue-900 flex items-center gap-2"><FileEdit className="w-4 h-4" /> Home page sample</h3>
        <p className="text-xs text-blue-600">Shown above the footer on the home page so visitors can preview a credential.</p>
        <div>
          <Label htmlFor="ss-name">Student name</Label>
          <Input id="ss-name" value={value.studentName} onChange={(e) => update({ studentName: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="ss-course">Course name</Label>
          <Input id="ss-course" value={value.courseName} onChange={(e) => update({ courseName: e.target.value })} />
        </div>
        <div>
          <Label>Level</Label>
          <Select value={value.level} onValueChange={(v) => update({ level: v as "certificate" | "diploma" })}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="certificate">Certificate</SelectItem>
              <SelectItem value="diploma">Diploma</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="ss-date">Date</Label>
          <Input id="ss-date" value={value.date} onChange={(e) => update({ date: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="ss-id">Verification ID</Label>
          <Input id="ss-id" value={value.certificateId} onChange={(e) => update({ certificateId: e.target.value })} />
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !draft} className="premium-button w-full">
          {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save changes
        </Button>
      </div>
      <div><CertificatePreview data={value} /></div>
    </div>
  );
}

function SchoolAdminInvitationTab() {
  const qc = useQueryClient();
  const fetchSchools = useServerFn(listContractedSchools);
  const fetchInvites = useServerFn(listSchoolAdminInvitations);
  const createInvite = useServerFn(createSchoolAdminInvitation);
  const setAccess = useServerFn(setSchoolOnboardingAccess);
  const approve = useServerFn(approveSchoolAdminInvitation);
  const { data: schoolData } = useQuery({ queryKey: ["contracted-schools-onboarding"], queryFn: () => fetchSchools() });
  const { data: inviteData, isLoading } = useQuery({ queryKey: ["school-admin-invitations"], queryFn: () => fetchInvites() });
  const [schoolId, setSchoolId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("school_manager");
  const [result, setResult] = useState<{ url: string; schoolCode: string } | null>(null);
  const selectedSchool = (schoolData?.schools ?? []).find((school: any) => school.id === schoolId);
  const mutation = useMutation({
    mutationFn: () => createInvite({ data: { schoolName: selectedSchool?.school_name ?? selectedSchool?.name ?? "", email, fullName, role } }),
    onSuccess: (data) => { setResult({ url: data.url, schoolCode: data.schoolCode }); setEmail(""); setFullName(""); qc.invalidateQueries({ queryKey: ["school-admin-invitations"] }); toast.success("Private invitation created"); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to create invitation"),
  });
  const accessMutation = useMutation({
    mutationFn: (input: { schoolId: string; enabled: boolean }) => setAccess({ data: input }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contracted-schools-onboarding"] }); toast.success("Onboarding access updated"); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to update access"),
  });
  const approveMutation = useMutation({
    mutationFn: (invitationId: string) => approve({ data: { invitationId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["school-admin-invitations"] }); qc.invalidateQueries({ queryKey: ["admin-school-admins"] }); toast.success("Approved: school dashboard created"); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Approval failed"),
  });
  const copy = async (value: string) => { await navigator.clipboard.writeText(`${window.location.origin}${value}`); toast.success("Invitation link copied"); };
  return <div className="space-y-6">
    <div className="glass-card-light p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-bold text-blue-900">Private school administrator onboarding</h3><p className="text-sm text-blue-600">Open a school-specific invitation page only when you are ready. Submitted details remain pending until approval.</p></div><Badge variant="outline">Approval required</Badge></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label htmlFor="invite-school">Contracted school</Label><select id="invite-school" value={schoolId} onChange={(event) => setSchoolId(event.target.value)} className="mt-2 flex h-10 w-full rounded-md border border-blue-200 bg-white px-3 text-sm text-blue-950"><option value="">Select a school</option>{(schoolData?.schools ?? []).map((school: any) => <option key={school.id} value={school.id}>{school.school_name ?? school.name} {school.school_code ? `(${school.school_code})` : ""}</option>)}</select></div>
        {selectedSchool && <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900"><span><strong>{selectedSchool.school_code}</strong> private page is {selectedSchool.onboarding_enabled ? "accessible" : "inaccessible"}.</span><Button type="button" size="sm" variant="outline" onClick={() => accessMutation.mutate({ schoolId, enabled: !selectedSchool.onboarding_enabled })}>{selectedSchool.onboarding_enabled ? "Close page" : "Open page"}</Button></div>}
        <div><Label htmlFor="invite-admin-name">Administrator name</Label><Input id="invite-admin-name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Full name" /></div><div><Label htmlFor="invite-admin-email">Administrator email</Label><Input id="invite-admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@school.edu" /></div>
        <div><Label htmlFor="invite-admin-role">Permission level</Label><select id="invite-admin-role" value={role} onChange={(event) => setRole(event.target.value)} className="mt-2 flex h-10 w-full rounded-md border border-blue-200 bg-white px-3 text-sm text-blue-950"><option value="school_manager">School manager</option><option value="school_finance">School finance</option><option value="school_viewer">School viewer</option></select></div>
      </div><Button className="premium-button mt-4" disabled={!selectedSchool?.onboarding_enabled || !email || !fullName || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Create private invitation</Button>
      {result && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><p className="font-semibold">Invitation ready for {result.schoolCode}</p><div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center"><code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1">{window.location.origin}{result.url}</code><Button type="button" size="sm" variant="outline" onClick={() => copy(result.url)}><Copy className="mr-1 h-4 w-4" />Copy link</Button></div></div>}
    </div>
    <div className="glass-card-light overflow-x-auto p-4"><h3 className="mb-3 font-bold text-blue-900">Approval queue</h3>{isLoading ? <p className="py-4 text-blue-500">Loading invitations...</p> : <Table><TableHeader><TableRow><TableHead>School</TableHead><TableHead>Applicant</TableHead><TableHead>Permission</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader><TableBody>{(inviteData?.invitations ?? []).map((invite: any) => <TableRow key={invite.id}><TableCell><div className="font-medium text-blue-900">{invite.contracted_schools?.school_name ?? "-"}</div><div className="text-xs text-sky-700">{invite.contracted_schools?.school_code ?? ""}</div></TableCell><TableCell><div>{invite.full_name ?? "-"}</div><div className="text-xs text-blue-500">{invite.email}</div></TableCell><TableCell className="capitalize">{String(invite.requested_role).replace("school_", "")}</TableCell><TableCell><Badge variant={invite.status === "approved" ? "default" : "secondary"}>{invite.status}</Badge></TableCell><TableCell>{invite.status === "pending" ? <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => approveMutation.mutate(invite.id)} disabled={approveMutation.isPending}>Approve &amp; create dashboard</Button> : <span className="text-xs text-blue-500">Reviewed</span>}</TableCell></TableRow>)}</TableBody></Table>}</div>
  </div>;
}

function SchoolAdminsTab() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listSchoolAdmins);
  const create = useServerFn(createSchoolAdmin);
  const remove = useServerFn(deleteSchoolAdmin);
  const { data, isLoading } = useQuery({ queryKey: ["admin-school-admins"], queryFn: () => fetchList() });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const add = useMutation({
    mutationFn: () => create({ data: { email, password, schoolName, contactName, contactPhone } }),
    onSuccess: () => {
      toast.success("School admin created. They can sign in at /auth");
      setEmail(""); setPassword(""); setSchoolName(""); setContactName(""); setContactPhone("");
      qc.invalidateQueries({ queryKey: ["admin-school-admins"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const rm = useMutation({
    mutationFn: (userId: string) => remove({ data: { userId } }),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["admin-school-admins"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const list = data?.schoolAdmins ?? [];

  return (
    <div className="space-y-6">
      <div className="glass-card-light p-5">
        <h3 className="font-bold text-blue-900 mb-1 flex items-center gap-2">
          <School className="w-5 h-5" /> Create a school admin account
        </h3>
        <p className="text-sm text-blue-600 mb-3">
          The school's administrator will sign in at /auth using these credentials and land on their school dashboard.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label htmlFor="sa-email">Email</Label><Input id="sa-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label htmlFor="sa-pwd">Password (min 8)</Label><Input id="sa-pwd" type="text" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label htmlFor="sa-school">School name (must match academia signup school_name)</Label><Input id="sa-school" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="St. John's High School" /></div>
          <div><Label htmlFor="sa-cname">Contact name</Label><Input id="sa-cname" value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
          <div><Label htmlFor="sa-cphone">Contact phone</Label><Input id="sa-cphone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></div>
        </div>
        <Button onClick={() => add.mutate()} disabled={add.isPending || !email || !password || !schoolName} className="premium-button mt-3">
          {add.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create school admin
        </Button>
      </div>

      {isLoading ? (
        <p className="text-blue-500 py-8">Loading…</p>
      ) : list.length === 0 ? (
        <div className="glass-card-light p-10 text-center text-blue-700">No school admins yet.</div>
      ) : (
        <div className="glass-card-light p-2 sm:p-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Added</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((s: any) => (
                <TableRow key={s.user_id}>
                  <TableCell className="font-medium text-blue-900">{s.school_name}</TableCell>
                  <TableCell>{s.contact_name ?? "-"}</TableCell>
                  <TableCell>{s.contact_phone ?? "-"}</TableCell>
                  <TableCell className="text-xs text-blue-500">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => rm.mutate(s.user_id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function AltPaymentsTab() {
  const fetchRequests = useServerFn(listAltPaymentRequests);
  const markReceived = useServerFn(markAltPaymentReceived);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-alt-payments"],
    queryFn: () => fetchRequests({}),
  });
  const mutation = useMutation({
    mutationFn: (id: string) => markReceived({ data: { id } }),
    onSuccess: () => {
      toast.success("Marked as received. A certificate_payments row was created.");
      qc.invalidateQueries({ queryKey: ["admin-alt-payments"] });
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-blue-500 py-6">Loading…</p>;
  const rows = data?.requests ?? [];
  if (rows.length === 0)
    return <p className="text-blue-500 py-6">No alt-payment requests yet.</p>;

  const fmtMethod = (m: string) =>
    m === "wechat_pay" ? "WeChat Pay" : m === "mukuru" ? "Mukuru" : m === "ecocash" ? "Ecocash" : m;

  return (
    <div className="glass-card-light p-4 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Level</TableHead>
            <TableHead>Methods</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="font-semibold text-blue-900">{r.student_name ?? "-"}</div>
                <div className="text-xs text-blue-500">{r.email ?? ""}</div>
              </TableCell>
              <TableCell className="text-sm">{r.course_name}</TableCell>
              <TableCell className="capitalize text-sm">{r.level}</TableCell>
              <TableCell className="text-xs">{(r.methods ?? []).map(fmtMethod).join(", ")}</TableCell>
              <TableCell>${Number(r.amount).toFixed(2)}</TableCell>
              <TableCell>
                <Badge variant={r.status === "received" ? "default" : "secondary"} className="capitalize">
                  {r.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {r.status === "pending" ? (
                  <Button
                    size="sm"
                    onClick={() => mutation.mutate(r.id)}
                    disabled={mutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {mutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                    Received
                  </Button>
                ) : (
                  <span className="text-xs text-green-700 font-semibold">
                    {r.received_at ? new Date(r.received_at).toLocaleDateString() : "Received"}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------- Health tab

function healthIcon(state: HealthState) {
  if (state === "ok") return <CheckCircle2 className="w-4 h-4 text-green-600" aria-hidden="true" />;
  if (state === "warn") return <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />;
  return <XCircle className="w-4 h-4 text-red-600" aria-hidden="true" />;
}

function healthLabel(state: HealthState) {
  return state === "ok" ? "Healthy" : state === "warn" ? "Attention" : "Down";
}

function HealthTab() {
  const fetchHealth = useServerFn(getBackendHealth);
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["backend-health"],
    queryFn: () => fetchHealth(),
    refetchInterval: 60_000,
  });

  const overall = data?.overall ?? "warn";
  const banner =
    overall === "ok"
      ? "bg-green-50 border-green-300 text-green-800"
      : overall === "warn"
        ? "bg-amber-50 border-amber-300 text-amber-900"
        : "bg-red-50 border-red-300 text-red-800";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" aria-hidden="true" /> System management &amp; backend health
          </h2>
          <p className="text-sm text-blue-600">
            Live checks of the database, auth, credential pipeline and integrations. Refreshes every minute.
          </p>
        </div>
        <Button
          onClick={() => void refetch()}
          variant="outline"
          className="min-h-11 border-blue-200 text-blue-700 shrink-0"
          disabled={isFetching}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
          Re-run checks
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">
          Could not run health checks: {error instanceof Error ? error.message : "unknown error"}
        </div>
      )}

      {isLoading ? (
        <p className="text-blue-500 py-8">Running checks…</p>
      ) : data ? (
        <>
          <div className={`rounded-xl border p-4 font-semibold ${banner}`} role="status" aria-live="polite">
            System status: {healthLabel(overall)} · last checked{" "}
            {new Date(data.checkedAt).toLocaleTimeString()}
          </div>

          <div className="rounded-xl border border-blue-100 bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Check</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead>Latency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.checks.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-blue-900">{c.label}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                        {healthIcon(c.state)} {healthLabel(c.state)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-blue-700">{c.detail}</TableCell>
                    <TableCell className="text-sm text-blue-600">{c.ms != null ? `${c.ms} ms` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">Error tracking</p>
            <p>
              Frontend and server exceptions are reported to Sentry. Any red or amber row above usually
              appears in Sentry as well — check the Sentry issues feed for stack traces and affected users.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
