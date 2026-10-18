"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { loginAction, registerAction } from "@/lib/actions/auth";
import { EMPTY_FORM_STATE } from "@/lib/actions/state";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="邮箱">
        <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
      </Field>
      <Field label="密码">
        <Input name="password" type="password" autoComplete="current-password" placeholder="至少 8 位" required />
      </Field>
      {state.error ? (
        <p className="flex items-center gap-1.5 rounded-xl bg-danger-soft px-3 py-2 text-xs text-danger">
          <AlertCircle className="h-3.5 w-3.5" />
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        登录
      </Button>
      <p className="text-center text-xs text-muted">
        还没有账号？
        <Link href="/register" className="ml-1 font-medium text-primary">
          免费注册
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="昵称" hint="可留空">
        <Input name="name" autoComplete="nickname" placeholder="怎么称呼你" maxLength={30} />
      </Field>
      <Field label="邮箱">
        <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
      </Field>
      <Field label="密码" hint="至少 8 位">
        <Input name="password" type="password" autoComplete="new-password" placeholder="设置一个密码" minLength={8} required />
      </Field>
      {state.error ? (
        <p className="flex items-center gap-1.5 rounded-xl bg-danger-soft px-3 py-2 text-xs text-danger">
          <AlertCircle className="h-3.5 w-3.5" />
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        创建账号
      </Button>
      <p className="text-center text-xs leading-relaxed text-muted">
        注册即表示你同意我们按《隐私与数据说明》处理你主动填写的健康信息。
      </p>
      <p className="text-center text-xs text-muted">
        已有账号？
        <Link href="/login" className="ml-1 font-medium text-primary">
          直接登录
        </Link>
      </p>
    </form>
  );
}
