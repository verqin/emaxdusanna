import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users, GraduationCap, DollarSign, Upload, Trash2, Loader2, ShieldAlert,
  ChartBar, CheckCircle2, AlertTriangle, Sparkles, MessageSquare, FileDown, Eye, Search,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import jsPDF from "jspdf";
const edusannaLogo = { url: "/logo.webp" };
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PaymentReceiptDialog, type PaymentReceipt } from "@/components/payment-receipt";
import {
  getMySchoolAdmin,
  listSchoolStudents,
  listRoster,
  bulkAddRoster,
  removeRosterEntry,
  verifySchoolPayment,
  getSchoolClassAnalytics,
  getSchoolStudentDetail,
  sendClassBroadcast,
} from "@/lib/school.functions";


export const Route = createFileRoute("/_authenticated/school-admin")({
  head: () => ({ meta: [{ title: "School Admin | Edusanna" }] }),
  component: SchoolAdminPage,
});

type StudentRow = {
  id: string;
  fullName: string | null;
  email: string | null;
  mobileNumber: string | null;
  className: string | null;
  enrolledAt: string;
  lastActive: string | null;
  avgQuizScore: number | null;
  coursesStarted: number;
  coursesCompleted: number;
  payments: any[];
  totalPaid: number;
};

function SchoolAdminPage() {
  const fetchMe = useServerFn(getMySchoolAdmin);
  const { data, isLoading } = useQuery({ queryKey: ["my-school-admin"], queryFn: () => fetchMe() });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data?.schoolAdmin) {
    return (
      <div className="min-h-screen">
        <SiteNavbar />
        <section className="pt-40 pb-20 px-4 text-center max-w-md mx-auto">
          <ShieldAlert className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-blue-900 mb-2">Access denied</h1>
          <p className="text-blue-600 mb-6">You are not registered as a school administrator.</p>
          <Link to="/dashboard"><Button className="premium-button">Back to dashboard</Button></Link>
        </section>
        <SiteFooter />
      </div>
    );
  }

  return <Content schoolName={data.schoolAdmin.school_name as string} contactName={data.schoolAdmin.contact_name as string | null} />;
}

function Content({ schoolName, contactName }: { schoolName: string; contactName: string | null }) {
  return (
    <div className="min-h-screen">
      <SiteNavbar />
      <WeeklyPrincipalPopup schoolName={schoolName} />
      <section className="pt-32 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-white border border-blue-100 shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0">
              <img src={edusannaLogo.url} alt="Edusanna" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-blue-900 leading-tight">{schoolName}</h1>
              <p className="text-blue-600 text-sm">School admin dashboard{contactName ? ` - ${contactName}` : ""}</p>
            </div>
            <Link to="/settings" className="ml-auto shrink-0">
              <Button variant="outline" className="min-h-11 border-blue-200 text-blue-700 hover:bg-blue-50">
                Settings
              </Button>
            </Link>
          </div>


          <section className="mt-6 rounded-2xl border border-sky-200 bg-sky-50/80 p-5 shadow-sm" aria-labelledby="admin-guide-title">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white p-2 text-sky-700 shadow-sm"><Sparkles className="h-5 w-5" aria-hidden="true" /></div>
              <div className="min-w-0">
                <h2 id="admin-guide-title" className="font-bold text-blue-950">School admin quick guide</h2>
                <p className="mt-1 text-sm text-blue-800">Use this workflow to keep learners, payments, and support requests moving.</p>
                <ol className="mt-4 grid gap-3 text-sm text-blue-900 sm:grid-cols-3">
                  <li><strong>1. Confirm your roster.</strong><br /><span className="text-blue-700">Upload or review students before approving payments.</span></li>
                  <li><strong>2. Verify paid credentials.</strong><br /><span className="text-blue-700">Select the learner and course, then issue the receipt.</span></li>
                  <li><strong>3. Keep a clear record.</strong><br /><span className="text-blue-700">Download receipts and use analytics for reconciliation.</span></li>
                </ol>
              </div>
            </div>
          </section>

          <Tabs defaultValue="analytics" className="mt-8">
            <TabsList className="mb-6 flex-wrap h-auto">
              <TabsTrigger value="analytics"><ChartBar className="w-4 h-4 mr-1.5" />Analytics</TabsTrigger>
              <TabsTrigger value="students"><Users className="w-4 h-4 mr-1.5" />Students</TabsTrigger>
              <TabsTrigger value="payments"><DollarSign className="w-4 h-4 mr-1.5" />Verify payment</TabsTrigger>
              <TabsTrigger value="roster"><Upload className="w-4 h-4 mr-1.5" />Roster</TabsTrigger>
            </TabsList>
            <TabsContent value="analytics"><AnalyticsTab schoolName={schoolName} /></TabsContent>
            <TabsContent value="students"><StudentsTab /></TabsContent>
            <TabsContent value="payments"><VerifyPaymentTab /></TabsContent>
            <TabsContent value="roster"><RosterTab /></TabsContent>
          </Tabs>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

/* --------------------------------- Helpers ---------------------------------- */

function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function computeRisks(s: StudentRow): { label: string; tone: "red" | "amber" }[] {
  const flags: { label: string; tone: "red" | "amber" }[] = [];
  const inactive = daysAgo(s.lastActive);
  if (s.coursesStarted === 0) {
    flags.push({ label: "Never started a course", tone: "red" });
  } else if (inactive !== null && inactive >= 14) {
    flags.push({ label: `No login ${inactive}d`, tone: "red" });
  } else if (inactive !== null && inactive >= 7) {
    flags.push({ label: `No login ${inactive}d`, tone: "amber" });
  }
  if (s.avgQuizScore !== null && s.avgQuizScore < 50) {
    flags.push({ label: `Low quiz avg ${s.avgQuizScore}%`, tone: "red" });
  }
  if (s.coursesStarted > 0 && s.coursesCompleted === 0 && (inactive ?? 0) >= 21) {
    flags.push({ label: "Stalled - no completions", tone: "amber" });
  }
  return flags;
}

/* --------------------------------- Analytics -------------------------------- */

function AnalyticsTab({ schoolName }: { schoolName: string }) {
  const fetchAnalytics = useServerFn(getSchoolClassAnalytics);
  const { data, isLoading } = useQuery({ queryKey: ["school-analytics"], queryFn: () => fetchAnalytics() });

  const [broadcastOpen, setBroadcastOpen] = useState(false);

  if (isLoading) return <p className="text-blue-500 py-8">Loading analytics…</p>;
  const classes = data?.classes ?? [];
  const totals = data?.totals;

  const chartData = classes.map((c) => ({
    name: c.className,
    Students: c.students,
    Started: c.coursesStarted,
    Completed: c.coursesCompleted,
    Paid: c.certificatesPaid + c.diplomasPaid,
  }));

  const downloadPdf = () => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    pdf.setFontSize(18);
    pdf.text(`${schoolName} - Class Report`, 14, 20);
    pdf.setFontSize(10);
    pdf.text(new Date().toLocaleString(), 14, 27);
    let y = 40;
    pdf.setFontSize(11);
    pdf.text(`Total students: ${totals?.students ?? 0}`, 14, y); y += 6;
    pdf.text(`Courses started: ${totals?.coursesStarted ?? 0}   Completed: ${totals?.coursesCompleted ?? 0}`, 14, y); y += 6;
    pdf.text(`Credentials paid: ${(totals?.certificatesPaid ?? 0) + (totals?.diplomasPaid ?? 0)}   Revenue: $${(totals?.revenue ?? 0).toFixed(2)}`, 14, y); y += 10;

    pdf.setFontSize(12);
    pdf.text("Per-class breakdown", 14, y); y += 6;
    pdf.setFontSize(9);
    const header = ["Class", "Students", "Started", "Completed", "%", "Cert/Dip", "Revenue"];
    header.forEach((h, i) => pdf.text(h, 14 + i * 27, y));
    y += 5;
    classes.forEach((c) => {
      if (y > 280) { pdf.addPage(); y = 20; }
      const pct = c.coursesStarted ? Math.round((c.coursesCompleted / c.coursesStarted) * 100) : 0;
      const row = [c.className, String(c.students), String(c.coursesStarted), String(c.coursesCompleted), `${pct}%`, `${c.certificatesPaid}/${c.diplomasPaid}`, `$${c.revenue.toFixed(2)}`];
      row.forEach((r, i) => pdf.text(r.slice(0, 20), 14 + i * 27, y));
      y += 5;
    });
    pdf.save(`${schoolName.replace(/[^a-z0-9]+/gi, "-")}-report.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Students" value={totals?.students ?? 0} />
        <StatCard icon={<GraduationCap className="w-5 h-5" />} label="Completed courses" value={totals?.coursesCompleted ?? 0} />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Credentials paid" value={(totals?.certificatesPaid ?? 0) + (totals?.diplomasPaid ?? 0)} />
        <StatCard icon={<DollarSign className="w-5 h-5" />} label="Revenue" value={`$${(totals?.revenue ?? 0).toFixed(2)}`} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={downloadPdf}><FileDown className="w-4 h-4 mr-1.5" />Download class PDF</Button>
        <Button variant="outline" onClick={() => setBroadcastOpen(true)} disabled={classes.length === 0}>
          <MessageSquare className="w-4 h-4 mr-1.5" />Message a class
        </Button>
      </div>

      {classes.length > 0 && (
        <div className="glass-card-light p-4">
          <h3 className="font-bold text-blue-900 mb-2">Class comparison</h3>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                <XAxis dataKey="name" tick={{ fill: "#1e40af", fontSize: 12 }} />
                <YAxis tick={{ fill: "#1e40af", fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Students" fill="#3b82f6" />
                <Bar dataKey="Started" fill="#8b5cf6" />
                <Bar dataKey="Completed" fill="#22c55e" />
                <Bar dataKey="Paid" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="glass-card-light p-2 sm:p-4 overflow-x-auto">
        <h3 className="font-bold text-blue-900 px-2 pt-2">Performance by class</h3>
        {classes.length === 0 ? (
          <p className="text-blue-600 px-2 py-6">No data yet. Upload your roster and invite students to register.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Courses started</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Completion %</TableHead>
                <TableHead>Cert / Dip paid</TableHead>
                <TableHead>Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((c) => {
                const pct = c.coursesStarted ? Math.round((c.coursesCompleted / c.coursesStarted) * 100) : 0;
                return (
                  <TableRow key={c.className}>
                    <TableCell className="font-medium text-blue-900">{c.className}</TableCell>
                    <TableCell>{c.students}</TableCell>
                    <TableCell>{c.coursesStarted}</TableCell>
                    <TableCell>{c.coursesCompleted}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-700 border-0">{pct}%</Badge>
                    </TableCell>
                    <TableCell>{c.certificatesPaid} / {c.diplomasPaid}</TableCell>
                    <TableCell className="font-semibold text-blue-900">${c.revenue.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <BroadcastDialog
        open={broadcastOpen}
        onOpenChange={setBroadcastOpen}
        classes={classes.map((c) => c.className)}
      />
    </div>
  );
}

/* --------------------------------- Students --------------------------------- */

function StudentsTab() {
  const fetchStudents = useServerFn(listSchoolStudents);
  const { data, isLoading } = useQuery({ queryKey: ["school-students"], queryFn: () => fetchStudents() });
  const [drilldownId, setDrilldownId] = useState<string | null>(null);
  const [motivationOpen, setMotivationOpen] = useState(false);
  const [motivationText, setMotivationText] = useState("");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");

  if (isLoading) return <p className="text-blue-500 py-8">Loading students…</p>;
  const allStudents = (data?.students ?? []) as StudentRow[];
  const unmatched = data?.unmatched ?? [];

  const classOptions = Array.from(new Set(allStudents.map((s) => s.className).filter(Boolean))) as string[];
  const q = search.trim().toLowerCase();
  const students = allStudents.filter((s) => {
    if (classFilter !== "all" && (s.className ?? "") !== classFilter) return false;
    if (!q) return true;
    return (
      (s.fullName ?? "").toLowerCase().includes(q) ||
      (s.email ?? "").toLowerCase().includes(q) ||
      (s.className ?? "").toLowerCase().includes(q) ||
      (s.mobileNumber ?? "").toLowerCase().includes(q)
    );
  });

  const flaggedCount = students.reduce((n, s) => n + (computeRisks(s).length > 0 ? 1 : 0), 0);


  const openMotivation = (s: StudentRow) => {
    const risks = computeRisks(s);
    const first = risks[0]?.label ?? "Doing well";
    const nudge = risks.length === 0
      ? `${s.fullName} is on track. Send them a quick note of encouragement to keep the streak going.`
      : `${s.fullName} needs a nudge (${first.toLowerCase()}). A short personal message from the school often re-engages students within 24 hours.`;
    setMotivationText(nudge);
    setMotivationOpen(true);
  };

  return (
    <div className="space-y-6">
      {flaggedCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <div className="text-sm text-amber-900">
            <strong>{flaggedCount}</strong> student{flaggedCount === 1 ? "" : "s"} need attention. Look for the risk badges below and open a drilldown to see details.
          </div>
        </div>
      )}

      <div className="glass-card-light p-2 sm:p-4 overflow-x-auto">
        <div className="flex flex-wrap items-center gap-2 px-2 pt-2">
          <h3 className="font-bold text-blue-900 mr-auto">Registered students ({students.length}{q || classFilter !== "all" ? ` / ${allStudents.length}` : ""})</h3>
          <div className="relative">
            <Search className="w-4 h-4 text-blue-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, class…"
              className="h-9 pl-8 w-56"
            />
          </div>
          {classOptions.length > 0 && (
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        {students.length === 0 ? (
          <p className="text-blue-600 px-2 py-6">{q || classFilter !== "all" ? "No students match your search." : "No students from your school have registered yet."}</p>

        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Quiz avg</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => {
                const risks = computeRisks(s);
                const inactive = daysAgo(s.lastActive);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-blue-900">{s.fullName}</TableCell>
                    <TableCell>{s.className ?? <span className="text-amber-600 text-xs">Unassigned</span>}</TableCell>
                    <TableCell className="text-xs">
                      {s.lastActive
                        ? inactive === 0 ? "Today" : `${inactive}d ago`
                        : <span className="text-red-500">Never</span>}
                    </TableCell>
                    <TableCell>{s.coursesStarted}</TableCell>
                    <TableCell>{s.coursesCompleted}</TableCell>
                    <TableCell>{s.avgQuizScore !== null ? `${s.avgQuizScore}%` : <span className="text-blue-400 text-xs">-</span>}</TableCell>
                    <TableCell>
                      {risks.length === 0
                        ? <Badge className="bg-green-100 text-green-700 border-0">On track</Badge>
                        : (
                          <div className="flex flex-wrap gap-1">
                            {risks.slice(0, 2).map((r, i) => (
                              <Badge key={i} className={
                                r.tone === "red"
                                  ? "bg-red-100 text-red-700 border-0"
                                  : "bg-amber-100 text-amber-700 border-0"
                              }>{r.label}</Badge>
                            ))}
                          </div>
                        )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="outline" onClick={() => setDrilldownId(s.id)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openMotivation(s)}>
                          <Sparkles className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {unmatched.length > 0 && (
        <div className="glass-card-light p-4">
          <h3 className="font-bold text-blue-900 mb-2">Roster entries not yet signed up ({unmatched.length})</h3>
          <p className="text-sm text-blue-600 mb-3">These students are on your roster but have not yet created an Edusanna account.</p>
          <div className="flex flex-wrap gap-2">
            {unmatched.slice(0, 50).map((u, i) => (
              <span key={i} className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-2.5 py-1">
                {u.fullName}{u.className ? ` (${u.className})` : ""}
              </span>
            ))}
            {unmatched.length > 50 && <span className="text-xs text-blue-500">+ {unmatched.length - 50} more</span>}
          </div>
        </div>
      )}

      <StudentDrilldownDialog studentId={drilldownId} onClose={() => setDrilldownId(null)} />

      <Dialog open={motivationOpen} onOpenChange={setMotivationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-600" /> Motivation nudge</DialogTitle>
            <DialogDescription>Suggested action for this student.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-blue-900">{motivationText}</p>
          <DialogFooter>
            <Button className="premium-button" onClick={() => setMotivationOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------ Student drilldown --------------------------- */

function StudentDrilldownDialog({ studentId, onClose }: { studentId: string | null; onClose: () => void }) {
  const fetchDetail = useServerFn(getSchoolStudentDetail);
  const { data, isLoading } = useQuery({
    queryKey: ["school-student-detail", studentId],
    queryFn: () => fetchDetail({ data: { studentId: studentId! } }),
    enabled: !!studentId,
  });

  return (
    <Dialog open={!!studentId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data?.profile?.fullName ?? "Student detail"}</DialogTitle>
          <DialogDescription>{data?.profile?.email}</DialogDescription>
        </DialogHeader>
        {isLoading || !data ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : (
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniStat label="Joined" value={new Date(data.profile.joinedAt).toLocaleDateString()} />
              <MiniStat label="Last active" value={data.lastActive ? `${daysAgo(data.lastActive)}d ago` : "Never"} />
              <MiniStat label="Time on platform" value={`${data.timeOnPlatformDays}d`} />
              <MiniStat label="Courses" value={String(data.courses.length)} />
            </div>

            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Course progress</h4>
              {data.courses.length === 0 ? (
                <p className="text-blue-500 text-xs">No course activity yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Modules</TableHead>
                      <TableHead>Quizzes</TableHead>
                      <TableHead>Avg</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.courses.map((c: any) => (
                      <TableRow key={`${c.courseId}-${c.level}`}>
                        <TableCell className="font-medium text-blue-900">{c.courseId}</TableCell>
                        <TableCell className="capitalize">{c.level}</TableCell>
                        <TableCell>{c.modulesCompleted}</TableCell>
                        <TableCell>{c.quizzesTaken}</TableCell>
                        <TableCell>{c.avgQuizScore !== null ? `${c.avgQuizScore}%` : "-"}</TableCell>
                        <TableCell>
                          {c.isCompleted
                            ? <Badge className="bg-green-100 text-green-700 border-0">Completed</Badge>
                            : <Badge className="bg-blue-100 text-blue-700 border-0">In progress</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {data.payments.length > 0 && (
              <div>
                <h4 className="font-semibold text-blue-900 mb-2">Payments</h4>
                <ul className="text-xs space-y-1">
                  {data.payments.map((p: any, i: number) => (
                    <li key={i} className="flex justify-between border-b border-blue-50 pb-1">
                      <span>{p.course_name ?? p.course_id} - {p.certificate_type}</span>
                      <span className="font-semibold">${Number(p.amount).toFixed(2)} <span className="text-blue-500 font-normal">({p.payment_status})</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-blue-50 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-blue-500">{label}</div>
      <div className="font-bold text-blue-900 text-sm">{value}</div>
    </div>
  );
}

/* ------------------------------ Broadcast dialog ---------------------------- */

function BroadcastDialog({
  open, onOpenChange, classes,
}: { open: boolean; onOpenChange: (v: boolean) => void; classes: string[] }) {
  const send = useServerFn(sendClassBroadcast);
  const [className, setClassName] = useState("");
  const [message, setMessage] = useState("");
  const mutation = useMutation({
    mutationFn: () => send({ data: { className, message } }),
    onSuccess: (res: any) => {
      toast.success(`Message queued for ${res?.recipients ?? 0} student${res?.recipients === 1 ? "" : "s"}. Edusanna admin will relay it.`);
      setMessage("");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-blue-600" /> Message a class</DialogTitle>
          <DialogDescription>Your message is relayed to the Edusanna admin, who forwards it to the class.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Class</Label>
            <Select value={className} onValueChange={setClassName}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Pick a class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Great work this week - keep up the streak on your certificate courses!" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="premium-button" onClick={() => mutation.mutate()} disabled={mutation.isPending || !className || message.trim().length < 3}>
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------- Weekly principal popup ------------------------ */

function WeeklyPrincipalPopup({ schoolName }: { schoolName: string }) {
  const fetchStudents = useServerFn(listSchoolStudents);
  const { data } = useQuery({ queryKey: ["school-students"], queryFn: () => fetchStudents() });
  const [open, setOpen] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!data || shownRef.current) return;
    const key = `edusanna:weeklyPrincipal:${schoolName}`;
    const last = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    const weekMs = 7 * 86400000;
    if (last && Date.now() - Number(last) < weekMs) return;
    shownRef.current = true;
    setOpen(true);
    if (typeof window !== "undefined") window.localStorage.setItem(key, String(Date.now()));
  }, [data, schoolName]);

  const students = (data?.students ?? []) as StudentRow[];
  const activeThisWeek = students.filter((s) => {
    const d = daysAgo(s.lastActive);
    return d !== null && d <= 7;
  }).length;
  const newSignups = students.filter((s) => {
    const d = daysAgo(s.enrolledAt);
    return d !== null && d <= 7;
  }).length;
  const completions = students.reduce((n, s) => n + s.coursesCompleted, 0);
  const atRisk = students.filter((s) => computeRisks(s).length > 0).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-600" /> Weekly principal summary</DialogTitle>
          <DialogDescription>A quick snapshot of {schoolName} this past week.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <MiniStat label="Active this week" value={String(activeThisWeek)} />
          <MiniStat label="New signups" value={String(newSignups)} />
          <MiniStat label="Total completions" value={String(completions)} />
          <MiniStat label="Students at risk" value={String(atRisk)} />
        </div>
        <p className="text-xs text-blue-600">Tip: open the Students tab to nudge at-risk students, or Analytics to broadcast an encouraging message to a class.</p>
        <DialogFooter>
          <Button className="premium-button" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- Verify payment --------------------------- */

function VerifyPaymentTab() {
  const qc = useQueryClient();
  const fetchStudents = useServerFn(listSchoolStudents);
  const verify = useServerFn(verifySchoolPayment);
  const { data } = useQuery({ queryKey: ["school-students"], queryFn: () => fetchStudents() });
  const students = (data?.students ?? []) as StudentRow[];

  const [studentId, setStudentId] = useState("");
  const [courseSelection, setCourseSelection] = useState<string>("");
  const [courseName, setCourseName] = useState("");
  const [courseId, setCourseId] = useState("");
  const [level, setLevel] = useState<"certificate" | "diploma">("certificate");
  const [manual, setManual] = useState(false);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const student = students.find((s) => s.id === studentId);
  const amount = level === "diploma" ? 18 : 12;

  // Every school-verified payment on file, newest first, so a receipt can be
  // re-issued at any time (e.g. the student lost their copy).
  const schoolPayments = students
    .flatMap((s) =>
      (s.payments ?? [])
        .filter((p: any) => p.source === "school")
        .map((p: any) => ({ ...p, fullName: s.fullName, email: s.email, className: s.className })),
    )
    .sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)));

  const receiptFor = (p: any): PaymentReceipt => ({
    receiptNo: `RC-${String(p.certificate_id ?? p.id).replace(/^EDU-SCH-/, "")}`,
    issuedAt: p.created_at,
    schoolName: p.school_name ?? "",
    className: p.class_name ?? p.className ?? null,
    studentName: p.fullName ?? "(unknown)",
    email: p.email ?? null,
    courseName: p.course_name ?? p.course_id,
    level: p.certificate_type === "diploma" ? "diploma" : "certificate",
    amount: Number(p.amount ?? 0),
    certificateId: p.certificate_id ?? "-",
    method: "Cash (paid at school)",
  });

  const openReceipt = (r: PaymentReceipt) => {
    setReceipt(r);
    setReceiptOpen(true);
  };

  const mutation = useMutation({
    mutationFn: () =>
      verify({
        data: {
          studentId,
          courseId: courseId || courseName.toLowerCase().replace(/\s+/g, "-"),
          courseName,
          level,
          amount,
        },
      }),
    onSuccess: (res) => {
      if ((res as any)?.success === false) {
        toast.error((res as any).error ?? "Could not verify payment");
        return;
      }
      toast.success("Payment verified - receipt ready");
      qc.invalidateQueries({ queryKey: ["school-students"] });
      qc.invalidateQueries({ queryKey: ["school-analytics"] });
      const r = (res as any)?.receipt as PaymentReceipt | undefined;
      if (r) openReceipt(r);
      setStudentId(""); setCourseId(""); setCourseName(""); setLevel("certificate"); setManual(false); setCourseSelection("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-6">
    <div className="glass-card-light p-5 max-w-2xl space-y-4">
      <div>
        <h3 className="font-bold text-blue-900">Verify a cash payment</h3>
        <p className="text-sm text-blue-600">
          A student paid you at school reception. Verify it here to issue their credential and notify Edusanna admin instantly.
        </p>
      </div>

      <div>
        <Label>Student</Label>
        <Select value={studentId} onValueChange={(v) => { setStudentId(v); setCourseSelection(""); setCourseId(""); setCourseName(""); }}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Pick a student from your school" /></SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.fullName} {s.className ? `(${s.className})` : ""} - {s.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {studentId && (
        <>
          {student && student.payments.length > 0 && !manual && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Existing course on file</Label>
                <button type="button" onClick={() => setManual(true)} className="text-xs text-blue-600 hover:underline">
                  Enter manually instead
                </button>
              </div>
              <Select
                value={courseSelection}
                onValueChange={(v) => {
                  setCourseSelection(v);
                  const p = student.payments.find((x: any) => `${x.course_id}::${x.certificate_type}` === v);
                  if (p) {
                    setCourseId(p.course_id);
                    setCourseName(p.course_name ?? p.course_id);
                    setLevel(p.certificate_type === "diploma" ? "diploma" : "certificate");
                  }
                }}
              >
                <SelectTrigger className="h-10"><SelectValue placeholder="Pick a course they previously paid" /></SelectTrigger>
                <SelectContent>
                  {student.payments.map((p: any) => {
                    const key = `${p.course_id}::${p.certificate_type}`;
                    return (
                      <SelectItem key={p.id} value={key}>
                        {p.course_name ?? p.course_id} - {p.certificate_type}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {(manual || !student || student.payments.length === 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="cn">Course name</Label>
                <Input id="cn" value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="Data Science Fundamentals" />
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
            </div>
          )}

          {courseName && (
            <div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
              Verifying <strong>{courseName}</strong> ({level}) - <strong>${amount}</strong> for <strong>{student?.fullName}</strong>
            </div>
          )}
        </>
      )}

      <div className="flex gap-3">
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !studentId || !courseName}
          className="premium-button"
        >
          {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Verify
        </Button>
      </div>
    </div>

    <div className="glass-card-light p-2 sm:p-4 overflow-x-auto">
      <h3 className="font-bold text-blue-900 px-2 pt-2">Receipts ({schoolPayments.length})</h3>
      <p className="text-sm text-blue-600 px-2 pb-2">
        Every payment you have confirmed. Open a receipt to print it or save it as a PDF for the payer.
      </p>
      {schoolPayments.length === 0 ? (
        <p className="text-blue-600 p-6 text-center">No confirmed payments yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schoolPayments.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-blue-900">{p.fullName}</TableCell>
                <TableCell>{p.course_name ?? p.course_id}</TableCell>
                <TableCell><Badge variant="outline">{p.certificate_type}</Badge></TableCell>
                <TableCell>${Number(p.amount ?? 0).toFixed(2)}</TableCell>
                <TableCell className="text-sm text-blue-600">
                  {p.created_at ? new Date(p.created_at).toLocaleDateString() : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => openReceipt(receiptFor(p))}>
                    <FileDown className="w-4 h-4 mr-1.5" />Receipt
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>

    <PaymentReceiptDialog receipt={receipt} open={receiptOpen} onOpenChange={setReceiptOpen} />
    </div>
  );
}

/* ----------------------------------- Roster --------------------------------- */

function RosterTab() {
  const qc = useQueryClient();
  const fetchRoster = useServerFn(listRoster);
  const bulk = useServerFn(bulkAddRoster);
  const remove = useServerFn(removeRosterEntry);
  const { data, isLoading } = useQuery({ queryKey: ["school-roster"], queryFn: () => fetchRoster() });
  const roster = data?.roster ?? [];

  const [className, setClassName] = useState("");
  const [paste, setPaste] = useState("");
  const [search, setSearch] = useState("");

  // Title-case any lowercase or underscored names as they type — so the roster
  // stays clean even if a principal pastes messy data. (Preserves already-cased names.)
  const cleanName = (s: string) =>
    s
      .replace(/[._\-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((w) => (/[A-Z]/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
      .join(" ");

  const parsedEntries = paste
    .split(/\r?\n/)
    .map((line) => cleanName(line))
    .filter((n) => n.length >= 2);
  const parsedCount = parsedEntries.length;

  const upload = useMutation({
    mutationFn: () => {
      const cls = className.trim();
      const entries = parsedEntries.map((name) => ({
        fullName: name,
        className: cls || undefined,
      }));
      return bulk({ data: { entries } });
    },
    onSuccess: (res) => {
      toast.success(`${(res as any).added ?? 0} students added to ${className || "no class"}`);
      setPaste("");
      qc.invalidateQueries({ queryKey: ["school-roster"] });
      qc.invalidateQueries({ queryKey: ["school-students"] });
      qc.invalidateQueries({ queryKey: ["school-analytics"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  const rm = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["school-roster"] });
    },
  });

  const q = search.trim().toLowerCase();
  const filteredRoster = q
    ? roster.filter((r: any) =>
        (r.full_name ?? "").toLowerCase().includes(q) ||
        (r.class_name ?? "").toLowerCase().includes(q),
      )
    : roster;

  return (
    <div className="space-y-6">
      <div className="glass-card-light p-5 space-y-4">
        <div>
          <h3 className="font-bold text-blue-900">Bulk upload your class roster</h3>
          <p className="text-sm text-blue-600">
            Step 1: name the class. Step 2: paste one student name per line. We auto-clean the casing so names look proper on certificates.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <Label htmlFor="cls">Class name</Label>
            <Input
              id="cls"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. Form 4A"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Preview</Label>
            <div className="h-10 rounded-md border border-blue-100 bg-blue-50 px-3 flex items-center text-sm text-blue-800">
              {className.trim() ? (
                <>Uploading <strong className="mx-1">{parsedCount}</strong> student{parsedCount === 1 ? "" : "s"} to <strong className="mx-1">{className.trim()}</strong></>
              ) : (
                <span className="text-blue-500">Enter a class name first…</span>
              )}
            </div>
          </div>
        </div>
        <div>
          <Label htmlFor="paste">Student names (one per line)</Label>
          <Textarea
            id="paste"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={8}
            placeholder={"Tinashe Lee Vurayai\nTariro Moyo\nBongani Khumalo\nChipo Ndlovu"}
          />
        </div>
        <Button
          onClick={() => upload.mutate()}
          disabled={upload.isPending || !className.trim() || parsedCount === 0}
          className="premium-button"
        >
          {upload.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Upload {parsedCount > 0 ? `${parsedCount} student${parsedCount === 1 ? "" : "s"}` : "roster"}
        </Button>
      </div>


      <div className="glass-card-light p-2 sm:p-4 overflow-x-auto">
        <div className="flex flex-wrap items-center gap-2 px-2 pt-2 pb-1">
          <h3 className="font-bold text-blue-900 mr-auto">Roster ({filteredRoster.length}{q ? ` / ${roster.length}` : ""})</h3>
          <div className="relative">
            <Search className="w-4 h-4 text-blue-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or class…"
              className="h-9 pl-8 w-56"
            />
          </div>
        </div>
        {isLoading ? (
          <p className="text-blue-500 p-4">Loading roster…</p>
        ) : filteredRoster.length === 0 ? (
          <p className="text-blue-600 p-6 text-center">{q ? "No matches." : "No roster entries yet."}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Class</TableHead><TableHead></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoster.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-blue-900">{r.full_name}</TableCell>
                  <TableCell>{r.class_name ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => rm.mutate(r.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

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
