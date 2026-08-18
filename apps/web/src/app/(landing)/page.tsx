'use client';

import Link from "next/link";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white">

      {/* Hero Section */}

      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: 1.03 }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
        className="relative min-h-screen flex items-center bg-cover bg-center"
        style={{
          backgroundImage: "url('/images.jpg')",
        }}
      >

        {/* PNG color overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-red-700/70 to-yellow-500/60" />


        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1,
            ease: "easeOut"
          }}
          className="relative z-10 max-w-7xl mx-auto px-8 text-white"
        >

          <h1 className="text-5xl font-bold">
            PNG School
            <span className="text-yellow-400">
              {" "}Management System
            </span>
          </h1>


          <p className="mt-5 text-lg max-w-xl text-gray-200">
            A modern digital platform connecting students,
            teachers, parents, and schools across Papua New Guinea.
          </p>



          <motion.div
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >

            <Link
              href="/login"
              className="inline-block mt-8 bg-yellow-400 text-black px-8 py-3 rounded-xl font-bold hover:bg-yellow-300 transition"
            >
              Get Started
            </Link>

          </motion.div>


        </motion.div>


      </motion.div>


    </main>
  );
}