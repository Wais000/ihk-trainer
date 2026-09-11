"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction } from "@/app/auth/actions";
import { authInitialState } from "@/lib/auth/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";

export default function LoginPage() {
  const dict = useUiDictionary();
  const [state, formAction, pending] = useActionState(signInAction, authInitialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.auth.loginTitle}</CardTitle>
        <CardDescription>{dict.auth.loginSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{dict.auth.email}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{dict.auth.password}</Label>
              <Link href="/auth/reset-password" className="text-sm text-primary hover:underline">
                {dict.auth.forgotPassword}
              </Link>
            </div>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={pending} className="mt-2">
            {pending ? dict.auth.signingIn : dict.auth.loginCta}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {dict.auth.noAccountYet}{" "}
          <Link href="/auth/register" className="text-primary hover:underline">
            {dict.auth.registerCta}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
