import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050b10] px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
        <p className="text-sm font-medium text-emerald-400">Private system</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Artipilot Private Dashboard
        </h1>
        <p className="mt-3 text-slate-400">Secure access only</p>
        <LoginForm />
      </div>
    </main>
  );
}
