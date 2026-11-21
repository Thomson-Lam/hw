import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xs flex-col justify-center px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
