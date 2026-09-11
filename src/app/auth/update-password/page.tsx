"use client";

import { useActionState } from "react";
import { updatePasswordAction } from "@/app/auth/actions";
import { authInitialState } from "@/lib/auth/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";

export default function UpdatePasswordPage() {
  const dict = useUiDictionary();
  const [state, formAction, pending] = useActionState(updatePasswordAction, authInitialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.auth.setNewPasswordTitle}</CardTitle>
        <CardDescription>{dict.auth.updatePasswordSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{dict.auth.newPassword}</Label>
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
            {pending ? dict.auth.saving : dict.auth.savePassword}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
