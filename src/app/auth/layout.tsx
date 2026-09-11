import { getUiDict } from "@/lib/i18n/ui/get-ui-dict.server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { dict } = await getUiDict();
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center text-sm font-medium text-muted-foreground">
          {dict.auth.appName}
        </p>
        {children}
      </div>
    </main>
  );
}
