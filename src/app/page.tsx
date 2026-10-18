import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  ClipboardList,
  Compass,
  LineChart,
  Moon,
  ShieldCheck,
  Sparkles,
  Utensils,
} from "lucide-react";
import { Disclaimer } from "@/components/disclaimer";
import { buttonClass } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/constants";

const STEPS = [
  {
    icon: ClipboardList,
    title: "3 分钟建立基线",
    text: "填写作息、饮食、活动、情绪和既往情况，系统算出 BMI、睡眠债与活动量基线。",
  },
  {
    icon: LineChart,
    title: "每天 30 秒记录",
    text: "三餐概况、睡眠、步数、压力、排便，点选即可。记录越连续，判断越准确。",
  },
  {
    icon: Sparkles,
    title: "拿到带出处的报告",
    text: "规则引擎给出 7 个维度评分，AI 结合权威指南写成可执行建议，每条结论标注来源。",
  },
  {
    icon: CalendarCheck2,
    title: "7 天计划 + 周复盘",
    text: "把建议拆成每天 2-4 个小任务，打卡追踪完成率，每周对比评分变化再调整。",
  },
];

const SOURCES = [
  "《中国居民膳食指南（2022）》",
  "《中国居民膳食营养素参考摄入量（2023 版）》",
  "《中国成人超重和肥胖症预防控制指南》",
  "WHO《身体活动与久坐行为指南（2020）》",
  "《中国人群身体活动指南（2021）》",
  "《中国成人失眠诊断与治疗指南》",
  "《中国慢性便秘专家共识意见》",
  "《中国高血压防治指南（2024 年修订版）》",
  "《中国 2 型糖尿病防治指南》",
  "抑郁与焦虑障碍基层诊疗指南",
];

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white">
            <Compass className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold">{APP_NAME}</span>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/today" className={buttonClass("primary", "sm")}>
              进入今日记录
            </Link>
          ) : (
            <>
              <Link href="/login" className={buttonClass("ghost", "sm")}>
                登录
              </Link>
              <Link href="/register" className={buttonClass("primary", "sm")}>
                免费开始
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-14 pt-8 md:pt-16">
        <div className="max-w-2xl animate-fade-up">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            基于权威指南，不做医学诊断
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            把饮食、作息和身体信号，
            <br />
            变成一份看得懂的健康计划
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
            记录你每天真正发生的事，系统从饮食结构、睡眠、活动、体重、消化、情绪和烟酒咖啡因七个维度打分，
            并引用膳食指南、睡眠与运动指南等资料，给出可执行的 7 天改善计划。
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href={user ? "/today" : "/register"} className={buttonClass("primary", "lg")}>
              {user ? "继续记录" : "开始建立健康档案"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={user ? "/report" : "/login"} className={buttonClass("outline", "lg")}>
              查看我的报告
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted">无需下载 App，手机浏览器即可使用。</p>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Utensils, label: "饮食结构", value: "蔬菜 / 水果 / 全谷 / 蛋白质" },
            { icon: Moon, label: "睡眠与恢复", value: "时长 / 规律性 / 入睡困难" },
            { icon: LineChart, label: "活动与体态", value: "每周 150 分钟 / BMI / 腰围" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-line bg-white p-4">
                <Icon className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-medium">{item.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{item.value}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-line bg-white/60 py-14">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-xl font-semibold">它怎么工作</h2>
          <p className="mt-1 text-sm text-muted">规则负责量化，AI 负责解释，知识库负责依据。</p>
          <div className="mt-7 grid gap-5 md:grid-cols-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="flex gap-4 rounded-2xl border border-line bg-white p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">
                      <span className="mr-1.5 text-muted">{String(index + 1).padStart(2, "0")}</span>
                      {step.title}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">建议从哪里来</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              知识库由以下公开指南的结构化摘编组成。报告里的每条结论都标注了文档与章节，可以展开核对原文。
              摘编可能省略上下文，具体建议请以原文为准。
            </p>
            <ul className="mt-5 grid gap-2 text-sm text-muted sm:grid-cols-2">
              {SOURCES.map((source) => (
                <li key={source} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                  {source}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5">
            <h3 className="text-sm font-semibold">我们不做的事</h3>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-muted">
              <li>不做疾病诊断，不给处方药、剂量或保健品推荐。</li>
              <li>不把“没记录”当成“不健康”，数据不足时会明确提示。</li>
              <li>不出售健康数据，不用于广告投放。</li>
              <li>识别到红旗症状时，直接建议你就医，而不是继续自我调理。</li>
            </ul>
            <div className="mt-5 border-t border-line pt-4">
              <Link href="/register" className={buttonClass("secondary", "md", "w-full")}>
                建立我的健康档案
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-line py-8">
        <div className="mx-auto max-w-5xl px-4">
          <Disclaimer />
          <p className="mt-4 text-xs text-muted">
            {APP_NAME} · 健康管理与生活方式建议工具 · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
