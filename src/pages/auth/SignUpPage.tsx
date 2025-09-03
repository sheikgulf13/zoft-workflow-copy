import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { SubmitHandler } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '../../stores/authStore'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Mail, Lock, User2, Eye, EyeOff } from 'lucide-react'
import { http } from '../../lib/http'
import { toastError, toastSuccess } from '../../components/ui/Toast'
import { ThemeToggle } from '../../components/ui/ThemeToggle'
import { SmudgyBackground } from '../../components/ui'

const schema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  remember: z.boolean().default(false),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type FormValues = z.input<typeof schema>

export default function SignUpPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '', remember: false },
  })
  const { isAuthenticated, restoreSession } = useAuthStore()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => { restoreSession() }, [restoreSession])

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      const baseUrl = getBackendBaseUrl()
      const url = `${baseUrl ? baseUrl.replace(/\/$/, '') : ''}/api/auth/signup`
      const response = await http.post<{ message: string; token: string; user: {
        email: string
        firstName: string
        lastName: string
      } }>(url, {
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
      })

      const data = response.data
      const fullName = `${data.user.firstName} ${data.user.lastName}`.trim()

      // Do not auto sign-in; redirect user to send verification page
      toastSuccess('Account created', `Welcome, ${fullName}. Please verify your email to continue.`)
      navigate('/auth/send-verification')
    } catch (error: unknown) {
      const message = extractAxiosMessage(error) || 'Failed to sign up'
      toastError('Sign up failed', message)
    }
  }

function getBackendBaseUrl(): string {
  const env = import.meta.env as Record<string, string | undefined>
  return env.VITE_BACKEND_API_URL ?? env.BACKEND_API_URL ?? ''
}

function extractAxiosMessage(error: unknown): string | null {
  if (typeof error === 'object' && error && 'response' in error) {
    const err = error as { response?: { data?: { message?: string } } }
    return err.response?.data?.message ?? null
  }
  if (error instanceof Error) return error.message
  return null
}

  return (
    <div className="relative min-h-screen bg-theme-background">
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle variant="dropdown" />
      </div>

      <SmudgyBackground
         colorHex={"#a4f5a6"}
         baseOpacity={0.15}
         zIndex={0} 
      />


      <div className="relative z-10 flex min-h-screen max-h-screen overflow-hidden">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-16 xl:px-24">
          <div className="max-w-md">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#a4f5a6] rounded-2xl mb-6 shadow-lg">
                <span className="text-2xl font-bold text-white">Z</span>
              </div>
              <h1 className="text-4xl font-bold text-theme-primary mb-4 leading-tight">
                Join the
                <br />
                <span className="text-[#a4f5a6]">
                  Zoft Workflow
                </span>
              </h1>
              <p className="text-lg text-theme-secondary leading-relaxed">
                Create your account and start building powerful automations. 
                Join thousands of users who trust Zoft for their workflow needs.
              </p>
            </div>
            
            {/* Feature highlights */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#a4f5a6] rounded-full"></div>
                <span className="text-theme-secondary">Free to get started</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#8dff8d] rounded-full"></div>
                <span className="text-theme-secondary">No credit card required</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#b3a1ff] rounded-full"></div>
                <span className="text-theme-secondary">Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="flex flex-1 flex-col justify-center px-6 py-6 lg:px-12 xl:px-16 max-h-screen overflow-y-auto">
          <div className="mx-auto w-full max-w-md">
            <div className="text-center mb-6 lg:hidden">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#a4f5a6] rounded-xl mb-4">
                <span className="text-lg font-bold text-white">Z</span>
              </div>
              <h1 className="text-2xl font-bold text-theme-primary">Create account</h1>
            </div>

            <div className="hidden lg:block mb-6">
              <h2 className="text-3xl font-bold text-theme-primary mb-2">Get started</h2>
              <p className="text-theme-secondary">Create your account to begin your automation journey</p>
            </div>

            <div className="bg-theme-form backdrop-blur-md rounded-3xl p-6 shadow-lg">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" aria-live="polite">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-theme-secondary">First Name</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                        <User2 size={18} className="text-theme-tertiary group-focus-within:text-theme-primary transition-colors" />
                      </div>
                                          <input
                      type="text"
                      className="block w-full rounded-2xl bg-theme-input px-4 py-2.5 pl-12 text-theme-primary placeholder:text-theme-tertiary transition-all duration-200 focus:bg-theme-input-focus focus:ring-2 focus:ring-theme-primary/20 disabled:cursor-not-allowed disabled:opacity-60 text-base border-0"
                      placeholder="John"
                      autoComplete="given-name"
                      {...register('firstName')}
                    />
                    </div>
                    {errors.firstName && <p className="mt-1 pl-2 text-xs font-medium text-[#ef4a45]">{errors.firstName.message}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-theme-secondary">Last Name</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                        <User2 size={18} className="text-theme-tertiary group-focus-within:text-theme-primary transition-colors" />
                      </div>
                                          <input
                      type="text"
                      className="block w-full rounded-2xl bg-theme-input px-4 py-2.5 pl-12 text-theme-primary placeholder:text-theme-tertiary transition-all duration-200 focus:bg-theme-input-focus focus:ring-2 focus:ring-theme-primary/20 disabled:cursor-not-allowed disabled:opacity-60 text-base border-0"
                      placeholder="Doe"
                      autoComplete="family-name"
                      {...register('lastName')}
                    />
                    </div>
                    {errors.lastName && <p className="mt-1 pl-2 text-xs font-medium text-[#ef4a45]">{errors.lastName.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-theme-secondary">Email Address</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <Mail size={18} className="text-theme-tertiary group-focus-within:text-theme-primary transition-colors" />
                    </div>
                    <input
                      type="email"
                      className="block w-full rounded-2xl bg-theme-input px-4 py-2.5 pl-12 text-theme-primary placeholder:text-theme-tertiary transition-all duration-200 focus:bg-theme-input-focus focus:ring-2 focus:ring-theme-primary/20 disabled:cursor-not-allowed disabled:opacity-60 text-base border-0"
                      placeholder="Enter your email"
                      autoComplete="email"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && <p className="mt-1 pl-2 text-xs font-medium text-[#ef4a45]">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-theme-secondary">Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <Lock size={18} className="text-theme-tertiary group-focus-within:text-theme-primary transition-colors" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="block w-full rounded-2xl bg-theme-input px-4 py-2.5 pl-12 pr-12 text-theme-primary placeholder:text-theme-tertiary transition-all duration-200 focus:bg-theme-input-focus focus:ring-2 focus:ring-theme-primary/20 disabled:cursor-not-allowed disabled:opacity-60 text-base border-0"
                      placeholder="Create a password"
                      autoComplete="new-password"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-theme-tertiary hover:text-theme-primary transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 pl-2 text-xs font-medium text-[#ef4a45]">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-theme-secondary">Confirm Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <Lock size={18} className="text-theme-tertiary group-focus-within:text-theme-primary transition-colors" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className="block w-full rounded-2xl bg-theme-input px-4 py-2.5 pl-12 pr-12 text-theme-primary placeholder:text-theme-tertiary transition-all duration-200 focus:bg-theme-input-focus focus:ring-2 focus:ring-theme-primary/20 disabled:cursor-not-allowed disabled:opacity-60 text-base border-0"
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      {...register('confirmPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-theme-tertiary hover:text-theme-primary transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="mt-1 pl-2 text-xs font-medium text-[#ef4a45]">{errors.confirmPassword.message}</p>}
                </div>

                <div className="flex items-center justify-center">
                  <label className="flex items-center gap-3 text-sm text-theme-secondary cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="checkbox-custom checkbox-signup" 
                      {...register('remember')} 
                    />
                    <span className="group-hover:text-theme-primary transition-colors">I agree to the Terms and Privacy Policy</span>
                  </label>
                </div>

                <button
                  className="w-full bg-[#a4f5a6] hover:bg-[#8dff8d] text-[#222222] font-semibold py-2.5 px-6 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none text-base"
                  type="submit" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Creating account...
                    </div>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              <div className="mt-5 text-center">
                <p className="text-theme-secondary">
                  Already have an account?{' '}
                  <Link 
                    to="/auth/sign-in" 
                    className="font-semibold text-[#a4f5a6] hover:text-[#8dff8d] transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[#a4f5a6] after:transition-all after:duration-200 hover:after:w-full"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


