'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const highlights = [
  'Student records',
  'Attendance tracking',
  'School reporting',
  'Parent access',
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section
        className="relative min-h-screen overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/images.jpg')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-red-700/70 to-yellow-500/60" />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-12">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm">
                <span className="text-lg font-bold text-yellow-300">P</span>
              </div>
              <div>
                <p className="text-lg font-bold tracking-wide">PNG-SMS</p>
              </div>
            </div>

            <Link href="/login" className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20">
              Sign in
            </Link>
          </header>

          <div className="flex flex-1 items-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="max-w-2xl"
            >
              <div className="mb-6 inline-flex items-center rounded-full border border-yellow-300/50 bg-yellow-300/10 px-4 py-2 text-sm font-medium text-yellow-100 backdrop-blur-sm">
                Papua New Guinea Education Platform
              </div>

              <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-7xl">
                PNG School
                <span className="block text-yellow-300">Management System</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg text-slate-100/90 sm:text-xl">
                A modern digital platform connecting students, teachers, parents, and schools across Papua New Guinea.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/register"
                    className="inline-flex items-center rounded-xl bg-yellow-400 px-7 py-3.5 text-base font-bold text-slate-900 shadow-lg shadow-yellow-500/20 transition hover:bg-yellow-300"
                  >
                    Get Started
                  </Link>
                </motion.div>

                <Link
                  href="/login"
                  className="inline-flex items-center rounded-xl border border-white/25 bg-white/5 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
                >
                  Existing account
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                {highlights.map((item) => (
                  <span key={item} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-100/90">
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}