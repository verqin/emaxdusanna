import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* -------------------------- Edusanna admin creates a school admin ----------- */

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden: admin access required");
}

export const createSchoolAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      email: string;
      password: string;
      schoolName: string;
      contactName?: string;
      contactPhone?: string;
    }) => {
      const email = (input?.email ?? "").trim().toLowerCase();
      const password = input?.password ?? "";
      const schoolName = (input?.schoolName ?? "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Valid email is required");
      if (password.length < 8) throw new Error("Password must be at least 8 characters");
      if (schoolName.length < 2 || schoolName.length > 200) throw new Error("School name is required");
      return {
        email,
        password,
        schoolName,
        contactName: (input.contactName ?? "").trim().slice(0, 120) || null,
        contactPhone: (input.contactPhone ?? "").trim().slice(0, 40) || null,
      };
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Create the auth user (email confirmed so they can sign in immediately)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.contactName ?? data.schoolName,
        signup_type: "school_admin",
        school_name: data.schoolName,
      },
    });
    if (createErr || !created?.user) {
      throw new Error(createErr?.message ?? "Could not create school admin account");
    }
    const userId = created.user.id;

    // 2) Insert school_admins record
    const { error: saErr } = await supabaseAdmin.from("school_admins").insert({
      user_id: userId,
      school_name: data.schoolName,
      contact_name: data.contactName,
      contact_phone: data.contactPhone,
      created_by: context.userId,
    });
    if (saErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      throw saErr;
    }

    // 3) Grant the school_admin role
    const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: "school_admin",
    });
    if (roleErr) throw roleErr;

    return { success: true, userId };
  });

export const listSchoolAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("school_admins")
      .select("user_id, school_name, contact_name, contact_phone, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { schoolAdmins: data ?? [] };
  });

export const deleteSchoolAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input?.userId) throw new Error("Missing userId");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Cascades through school_admins + user_roles via FK
    await supabaseAdmin.auth.admin.deleteUser(data.userId);
    return { success: true };
  });

/* -------------------------- School admin self-service ----------------------- */

async function getMySchool(context: { supabase: any; userId: string }): Promise<string> {
  const { data, error } = await context.supabase
    .from("school_admins")
    .select("school_name, normalized_school")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("You are not registered as a school administrator");
  return data.school_name as string;
}

export const getMySchoolAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("school_admins")
      .select("school_name, contact_name, contact_phone")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { schoolAdmin: data };
  });

/** List the students at this admin's school + their progress, joined by school_name. */
export const listSchoolStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const schoolName = await getMySchool(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const target = schoolName.trim().toLowerCase();

    // Pull all profiles for the school (case-insensitive)
    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, mobile_number, school_name, signup_type, class_name, created_at");
    if (pErr) throw pErr;

    // School admin accounts are staff, never students - keep them out of the roster,
    // the counts, the charts and the risk flags.
    const { data: staff } = await supabaseAdmin.from("school_admins").select("user_id");
    const staffIds = new Set((staff ?? []).map((s) => s.user_id as string));

    const myProfiles = (profiles ?? []).filter(
      (p) =>
        (p.school_name ?? "").trim().toLowerCase() === target &&
        p.signup_type !== "school_admin" &&
        !staffIds.has(p.id),
    );
    const ids = myProfiles.map((p) => p.id);

    // Students provide their school and class during Academia signup. The school dashboard
    // therefore discovers the live student population directly from profiles.

    // Progress + payments for these students
    const [progRes, payRes] = await Promise.all([
      ids.length
        ? supabaseAdmin
            .from("course_progress")
            .select("user_id, course_id, level, completed_modules, is_completed, quiz_scores, updated_at")
            .in("user_id", ids)
        : Promise.resolve({ data: [] as any[], error: null }),
      ids.length
        ? supabaseAdmin
            .from("certificate_payments")
            .select("id, user_id, course_id, course_name, certificate_type, amount, payment_status, created_at, certificate_id, source, school_name, class_name")
            .in("user_id", ids)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);
    const progress = (progRes.data as any[]) ?? [];
    const payments = (payRes.data as any[]) ?? [];

    const avgQuiz = (scores: any): number | null => {
      if (!scores || typeof scores !== "object") return null;
      const vals = Object.values(scores).map((v) => Number(v)).filter((n) => Number.isFinite(n));
      if (!vals.length) return null;
      return Math.round(vals.reduce((s, n) => s + n, 0) / vals.length);
    };

    const students = myProfiles.map((p) => {
      const myProg = progress.filter((q) => q.user_id === p.id);
      const myPay = payments.filter((q) => q.user_id === p.id);
      const lastActive = myProg.reduce<string | null>((acc, q) => {
        if (!q.updated_at) return acc;
        if (!acc || q.updated_at > acc) return q.updated_at;
        return acc;
      }, null);
      const quizAverages = myProg
        .map((q) => avgQuiz(q.quiz_scores))
        .filter((n): n is number => n !== null);
      const avgQuizScore = quizAverages.length
        ? Math.round(quizAverages.reduce((s, n) => s + n, 0) / quizAverages.length)
        : null;
      return {
        id: p.id,
        fullName: p.full_name,
        email: p.email,
        mobileNumber: p.mobile_number,
        className: p.class_name ?? null,
        enrolledAt: p.created_at,
        lastActive,
        avgQuizScore,
        coursesStarted: myProg.length,
        coursesCompleted: myProg.filter((q) => q.is_completed).length,
        payments: myPay,
        totalPaid: myPay.reduce((s, q) => s + Number(q.amount ?? 0), 0),
      };
    });

    const unmatched: Array<{ fullName: string; className: string | null }> = [];
    return { schoolName, students, unmatched };
  });

/** Detailed drilldown for one student at this admin's school. */
export const getSchoolStudentDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentId: string }) => {
    if (!input?.studentId || typeof input.studentId !== "string") throw new Error("Missing studentId");
    return input;
  })
  .handler(async ({ data, context }) => {
    const schoolName = await getMySchool(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const target = schoolName.trim().toLowerCase();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, mobile_number, school_name, created_at")
      .eq("id", data.studentId)
      .maybeSingle();
    if (!profile) throw new Error("Student not found");
    if ((profile.school_name ?? "").trim().toLowerCase() !== target) {
      throw new Error("This student is not assigned to your school");
    }

    const [progRes, enrRes, payRes] = await Promise.all([
      supabaseAdmin
        .from("course_progress")
        .select("course_id, level, completed_modules, is_completed, quiz_scores, updated_at")
        .eq("user_id", data.studentId),
      supabaseAdmin
        .from("enrollments")
        .select("course_id, course_title, level, created_at")
        .eq("user_id", data.studentId),
      supabaseAdmin
        .from("certificate_payments")
        .select("course_id, course_name, certificate_type, amount, payment_status, created_at")
        .eq("user_id", data.studentId)
        .order("created_at", { ascending: false }),
    ]);

    const progress = (progRes.data as any[]) ?? [];
    const enrollments = (enrRes.data as any[]) ?? [];
    const payments = (payRes.data as any[]) ?? [];

    const lastActive = progress.reduce<string | null>((acc, q) => {
      if (!q.updated_at) return acc;
      if (!acc || q.updated_at > acc) return q.updated_at;
      return acc;
    }, null);
    const firstEnrolled = enrollments.reduce<string | null>((acc, e) => {
      if (!e.created_at) return acc;
      if (!acc || e.created_at < acc) return e.created_at;
      return acc;
    }, null);
    // Estimate time on platform in days from first enrollment to last activity.
    const timeOnPlatformDays =
      firstEnrolled && lastActive
        ? Math.max(1, Math.round((new Date(lastActive).getTime() - new Date(firstEnrolled).getTime()) / 86400000))
        : firstEnrolled
          ? Math.max(1, Math.round((Date.now() - new Date(firstEnrolled).getTime()) / 86400000))
          : 0;

    const courses = progress.map((p) => {
      const scores = (p.quiz_scores && typeof p.quiz_scores === "object" ? p.quiz_scores : {}) as Record<string, number>;
      const vals = Object.values(scores).map((v) => Number(v)).filter((n) => Number.isFinite(n));
      return {
        courseId: p.course_id,
        level: p.level,
        isCompleted: !!p.is_completed,
        modulesCompleted: Array.isArray(p.completed_modules) ? p.completed_modules.length : 0,
        avgQuizScore: vals.length ? Math.round(vals.reduce((s, n) => s + n, 0) / vals.length) : null,
        quizzesTaken: vals.length,
        updatedAt: p.updated_at,
      };
    });

    return {
      profile: {
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        mobileNumber: profile.mobile_number,
        joinedAt: profile.created_at,
      },
      lastActive,
      firstEnrolled,
      timeOnPlatformDays,
      courses,
      enrollments,
      payments,
    };
  });

/** Send a broadcast to a class. Relayed via Telegram to Edusanna admin. */
export const sendClassBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { className: string; message: string }) => {
    const className = (input?.className ?? "").trim().slice(0, 80);
    const message = (input?.message ?? "").trim().slice(0, 2000);
    if (!className) throw new Error("Pick a class");
    if (message.length < 3) throw new Error("Message is too short");
    return { className, message };
  })
  .handler(async ({ data, context }) => {
    const schoolName = await getMySchool(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const target = schoolName.trim().toLowerCase();

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email, school_name, class_name, signup_type")
      .eq("class_name", data.className);
    const recipients = ((profiles ?? []) as any[])
      .filter((p) => (p.school_name ?? "").trim().toLowerCase() === target)
      .filter((p) => p.signup_type !== "school_admin")
      .map((p) => ({ fullName: p.full_name as string | null, email: p.email as string | null }));

    try {
      const { notifyAdminTelegram } = await import("@/lib/notify.server");
      const preview = data.message.length > 400 ? `${data.message.slice(0, 400)}…` : data.message;
      await notifyAdminTelegram(
        `📣 <b>Class broadcast requested</b>\n` +
          `<b>School:</b> ${escapeHtml(schoolName)}\n` +
          `<b>Class:</b> ${escapeHtml(data.className)}\n` +
          `<b>Recipients:</b> ${recipients.length}\n\n` +
          `<b>Message:</b>\n${escapeHtml(preview)}`,
      );
    } catch {
      /* non-blocking */
    }

    return { success: true, recipients: recipients.length };
  });


export const listRoster = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("school_rosters")
      .select("id, full_name, class_name, created_at")
      .order("class_name", { ascending: true })
      .order("full_name", { ascending: true });
    if (error) throw error;
    return { roster: data ?? [] };
  });

export const bulkAddRoster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { entries: Array<{ fullName: string; className?: string }> }) => {
      if (!Array.isArray(input?.entries)) throw new Error("Invalid payload");
      const entries = input.entries
        .map((e) => ({
          fullName: (e.fullName ?? "").trim().slice(0, 160),
          className: (e.className ?? "").trim().slice(0, 80) || null,
        }))
        .filter((e) => e.fullName.length >= 2);
      if (entries.length === 0) throw new Error("No valid names found");
      if (entries.length > 1000) throw new Error("Limit is 1000 students per upload");
      return { entries };
    },
  )
  .handler(async ({ data, context }) => {
    const schoolName = await getMySchool(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = data.entries.map((e) => ({
      school_admin_id: context.userId,
      school_name: schoolName,
      full_name: e.fullName,
      class_name: e.className,
    }));
    const { data: inserted, error } = await supabaseAdmin
      .from("school_rosters")
      .insert(rows)
      .select("id");
    if (error) throw error;
    return { added: inserted?.length ?? 0 };
  });

export const removeRosterEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Missing id");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("school_rosters")
      .delete()
      .eq("id", data.id)
      .eq("school_admin_id", context.userId);
    if (error) throw error;
    return { success: true };
  });

/** Verify a manual cash payment a student paid at the school. */
export const verifySchoolPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      studentId: string;
      courseId: string;
      courseName: string;
      level: "certificate" | "diploma";
      amount: number;
    }) => {
      if (!input?.studentId) throw new Error("Pick a student");
      if (!input?.courseName?.trim()) throw new Error("Course name is required");
      if (input.level !== "certificate" && input.level !== "diploma") throw new Error("Invalid level");
      const amount = Number(input.amount);
      if (!Number.isFinite(amount) || amount < 0 || amount > 1000) throw new Error("Invalid amount");
      return { ...input, amount };
    },
  )
  .handler(async ({ data, context }) => {
    const schoolName = await getMySchool(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Look up student profile + roster class
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email, school_name, class_name")
      .eq("id", data.studentId)
      .maybeSingle();
    if (!profile) throw new Error("Student not found");
    if ((profile.school_name ?? "").trim().toLowerCase() !== schoolName.trim().toLowerCase()) {
      throw new Error("This student is not assigned to your school");
    }

    const studentClass = profile.class_name as string | null;

    // Block duplicates
    const { data: existing } = await supabaseAdmin
      .from("certificate_payments")
      .select("id")
      .eq("user_id", data.studentId)
      .eq("course_id", data.courseId)
      .eq("certificate_type", data.level)
      .in("payment_status", ["paid_pending_admin", "noted", "certificate_sent"]);
    if (existing && existing.length > 0) {
      return { success: false, error: "This student already has a payment for this credential." };
    }

    const certificateId = `EDU-SCH-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabaseAdmin.from("certificate_payments").insert({
      user_id: data.studentId,
      student_name: profile.full_name,
      email: profile.email,
      course_id: data.courseId,
      course_name: data.courseName,
      certificate_type: data.level,
      amount: data.amount,
      payment_status: "paid_pending_admin",
      certificate_id: certificateId,
      source: "school",
      school_name: schoolName,
      class_name: studentClass,
    });
    if (error) throw error;

    // Receipt the school admin can download / print and hand to the payer.
    const issuedAt = new Date().toISOString();
    const receipt = {
      receiptNo: `RC-${certificateId.replace(/^EDU-SCH-/, "")}`,
      issuedAt,
      schoolName,
      className: studentClass,
      studentName: profile.full_name ?? "(unknown)",
      email: profile.email ?? null,
      courseName: data.courseName,
      level: data.level,
      amount: data.amount,
      certificateId,
      method: "Cash (paid at school)",
    };

    // Telegram alert (non-blocking)
    try {
      const { notifyAdminTelegram } = await import("@/lib/notify.server");
      const label = data.level === "diploma" ? "Diploma" : "Certificate";
      await notifyAdminTelegram(
        `🏫 School-cash payment verified\n` +
          `<b>School:</b> ${escapeHtml(schoolName)}\n` +
          (studentClass ? `<b>Class:</b> ${escapeHtml(studentClass)}\n` : "") +
          `<b>Student:</b> ${escapeHtml(profile.full_name ?? "(unknown)")}\n` +
          `<b>Course:</b> ${escapeHtml(data.courseName)} (${label})\n` +
          `<b>Amount:</b> $${data.amount.toFixed(2)}\n` +
          `<b>Cert ID:</b> ${certificateId}`,
      );
    } catch {
      /* never block payment recording */
    }

    return { success: true, certificateId, receipt };
  });

export const createSchoolAdminInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
.inputValidator((input: { schoolName: string; email: string; fullName?: string; role?: string }) => {
    const email = (input?.email ?? "").trim().toLowerCase();
    const schoolName = (input?.schoolName ?? "").trim();
    if (schoolName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("School name and valid email are required");
    const role = input.role === "school_finance" || input.role === "school_viewer" ? input.role : "school_manager";
    return { schoolName, email, fullName: (input.fullName ?? "").trim().slice(0, 120) || null, role };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: school, error: schoolError } = await supabaseAdmin.from("contracted_schools").select("id, school_name").eq("normalized_name", data.schoolName.toLowerCase()).maybeSingle();
    if (schoolError) throw schoolError;
    if (!school) throw new Error("That school is not in the contracted schools list");
    const token = crypto.randomUUID();
    const tokenHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const hash = Array.from(new Uint8Array(tokenHash)).map((b) => b.toString(16).padStart(2, "0")).join("");
    const { data: invite, error } = await supabaseAdmin.from("school_admin_invitations").insert({ school_id: school.id, email: data.email, full_name: data.fullName, requested_role: data.role, access_token_hash: hash }).select("id, expires_at").single();
    if (error) throw error;
    return { id: invite.id, url: `/school-admin-invite/${token}`, expiresAt: invite.expires_at };
  });

export const submitSchoolAdminInvitation = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; email: string; fullName: string; phone?: string; role?: string }) => {
    if (!input?.token || input.token.length < 20) throw new Error("Invalid invitation");
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(input.email)) throw new Error("Valid email is required");
    if (input.fullName.trim().length < 2) throw new Error("Full name is required");
    return { ...input, email: input.email.trim().toLowerCase(), fullName: input.fullName.trim().slice(0, 120), phone: (input.phone ?? "").trim().slice(0, 40) || null };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data.token));
    const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
    const { data: invite, error } = await supabaseAdmin.from("school_admin_invitations").select("id, email, status, expires_at").eq("access_token_hash", hash).maybeSingle();
    if (error) throw error;
    if (!invite || invite.status !== "pending" || new Date(invite.expires_at) < new Date()) throw new Error("This invitation is unavailable or expired");
    if (invite.email !== data.email) throw new Error("Use the invited email address");
    const { error: updateError } = await supabaseAdmin.from("school_admin_invitations").update({ full_name: data.fullName, payload: { phone: data.phone, role: data.role ?? "school_manager" } }).eq("id", invite.id);
    if (updateError) throw updateError;
    return { success: true };
  });

export const listSchoolPaymentReconciliation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("school_payment_reconciliation").select("*").order("gross_amount", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const listSchoolAdminInvitations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("school_admin_invitations").select("id, school_id, email, full_name, requested_role, status, expires_at, submitted_at, created_at, contracted_schools(school_name)").order("created_at", { ascending: false });
    if (error) throw error;
    return { invitations: data ?? [] };
  });

export const approveSchoolAdminInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { invitationId: string }) => { if (!input?.invitationId) throw new Error("Invitation is required"); return input; })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invite, error } = await supabaseAdmin.from("school_admin_invitations").select("*").eq("id", data.invitationId).single();
    if (error || !invite || invite.status !== "pending") throw new Error("Invitation is no longer pending");
    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({ email: invite.email, email_confirm: true, user_metadata: { full_name: invite.full_name, signup_type: "school_admin" } });
    if (authError || !created.user) throw new Error(authError?.message ?? "Could not create administrator account");
    const { data: school } = await supabaseAdmin.from("contracted_schools").select("school_name").eq("id", invite.school_id).single();
    const { error: adminError } = await supabaseAdmin.from("school_admins").insert({ user_id: created.user.id, school_id: invite.school_id, school_name: school?.school_name, contact_name: invite.full_name, created_by: context.userId });
    if (adminError) { await supabaseAdmin.auth.admin.deleteUser(created.user.id); throw adminError; }
    await supabaseAdmin.from("user_roles").upsert({ user_id: created.user.id, role: "school_admin" }, { onConflict: "user_id,role" });
    await supabaseAdmin.from("school_admin_permissions").insert(["manage_roster","view_progress","verify_payments","view_reports","manage_invites"].map((permission) => ({ user_id: created.user.id, school_id: invite.school_id, permission, granted_by: context.userId })));
    await supabaseAdmin.from("school_admin_invitations").update({ status: "approved", approved_user_id: created.user.id, reviewed_by: context.userId, reviewed_at: new Date().toISOString() }).eq("id", invite.id);
    return { success: true, userId: created.user.id };
  });

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Class-level analytics: counts and revenue grouped by class_name. */
export const getSchoolClassAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const schoolName = await getMySchool(context);
    const target = schoolName.trim().toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profilesRes, rosterRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, school_name, signup_type"),
      supabaseAdmin
        .from("school_rosters")
        .select("normalized_name, class_name")
        .eq("school_admin_id", context.userId),
    ]);
    const profiles = (profilesRes.data ?? []).filter(
      (p) =>
        (p.school_name ?? "").trim().toLowerCase() === target &&
        (p as any).signup_type !== "school_admin",
    );
    const ids = profiles.map((p) => p.id);
    const rosterClassByName = new Map<string, string | null>();
    for (const r of rosterRes.data ?? []) {
      rosterClassByName.set(r.normalized_name as string, (r.class_name as string | null) ?? null);
    }

    const [progRes, payRes] = await Promise.all([
      ids.length
        ? supabaseAdmin
            .from("course_progress")
            .select("user_id, is_completed")
            .in("user_id", ids)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabaseAdmin
            .from("certificate_payments")
            .select("user_id, amount, certificate_type, payment_status")
            .in("user_id", ids)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    type Bucket = {
      className: string;
      students: number;
      coursesStarted: number;
      coursesCompleted: number;
      certificatesPaid: number;
      diplomasPaid: number;
      revenue: number;
    };
    const buckets = new Map<string, Bucket>();
    const get = (cls: string) => {
      let b = buckets.get(cls);
      if (!b) {
        b = {
          className: cls,
          students: 0,
          coursesStarted: 0,
          coursesCompleted: 0,
          certificatesPaid: 0,
          diplomasPaid: 0,
          revenue: 0,
        };
        buckets.set(cls, b);
      }
      return b;
    };

    const classByUser = new Map<string, string>();
    for (const p of profiles) {
      const cls = rosterClassByName.get((p.full_name ?? "").trim().toLowerCase()) ?? "Unassigned";
      classByUser.set(p.id, cls);
      get(cls).students += 1;
    }
    for (const row of (progRes.data as any[]) ?? []) {
      const cls = classByUser.get(row.user_id);
      if (!cls) continue;
      const b = get(cls);
      b.coursesStarted += 1;
      if (row.is_completed) b.coursesCompleted += 1;
    }
    for (const row of (payRes.data as any[]) ?? []) {
      const cls = classByUser.get(row.user_id);
      if (!cls) continue;
      if (!["paid_pending_admin", "noted", "certificate_sent"].includes(row.payment_status)) continue;
      const b = get(cls);
      b.revenue += Number(row.amount ?? 0);
      if (row.certificate_type === "diploma") b.diplomasPaid += 1;
      else b.certificatesPaid += 1;
    }

    const classes = Array.from(buckets.values()).sort((a, b) =>
      a.className.localeCompare(b.className),
    );
    const totals = classes.reduce(
      (acc, b) => ({
        students: acc.students + b.students,
        coursesStarted: acc.coursesStarted + b.coursesStarted,
        coursesCompleted: acc.coursesCompleted + b.coursesCompleted,
        certificatesPaid: acc.certificatesPaid + b.certificatesPaid,
        diplomasPaid: acc.diplomasPaid + b.diplomasPaid,
        revenue: acc.revenue + b.revenue,
      }),
      { students: 0, coursesStarted: 0, coursesCompleted: 0, certificatesPaid: 0, diplomasPaid: 0, revenue: 0 },
    );
    return { schoolName, classes, totals };
  });
