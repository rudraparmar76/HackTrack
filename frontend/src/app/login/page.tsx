"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Terminal, Mail, Lock, User, Chrome } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();
  const [nextPath, setNextPath] = useState("/dashboard");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next) {
      setNextPath(next);
    }
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back!", description: "Successfully signed in." });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, full_name: name } },
        });
        if (error) throw error;
        toast({ title: "Account created!", description: "Please check your email to verify your account." });
      }
      router.push(nextPath);
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` },
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ backgroundColor: 'var(--bg-void)' }}>
      {/* Nebula background */}
      <div className="hero-nebula" />
      
      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(123,47,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(123,47,255,0.03) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }} />

      <div className="relative w-full max-w-md z-10">
        {/* Terminal Prefix */}
        <div className="dash-terminal justify-center mb-4">
          <span>$ sudo login</span>
          <span className="cursor"></span>
        </div>

        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center" style={{ boxShadow: 'var(--glow-sm)' }}>
            <Terminal className="w-5 h-5 text-purple-400" />
          </div>
          <span className="pixel text-xs text-[#E8EAF0] tracking-wider">
            HACK<span className="text-purple-400">TRACK</span>
          </span>
        </Link>

        {/* Card */}
        <div className="login-card rounded-xl p-8">
          <div className="text-center mb-6">
            <h1 className="pixel text-sm mb-3 text-[#E8EAF0]" style={{ textShadow: '0 0 20px rgba(123,47,255,0.4)' }}>
              {isLogin ? "WELCOME BACK" : "CREATE ACCOUNT"}
            </h1>
            <p className="text-sm mono text-[#8888bb]">
              {isLogin
                ? "Sign in to your hackathon dashboard"
                : "Start tracking your hackathons"}
            </p>
          </div>

          {/* Google OAuth */}
          <Button
            variant="outline"
            className="w-full mb-6 h-11 gap-2 mono text-xs"
            style={{ 
              background: 'rgba(123,47,255,0.08)',
              borderColor: 'rgba(123,47,255,0.25)',
              color: '#E8EAF0'
            }}
            onClick={handleGoogleAuth}
          >
            <Chrome className="w-4 h-4" />
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'rgba(123,47,255,0.2)' }} />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-3 mono text-[#8888bb]" style={{ backgroundColor: 'var(--bg-card)' }}>or continue with email</span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#8888bb] mono text-xs">Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-purple-400/50" />
                  <Input
                    id="name"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 input-terminal"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#8888bb] mono text-xs">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-purple-400/50" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 input-terminal"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#8888bb] mono text-xs">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-purple-400/50" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 input-terminal"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="btn-purple w-full h-11 mono text-xs font-semibold tracking-wider" 
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isLogin ? "SIGNING IN..." : "CREATING ACCOUNT..."}
                </span>
              ) : (
                isLogin ? "SIGN IN →" : "CREATE ACCOUNT →"
              )}
            </Button>
          </form>

          {/* Toggle */}
          <p className="text-center text-sm text-[#8888bb] mt-6 mono">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>

        {/* Bottom text */}
        <p className="text-center text-[10px] mono text-[#8888bb]/50 mt-6">
          // secure auth powered by supabase
        </p>
      </div>
    </div>
  );
}
