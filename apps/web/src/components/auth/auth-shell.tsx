'use client';

import { motion } from 'framer-motion';
import { BookOpen, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen grid lg:grid-cols-[0.9fr_1.1fr] bg-[var(--bg-primary)]">
      <section className="hidden lg:flex relative overflow-hidden p-14 bg-[#101820] text-white">
        <div className="absolute inset-0 bg-[url('/images.jpg')] bg-cover bg-center opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#101820] via-[#8d1b2c]/90 to-[#d69e2e]/70" />
        <div className="relative z-10 flex flex-col justify-between max-w-lg">
          <Link href="/login" className="flex items-center gap-3 w-fit">
            <span className="grid place-items-center w-11 h-11 rounded-xl bg-white/15 border border-white/20">
              <BookOpen className="w-6 h-6" />
            </span>
            <span className="text-xl font-bold tracking-wide">PNG-SMS</span>
          </Link>
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-yellow-200 mb-5">Papua New Guinea education</p>
            <h1 className="text-4xl font-bold leading-tight mb-5">A clearer way to keep every school day moving.</h1>
            <p className="text-white/75 text-lg leading-relaxed">Secure access for administrators, teachers, parents, and students across your school community.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <ShieldCheck className="w-4 h-4 text-yellow-200" />
            Protected account access
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10 bg-gradient-to-br from-[#fffaf0] via-white to-[#f3f7fa]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <span className="grid place-items-center w-10 h-10 rounded-xl bg-primary text-white"><BookOpen className="w-5 h-5" /></span>
            <span className="font-bold text-lg">PNG-SMS</span>
          </div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-3">{eyebrow}</p>
          <h2 className="text-3xl font-bold mb-2">{title}</h2>
          <p className="text-[var(--text-secondary)] mb-8">{description}</p>
          {children}
        </motion.div>
      </section>
    </main>
  );
}

export function AuthError({ message }: { message: string }) {
  return <div className="mb-5 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">{message}</div>;
}

export function AuthSuccess({ message }: { message: string }) {
  return <div className="mb-5 p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">{message}</div>;
}
