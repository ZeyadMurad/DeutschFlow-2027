import React from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Flame,
  Headphones,
  Lightbulb,
  Lock,
  Sparkles,
  Target,
  Tv,
} from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import { useUserData } from '../../context/UserDataContext';
import type { AppSectionId, UILanguage } from '../../types/media';

interface AchievementsAndReportsViewProps {
  lang: UILanguage;
  onNavigate?: (sec: AppSectionId, subTab?: string) => void;
}

export const AchievementsAndReportsView: React.FC<AchievementsAndReportsViewProps> = ({
  lang,
  onNavigate,
}) => {
  const { appConfig } = usePreferences();
  const { learnerProfile, weeklyReport, availableWeeks, loadReportForWeek } = useUserData();

  const reportEnabled = appConfig?.learningConfig?.featureFlags?.weeklyReportEnabled !== false;
  const achievements = learnerProfile?.achievements || [];
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const maxDayMinutes = Math.max(
    15,
    ...(weeklyReport?.dailyBreakdown?.map((d) => d.minutes) || [0])
  );

  return (
    <div className="space-y-6">
      {/* 1. WEEKLY LEARNING REPORT */}
      {reportEnabled && weeklyReport && (
        <section className="df-card rounded-2xl p-4 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#093D38] dark:text-[#E8C35A] inline-flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                <span>تقرير التعلّم الأسبوعي (My Weekly Learning Report)</span>
              </h2>
              <p className="text-xs text-[#52615D] dark:text-[#9EC5BE] mt-0.5 font-mono-num">
                {weeklyReport.weekStartDate} → {weeklyReport.weekEndDate} ({weeklyReport.weekKey})
              </p>
            </div>

            {availableWeeks.length > 0 && (
              <select
                value={weeklyReport.weekKey}
                onChange={(e) => void loadReportForWeek(e.target.value)}
                aria-label="Select week"
                className="px-3 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 dark:border-[#3EF2DF]/25 text-xs font-semibold text-[#172320] dark:text-white"
              >
                {availableWeeks.map((wk) => (
                  <option key={wk} value={wk}>
                    الأسبوع {wk}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Weekly Goal Progress Bar */}
          <div className="rounded-2xl bg-[#FAF7F0] dark:bg-[#041B18]/80 border border-[#0D4A42]/12 dark:border-[#3EF2DF]/22 p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-[#093D38] dark:text-white inline-flex items-center gap-1.5">
                <Target className="w-4 h-4 text-[#D85A40]" />
                <span>الهدف الأسبوعي الفعلي:</span>
              </span>
              <span className="font-mono-num font-bold text-[#093D38] dark:text-[#7FF9EB]">
                {weeklyReport.totalMinutes} / {weeklyReport.weeklyGoalMinutes} دقيقة{' '}
                {weeklyReport.goalAchieved && '✓ تم التحقيق'}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-[#0D4A42]/10 dark:bg-[#3EF2DF]/15 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#093D38] to-[#3EF2DF] transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((weeklyReport.totalMinutes / Math.max(1, weeklyReport.weeklyGoalMinutes)) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Core Real KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-[#FAF7F0] dark:bg-[#041B18]/80 p-3.5">
              <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE]">القراءة / الاستماع / الفيديو</p>
              <p className="text-sm sm:text-base font-bold font-mono-num text-[#093D38] dark:text-[#7FF9EB] mt-1">
                {weeklyReport.readingMinutes}د · {weeklyReport.listeningMinutes}د · {weeklyReport.watchingMinutes}د
              </p>
            </div>
            <div className="rounded-xl bg-[#FAF7F0] dark:bg-[#041B18]/80 p-3.5">
              <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE]">كلمات جديدة / مراجعات</p>
              <p className="text-sm sm:text-base font-bold font-mono-num text-[#D85A40] dark:text-[#FF957E] mt-1">
                +{weeklyReport.newVocabularyAdded} / {weeklyReport.vocabularyReviewed}
              </p>
            </div>
            <div className="rounded-xl bg-[#FAF7F0] dark:bg-[#041B18]/80 p-3.5">
              <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE]">دروس ومعدل الاختبارات</p>
              <p className="text-sm sm:text-base font-bold font-mono-num text-[#B68934] dark:text-[#E8C35A] mt-1">
                {weeklyReport.lessonsCompleted} درس ·{' '}
                {weeklyReport.averageQuizScore !== null ? `${weeklyReport.averageQuizScore}%` : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-[#FAF7F0] dark:bg-[#041B18]/80 p-3.5">
              <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE]">XP الأسبوع والسلسلة</p>
              <p className="text-sm sm:text-base font-bold font-mono-num text-[#093D38] dark:text-[#7FF9EB] mt-1">
                +{weeklyReport.weeklyXp} XP · <Flame className="w-3.5 h-3.5 inline text-[#D85A40]" />{' '}
                {weeklyReport.currentStreak}
              </p>
            </div>
          </div>

          {/* 7-Day Activity Bar Chart */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-[#093D38] dark:text-[#E8C35A]">
              التوزيع اليومي الفعلي خلال الأسبوع (بالدقائق):
            </p>
            <div className="grid grid-cols-7 gap-2 items-end h-32 pt-4 px-2 rounded-2xl bg-[#FAF7F0] dark:bg-[#041B18]/80 border border-[#0D4A42]/10 dark:border-[#3EF2DF]/20">
              {weeklyReport.dailyBreakdown.map((day) => {
                const heightPct = Math.max(6, Math.round((day.minutes / maxDayMinutes) * 100));
                return (
                  <div key={day.dateKey} className="flex flex-col items-center justify-end h-full pb-2 gap-1">
                    <span className="text-[10px] font-mono-num text-[#52615D] dark:text-[#9EC5BE]">
                      {day.minutes > 0 ? `${day.minutes}د` : '0'}
                    </span>
                    <div className="w-full max-w-[28px] flex-1 flex items-end">
                      <div
                        className={`w-full rounded-t-lg transition-all ${
                          day.minutes > 0
                            ? 'bg-gradient-to-t from-[#093D38] to-[#3EF2DF]'
                            : 'bg-[#0D4A42]/12 dark:bg-[#3EF2DF]/12'
                        }`}
                        style={{ height: `${day.minutes > 0 ? heightPct : 8}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono-num text-[#52615D] dark:text-[#9EC5BE]">
                      {day.dateKey.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strongest / Weakest Skills + Top Mistakes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[#FAF7F0] dark:bg-[#041B18]/80 p-4 space-y-2">
              <p className="text-xs font-bold text-[#093D38] dark:text-[#7FF9EB]">تحليل المهارات المبني على الأداء</p>
              <div className="text-xs space-y-1.5">
                <p>
                  <span className="text-[#52615D] dark:text-[#9EC5BE]">أقوى مهارة هذا الأسبوع: </span>
                  <strong className="text-emerald-700 dark:text-[#7FF9EB]">
                    {weeklyReport.strongestSkill || 'يظهر تلقائياً عند تسجيل أول نشاط'}
                  </strong>
                </p>
                <p>
                  <span className="text-[#52615D] dark:text-[#9EC5BE]">مهارة تحتاج لتركيز إضافي: </span>
                  <strong className="text-[#D85A40] dark:text-[#FF957E]">
                    {weeklyReport.weakestSkill || 'لا توجد فجوة مسجلة بعد'}
                  </strong>
                </p>
                <p>
                  <span className="text-[#52615D] dark:text-[#9EC5BE]">دقة القواعد المسجلة: </span>
                  <strong className="font-mono-num">
                    {weeklyReport.grammarAccuracy !== null ? `${weeklyReport.grammarAccuracy}%` : 'لم تُختبر بعد'}
                  </strong>
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#FAF7F0] dark:bg-[#041B18]/80 p-4 space-y-2">
              <p className="text-xs font-bold text-[#D85A40] dark:text-[#FF957E] inline-flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>أكثر الأخطاء تكراراً ({weeklyReport.topMistakes.length})</span>
              </p>
              {weeklyReport.topMistakes.length === 0 ? (
                <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                  لا توجد أخطاء متكررة مسجلة حالياً — ستظهر هنا تلقائياً عند الخطأ في الاختبارات أو البطاقات لتساعدك على المراجعة.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {weeklyReport.topMistakes.map((m) => (
                    <div key={m.id} className="text-xs rounded-lg bg-white dark:bg-[#072B26] p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-german font-semibold truncate" dir="ltr">
                          {m.promptDe}
                        </span>
                        <span className="text-[10px] font-mono-num text-[#D85A40] shrink-0">
                          ×{m.count}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700 dark:text-[#7FF9EB] font-german" dir="ltr">
                        الصحيح: {m.expected}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actionable Data-Backed Recommendations */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-[#093D38] dark:text-[#E8C35A] inline-flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4" />
              <span>توصيات مبنية على بياناتك الأسبوعية:</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {weeklyReport.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-xl bg-[#FAF7F0] dark:bg-[#041B18]/80 border border-[#0D4A42]/12 dark:border-[#3EF2DF]/22 p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[#093D38] dark:text-white">
                      {lang === 'en' ? rec.titleEn : rec.titleAr}
                    </p>
                    <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE]">
                      {lang === 'en' ? rec.reasonEn : rec.reasonAr}
                    </p>
                  </div>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => {
                        if (rec.actionTarget === 'vocabulary') onNavigate('flow-journey', 'vocabulary');
                        else onNavigate(rec.actionTarget);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#093D38] dark:bg-[#E8C35A] text-white dark:text-[#041B18] text-[11px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <span>ابدأ</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 2. ACHIEVEMENTS & BADGES */}
      <section className="df-card rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#093D38] dark:text-[#E8C35A] inline-flex items-center gap-2">
              <Award className="w-5 h-5" />
              <span>الأوسمة والإنجازات ({unlockedCount}/{achievements.length})</span>
            </h2>
            <p className="text-xs text-[#52615D] dark:text-[#9EC5BE] mt-0.5">
              تُمنح هذه الأوسمة تلقائياً بناءً على وقت تعلّمك الفعلي، المفردات، السلسلة اليومية، وإتمام الدروس.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {achievements.map((ach) => {
            const pct = Math.min(
              100,
              Math.round((ach.progressCurrent / Math.max(1, ach.progressTarget)) * 100)
            );
            return (
              <article
                key={ach.id}
                className={`rounded-2xl border p-4 space-y-2.5 transition-all ${
                  ach.unlocked
                    ? 'bg-gradient-to-br from-[#E8C35A]/15 to-[#093D38]/10 border-[#E8C35A]/55'
                    : 'bg-[#FAF7F0] dark:bg-[#041B18]/75 border-[#0D4A42]/12 dark:border-[#3EF2DF]/20 opacity-85'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-[#093D38] dark:text-white">
                      {lang === 'de' ? ach.titleDe : lang === 'en' ? ach.titleEn : ach.titleAr}
                    </p>
                    <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE]">
                      {lang === 'en' ? ach.criteriaEn : ach.criteriaAr}
                    </p>
                  </div>
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      ach.unlocked
                        ? 'bg-[#E8C35A] text-[#041B18]'
                        : 'bg-[#0D4A42]/10 dark:bg-[#3EF2DF]/10 text-[#52615D]'
                    }`}
                  >
                    {ach.unlocked ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono-num">
                    <span className="text-[#52615D] dark:text-[#9EC5BE]">
                      {ach.progressCurrent} / {ach.progressTarget}
                    </span>
                    <span className="font-bold text-[#B68934] dark:text-[#E8C35A]">
                      +{ach.xpBonus} XP
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#0D4A42]/10 dark:bg-[#3EF2DF]/15 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        ach.unlocked ? 'bg-[#E8C35A]' : 'bg-[#093D38] dark:bg-[#3EF2DF]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
