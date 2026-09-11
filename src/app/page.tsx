import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUiDict } from "@/lib/i18n/ui/get-ui-dict.server";

export default async function HomePage() {
  const { dict } = await getUiDict();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <h1 className="text-2xl font-semibold">{dict.auth.appName}</h1>
        <p className="mt-2 max-w-sm text-muted-foreground">{dict.auth.landingIntro}</p>
      </div>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/auth/login">{dict.auth.loginCta}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/auth/register">{dict.auth.registerCta}</Link>
        </Button>
      </div>
    </main>
  );
}
