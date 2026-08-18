'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', form);

      console.log("FULL RESPONSE:", response.data);

      const { user, accessToken } = response.data.data;

      console.log("USER BEFORE REDIRECT:", user);

      login(user, accessToken);

      switch (user.role) {
        case 'super_admin':
          router.push('/admin/dashboard');
          break;

        case 'school_admin':
          router.push('/admin/dashboard');
          break;

        case 'teacher':
          router.push('/teacher/dashboard');
          break;

        case 'parent':
          router.push('/parent/dashboard');
          break;

        case 'student':
          router.push('/dashboard');
          break;

        default:
          router.push('/dashboard');
      }

    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response?: {
            data?: {
              error?: {
                message?: string;
              };
            };
          };
        };

        setError(
          axiosErr.response?.data?.error?.message ||
          'Invalid email or password'
        );

      } else {
        setError('An unexpected error occurred');
      }

    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex">


      {/* LEFT SIDE - PNG IMAGE DESIGN */}
      <div
        className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 bg-cover bg-center"
        style={{
          backgroundImage: "url('/images.jpg')",
        }}
      >

        {/* PNG FLAG COLOR OVERLAY */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-red-700/70 to-yellow-500/60" />


        {/* CONTENT */}
        <div className="relative z-10 max-w-md text-white">


          <div className="flex items-center gap-3 mb-8">

            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <BookOpen className="w-7 h-7 text-white" />
            </div>

            <span className="text-2xl font-bold">
              PNG-SMS
            </span>

          </div>


          <h1 className="text-4xl font-bold mb-6">
            Welcome Back to PNG School Management
          </h1>


          <p className="text-lg text-gray-200 mb-8">
            Access your school dashboard, manage students,
            track attendance, and generate reports.
          </p>



          <div className="space-y-4">

            {[
              'Real-time attendance tracking',
              'Automated report cards',
              'Parent communication portal',
              'Multi-school support',
            ].map((item) => (

              <div key={item} className="flex items-center gap-3">

                <div className="w-2 h-2 bg-yellow-400 rounded-full" />

                <span>
                  {item}
                </span>

              </div>

            ))}

          </div>


        </div>


      </div>





      {/* RIGHT SIDE - LOGIN FORM */}

      {/* RIGHT SIDE - LOGIN FORM */}

<div
  className="flex-1 flex items-center justify-center p-8 bg-cover bg-center relative"
  style={{
    backgroundImage: "linear-gradient(135deg, rgba(0,0,0,0.85), rgba(220,38,38,0.75), rgba(250,204,21,0.65))",
  }}
>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >


          {/* MOBILE LOGO */}

          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">

            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">

              <BookOpen className="w-6 h-6 text-white" />

            </div>

            <span className="text-xl font-bold">
              PNG-SMS
            </span>

          </div>





          <div className="text-center mb-8">

            <h2 className="text-2xl font-bold mb-2">
              Sign In
            </h2>


            <p className="text-[var(--text-secondary)]">
              Enter your credentials to access your account
            </p>

          </div>





          {error && (

            <div className="mb-6 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">

              {error}

            </div>

          )}






          <form onSubmit={handleSubmit} className="space-y-5">


            <div>

              <label className="label">
                Email Address
              </label>


              <input
                type="email"
                className="input-field"
                placeholder="you@school.edu.pg"
                value={form.email}
                onChange={(e)=>setForm({
                  ...form,
                  email:e.target.value
                })}
                required
              />

            </div>





            <div>

              <label className="label">
                Password
              </label>


              <div className="relative">

                <input

                  type={showPassword ? 'text':'password'}

                  className="input-field pr-10"

                  placeholder="Enter your password"

                  value={form.password}

                  onChange={(e)=>setForm({
                    ...form,
                    password:e.target.value
                  })}

                  required

                />



                <button

                  type="button"

                  className="absolute right-3 top-1/2 -translate-y-1/2"

                  onClick={()=>setShowPassword(!showPassword)}

                >

                  {showPassword ?

                    <EyeOff className="w-4 h-4"/>

                    :

                    <Eye className="w-4 h-4"/>

                  }


                </button>


              </div>


            </div>






            <div className="flex items-center justify-between">


              <label className="flex items-center gap-2">

                <input type="checkbox"/>

                <span className="text-sm">
                  Remember me
                </span>

              </label>




              <Link
                href="/forgot-password"
                className="text-sm text-primary"
              >
                Forgot Password?
              </Link>


            </div>






            <button

              type="submit"

              className="btn-primary w-full py-3"

              disabled={isLoading}

            >

              {isLoading ? (

                <span className="flex justify-center items-center gap-2">

                  <Loader2 className="w-4 h-4 animate-spin"/>

                  Signing in...

                </span>

              ):(

                'Sign In'

              )}


            </button>




          </form>






          <p className="mt-8 text-center text-sm">

            Don&apos;t have an account?{' '}

            <span className="text-primary">
              Contact your school administrator
            </span>

          </p>






          <div className="mt-8 p-4 rounded-lg bg-[var(--bg-secondary)] border">


            <p className="text-xs font-medium mb-3">
              Demo Credentials
            </p>


            <div className="space-y-2 text-xs">

              <p>
                <strong>Super Admin:</strong> admin@png-sms.com / Admin123!
              </p>


              <p>
                <strong>School Admin:</strong> principal@pomdemo.edu.pg / School123!
              </p>


              <p>
                <strong>Teacher:</strong> sarah.teaching@pomdemo.edu.pg / Teacher123!
              </p>


            </div>


          </div>



        </motion.div>


      </div>



    </div>
  );
}