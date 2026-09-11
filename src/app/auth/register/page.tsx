"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction } from "@/app/auth/actions";
import { authInitialState } from "@/lib/auth/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";

export default function RegisterPage() {
  const dict = useUiDictionary();
  const [state, formAction, pending] = useActionState(signUpAction, authInitialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.auth.registerTitle}</CardTitle>
        <CardDescription>{dict.auth.registerSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {state.success ? (
          <p role="status" className="text-sm text-success">
            {state.success}
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="displayName">{dict.auth.name}</Label>
              <Input id="displayName" name="displayName" type="text" autoComplete="name" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{dict.auth.email}</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{dict.auth.password}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <p className="text-xs text-muted-foreground">{dict.auth.minPasswordLength}</p>
            </div>

            {state.error && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            )}

            <Button type="submit" size="lg" disabled={pending} className="mt-2">
              {pending ? dict.auth.creatingAccount : dict.auth.registerCta}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {dict.auth.alreadyRegistered}{" "}
          <Link href="/auth/login" className="text-primary hover:underline">
            {dict.auth.loginCta}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
