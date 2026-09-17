import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Award, BookOpen, Clock, Star, Users, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { toast } from "sonner";
import {
  getCatalogItem, getCourseTitle, getCourseModules, getCourseContent, getSkills, getCategory,
  type CourseLevel,
} from "@/lib/courses";
import { getCourseIcon } from "@/lib/course-icons";
import { isSpecialCourse, GLOBAL_AHEP, specialCourseLanguage } from "@/lib/special-courses";
import { getCoursePrice } from "@/lib/pricing";
import { pageHead } from "@/lib/site";
import { getCourseImage } from "@/lib/course-images";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { notifyCourseStarted } from "@/lib/tracking.functions";

export const Route = createFileRoute("/course/$id")({
  loader: ({ params }) => {
    const item = getCatalogItem(params.id);
    if (!item) throw notFound();
    return { item };
  },
  head: ({ loaderData, params }) => {
    const item = loaderData?.item;
    if (!item) {
      return pageHead({ title: "Course | Edusanna", description: "Edusanna course", path: `/course/${params.id}` });
    }
    const special = isSpecialCourse(item.id);
    const title = special
      ? `${item.diplomaTitle} | ${GLOBAL_AHEP.name}`
      : `${item.certificateTitle} - Certificate & Diploma | Edusanna`;
    const desc = special
      ? `Study the ${GLOBAL_AHEP.name} diploma (${specialCourseLanguage[item.id]}) free on Edusanna and claim your official diploma for $${getCoursePrice(item.id, "diploma")}.`
      : `Study ${item.certificateTitle} free on Edusanna. Earn a Certificate ($12) or advance to the ${item.diplomaTitle} Diploma ($18).`;
    return pageHead({ title, description: desc, path: `/course/${item.id}`, type: "article" });
  },
  component: CoursePage,
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-3xl font-bold text-blue-900 mb-3">Course not found</h1>
      <Link to="/courses"><Button className="premium-button">Browse all courses</Button></Link>
    </div>
  ),
});

function CoursePage() {
  const { item } = Route.useLoaderData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const special = isSpecialCourse(item.id);
  const [level, setLevel] = useState<CourseLevel>(special ? "diploma" : "certificate");
  const price = getCoursePrice(item.id, level);
  const [enrolling, setEnrolling] = useState(false);

  const Icon = getCourseIcon(item.icon);
  const image = getCourseImage(item);
  const title = getCourseTitle(item, level);
  const modules = getCourseModules(item.id, level);
  const content = getCourseContent(item.id, level);
  const skills = getSkills(item.id, title);
  const category = getCategory(item.category);

  const handleStart = async () => {
    if (!user) {
      navigate({ to: "/auth", search: { mode: "signup" } });
      return;
    }
    setEnrolling(true);
    try {
      const { error } = await supabase.from("enrollments").upsert(
        { user_id: user.id, course_id: item.id, level, course_title: title },
        { onConflict: "user_id,course_id,level" },
      );
      if (error) {
        throw new Error(error.message || "We could not enroll you in this course. Please try again.");
      }
      if (special) {
        void notifyCourseStarted({ data: { courseId: item.id, courseName: title, level } }).catch(() => {});
      }
      navigate({ to: "/learn/$courseId/$level", params: { courseId: item.id, level } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "We could not enroll you in this course. Please try again.");
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteNavbar />

      <section className="pt-32 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <Link to="/courses" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-6">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to courses
          </Link>

          <div className="glass-card-light p-8">
            <div className="flex items-start gap-5">
              {image ? (
                <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-blue-50">
                  <img src={image} alt={`${title} course cover`} loading="eager" fetchPriority="high" decoding="async" width={200} height={200} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-10 h-10 text-white" />
                </div>
              )}
              <div className="flex-1">
                {category && <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">{category.name}</span>}
                <h1 className="text-3xl font-black text-blue-900 mt-1">{title}</h1>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-blue-600">
                  <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {modules.length} modules</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> 3hrs</span>
                  {content?.rating && <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> {content.rating}</span>}
                  {content?.students && <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {content.students.toLocaleString()} learners</span>}
                </div>
              </div>
            </div>

            {/* Level toggle - Global AHEP programmes are diploma only */}
            {special ? (
              <div className="mt-8 rounded-xl border-2 border-teal-200 bg-teal-50/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900">{GLOBAL_AHEP.name} Diploma</span>
                  <span className="font-black text-blue-700">${price}</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  {specialCourseLanguage[item.id]} - diploma only, no certificate version. Flexible payment options available.
                </p>
                <Link to="/global-ahep" className="text-xs font-semibold text-teal-700 underline mt-2 inline-block">
                  About {GLOBAL_AHEP.name}
                </Link>
              </div>
            ) : (
            <div className="flex gap-3 mt-8">
              {(["certificate", "diploma"] as CourseLevel[]).map((lv) => (
                <button
                  key={lv}
                  onClick={() => setLevel(lv)}
                  className={`flex-1 rounded-xl border-2 p-4 text-left transition ${level === lv ? "border-blue-600 bg-blue-50" : "border-blue-100 hover:border-blue-300"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900 capitalize">{lv}</span>
                    <span className="font-black text-blue-700">${getCoursePrice(item.id, lv)}</span>
                  </div>
                  <p className="text-xs text-blue-500 mt-1">{lv === "certificate" ? item.certificateTitle : item.diplomaTitle}</p>
                </button>
              ))}
            </div>
            )}

            <Button onClick={handleStart} disabled={enrolling} className="premium-button w-full mt-6 py-3 text-lg">
              {enrolling && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              {user ? "Start Learning Free" : "Sign up to start learning"}
            </Button>
            {user && (
              <Button
                variant="outline"
                onClick={() => navigate({ to: "/certificate-payment", search: { courseId: item.id, level } })}
                className="w-full mt-3 py-3 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Award className="w-5 h-5 mr-2" /> Get official {level} - ${price}
              </Button>
            )}
            <p className="text-center text-xs text-blue-500 mt-2">
              Learning is free. Pay ${price} only when you're ready for your official {level}.
            </p>
          </div>
        </div>
      </section>

      {content?.description && (
        <section className="px-4 sm:px-6 lg:px-8 pb-8">
          <div className="max-w-5xl mx-auto glass-card-light p-8">
            <h2 className="text-xl font-bold text-blue-900 mb-3">About this course</h2>
            <p className="text-blue-700 leading-relaxed">{content.description}</p>
          </div>
        </section>
      )}

      {skills.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 pb-8">
          <div className="max-w-5xl mx-auto glass-card-light p-8">
            <h2 className="text-xl font-bold text-blue-900 mb-4">Skills you'll gain</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {skills.map((skill) => (
                <div key={skill} className="flex items-center gap-2 text-blue-800">
                  <Award className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <span>{skill}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-5xl mx-auto glass-card-light p-8">
          <h2 className="text-xl font-bold text-blue-900 mb-4">Course curriculum</h2>
          <ol className="space-y-3">
            {modules.map((m, i) => (
              <li key={m.id} className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/60 border border-blue-100">
                <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <div>
                  <h3 className="font-semibold text-blue-900">{m.title}</h3>
                  {m.quiz?.length ? (
                    <span className="text-xs text-purple-600 flex items-center gap-1 mt-1"><CheckCircle2 className="w-3 h-3" /> {m.quiz.length} quiz questions</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
