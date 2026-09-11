"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/app/auth/actions";
import { authInitialState } from "@/lib/auth/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";

export default function ResetPasswordPage() {
  const dict = useUiDictionary();
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, authInitialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.auth.resetPasswordTitle}</CardTitle>
        <CardDescription>{dict.auth.resetPasswordSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {state.success ? (
          <p role="status" className="text-sm text-success">
            {state.success}
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{dict.auth.email}</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>

            {state.error && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            )}

            <Button type="submit" size="lg" disabled={pending} className="mt-2">
              {pending ? dict.auth.sending : dict.auth.sendLink}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-primary hover:underline">
            {dict.auth.backToLogin}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
