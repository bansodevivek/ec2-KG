import React, { useState, useEffect, useRef } from 'react';
import { Lock, User, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { LoginForm } from '../types';
import ThreeScene from './ThreeScene';
import { VEHICLE_INSIGHTS, FLEET_VEHICLES } from '../constants';
import { Vehicle } from '../types';
import logo from '../assets/kg_logo.png';
import sphereLogo from '../assets/image-1768885682144.jpeg';
import whiteLogo from '../assets/white_logo.png';
import gsap from 'gsap';

// Kinetic Green Brand Slogans
const KINETIC_SLOGANS = [
  "Think Electric..... Think KINETIC....",
  "Legacy of Trust, Future of Green",
  "Powered by Humanity. Driven by Planet.",
  "Italian Soul. Indian Heart. Electric Future.",
  "Planet @ Our Heart"
];

interface LoginPageProps {
  loginForm: LoginForm;
  showForgotPassword: boolean;
  darkMode: boolean;
  setLoginForm: (form: LoginForm) => void;
  setShowForgotPassword: (show: boolean) => void;
  handleLogin: (e: React.FormEvent) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({
  loginForm,
  showForgotPassword,
  setLoginForm,
  setShowForgotPassword,
  handleLogin
}) => {
  // Calculate dynamic stats for the hero section
  const totalCo2 = VEHICLE_INSIGHTS.reduce((acc, curr) => acc + curr.co2Saved, 0);
  const activeVehicles = (FLEET_VEHICLES as Vehicle[]).filter(v => v.status === 'active' || v.status === 'charging').length;

  // Show/hide password state
  const [showPassword, setShowPassword] = useState(false);

  // Rotating slogans state
  const [currentSloganIndex, setCurrentSloganIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Animation refs
  const sphereRef = useRef<HTMLImageElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Slogan rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      setIsVisible(false);

      // After fade out, change slogan and fade in
      setTimeout(() => {
        setCurrentSloganIndex((prev) => (prev + 1) % KINETIC_SLOGANS.length);
        setIsVisible(true);
      }, 500); // 500ms for fade out transition

    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, []);

  // GSAP Animations - Premium Motion Effects
  useEffect(() => {
    // Ambient glow pulse around sphere (slow, calming)
    if (glowRef.current) {
      gsap.to(glowRef.current, {
        opacity: 0.6,
        scale: 1.1,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    }

    // Sphere breathing effect (very subtle)
    if (sphereRef.current) {
      gsap.to(sphereRef.current, {
        scale: 1.02,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    }

    // Particle drift animation
    if (particlesRef.current) {
      const particles = particlesRef.current.children;
      Array.from(particles).forEach((particle, i) => {
        gsap.to(particle, {
          x: `+=${Math.random() * 100 - 50}`,
          y: `+=${Math.random() * 100 - 50}`,
          opacity: Math.random() * 0.5 + 0.3,
          duration: Math.random() * 8 + 6,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.2
        });
      });
    }
  }, []);



  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side (Desktop) / Top Side (Mobile) - Visual Branding Section (65%) */}
      <div className="w-full lg:w-[65%] bg-gradient-to-br from-green-900 via-green-950 to-black relative overflow-hidden flex flex-col items-center justify-center p-8 min-h-[45vh] lg:min-h-screen order-1">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-pulse animation-delay-2000"></div>

        {/* Light Streaks - Subtle EV Energy Flow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-1 h-96 bg-gradient-to-b from-transparent via-green-400/30 to-transparent animate-light-streak" style={{ top: '10%', left: '20%', animationDelay: '0s' }} />
          <div className="absolute w-1 h-96 bg-gradient-to-b from-transparent via-teal-400/30 to-transparent animate-light-streak" style={{ top: '40%', right: '30%', animationDelay: '3s' }} />
          <div className="absolute w-1 h-96 bg-gradient-to-b from-transparent via-emerald-400/20 to-transparent animate-light-streak" style={{ top: '60%', left: '40%', animationDelay: '6s' }} />
        </div>

        {/* Center Content */}
        <div className="relative z-10 text-center w-full max-w-2xl">
          {/* 3D Sphere & Badges Container */}
          <div className="relative w-72 h-72 sm:w-80 sm:h-80 lg:w-[32rem] lg:h-[32rem] mx-auto mb-8">

            {/* Ambient Glow Layer - Behind Sphere */}
            <div
              ref={glowRef}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                filter: 'blur(80px)',
                opacity: 0.4,
                transform: 'scale(0.9)'
              }}
            >
              <div className="w-full h-full rounded-full bg-gradient-to-r from-green-400 via-teal-400 to-emerald-500" />
            </div>

            {/* Floating Particles - Decorative Background */}
            <div ref={particlesRef} className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${i % 2 === 0 ? '#10b981' : '#14b8a6'}, transparent)`,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    opacity: 0.4,
                    boxShadow: `0 0 ${4 + Math.random() * 6}px ${i % 2 === 0 ? '#10b981' : '#14b8a6'}`
                  }}
                />
              ))}
            </div>

            {/* Central 3D Sphere */}
            <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: '1000px' }}>
              <img
                ref={sphereRef}
                src={sphereLogo}
                alt="Kinetic Green Sphere"
                className="w-full h-full object-contain drop-shadow-2xl"
                style={{
                  filter: 'drop-shadow(0 0 50px rgba(34, 197, 94, 0.6))',
                  animation: 'rotate3D 20s linear infinite, floatSlow 6s ease-in-out infinite',
                  transformStyle: 'preserve-3d',
                  borderRadius: '50%'
                }}
              />
            </div>

            {/* Badge: Live Tracking (Top Left) */}
            <div className="absolute top-[10%] left-[0%] lg:top-[15%] lg:left-[5%] bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-xl animate-float animation-delay-500">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white font-medium text-xs lg:text-sm">Live Tracking</span>
              </div>
            </div>

            {/* Badge: Active Vehicles (Top Right) */}
            <div className="absolute top-[15%] right-[0%] lg:top-[20%] lg:right-[5%] bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 shadow-xl animate-float animation-delay-1500">
              <div className="text-white text-left">
                <div className="text-xl lg:text-2xl font-bold leading-none">{activeVehicles.toLocaleString()}</div>
                <div className="text-[10px] lg:text-xs text-green-200 font-medium mt-1">Active Vehicles</div>
              </div>
            </div>

            {/* Badge: CO2 Saved (Bottom Center) */}
            <div className="absolute bottom-[5%] left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 shadow-xl animate-float animation-delay-2500 w-max">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🌱</span>
                <span className="text-white font-semibold text-sm lg:text-base">{totalCo2.toLocaleString()} g CO₂ Saved</span>
              </div>
            </div>
          </div>

          {/* Text Content (Hidden on very small screens to save space, visible on tablet+) */}
          <div className="hidden sm:block">
            <p
              className={`text-lg lg:text-xl text-green-100/90 font-light max-w-md mx-auto mb-8 leading-relaxed transition-all duration-500 ease-in-out ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-2'
                }`}
            >
              <b>{KINETIC_SLOGANS[currentSloganIndex]}</b>
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap justify-center gap-3">


              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm border border-white/10">
                🚀 Real-time GPS
              </div>
              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm border border-white/10">
                📊 Live Analytics
              </div>
              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm border border-white/10">
                ⚡ EV Monitoring
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side (Desktop) / Bottom Side (Mobile) - Login Form Section (35%) */}
      <div className="w-full lg:w-[35%] bg-gradient-to-b from-gray-900 to-slate-900 flex items-center justify-center p-6 lg:p-12 min-h-[55vh] lg:min-h-screen order-2 shadow-2xl z-20">
        <div className="w-full max-w-sm space-y-8">
          {!showForgotPassword ? (
            <>
              {/* Logo and Header */}
              <div className="text-center">
                <div className="flex flex-col items-center justify-center mb-6">
                  <div className="w-20 h-20 mb-3 bg-white/5 rounded-2xl p-3 border border-white/10 backdrop-blur-sm shadow-inner">
                    <img src={whiteLogo} alt="Kinetic Green" className="w-full h-full object-contain" />
                  </div>
                  <h1 className="text-2xl font-bold text-white tracking-wide">Kinetic Green</h1>
                  <p className="text-xs text-green-500 font-medium tracking-wider uppercase mt-1">Planet @ Our Heart</p>
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                <p className="text-slate-400 text-sm">Sign in to access your dashboard</p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1 uppercase tracking-wide">Username</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-500 group-focus-within:text-green-500 transition-colors" />
                      </div>
                      <input
                        type="text"
                        value={loginForm.username}
                        onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
                        onFocus={(e) => {
                          gsap.to(e.currentTarget, {
                            boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.1), 0 0 20px rgba(34, 197, 94, 0.3)',
                            duration: 0.3,
                            ease: "power2.out"
                          });
                        }}
                        onBlur={(e) => {
                          gsap.to(e.currentTarget, {
                            boxShadow: 'none',
                            duration: 0.3,
                            ease: "power2.out"
                          });
                        }}
                        className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-lg leading-5 bg-slate-800/50 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all duration-200 sm:text-sm"
                        placeholder="Enter your username"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1 uppercase tracking-wide">Password</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-green-500 transition-colors" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
                        onFocus={(e) => {
                          gsap.to(e.currentTarget, {
                            boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.1), 0 0 20px rgba(34, 197, 94, 0.3)',
                            duration: 0.3,
                            ease: "power2.out"
                          });
                        }}
                        onBlur={(e) => {
                          gsap.to(e.currentTarget, {
                            boxShadow: 'none',
                            duration: 0.3,
                            ease: "power2.out"
                          });
                        }}
                        className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-lg leading-5 bg-slate-800/50 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all duration-200 sm:text-sm"
                        placeholder="••••••••"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="text-slate-400 hover:text-slate-300 transition-colors p-1"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      type="checkbox"
                      checked={loginForm.rememberMe}
                      onChange={(e) => setLoginForm({ ...loginForm, rememberMe: e.target.checked })}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-slate-600 rounded bg-slate-700"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-400">
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="font-medium text-green-500 hover:text-green-400 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <button
                  ref={submitBtnRef}
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-slate-900 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group"
                  onMouseEnter={(e) => {
                    gsap.to(e.currentTarget, {
                      boxShadow: '0 0 30px rgba(34, 197, 94, 0.6), 0 0 60px rgba(34, 197, 94, 0.3)',
                      duration: 0.3,
                      ease: "power2.out"
                    });
                  }}
                  onMouseLeave={(e) => {
                    gsap.to(e.currentTarget, {
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                      duration: 0.3,
                      ease: "power2.out"
                    });
                  }}
                >
                  <span className="relative z-10">Sign In</span>
                  {/* Button glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                </button>
              </form>

              {/* Demo Credentials Accordion/Card */}
              <div className="mt-6 border-t border-slate-800 pt-6">
                <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-800 border-b border-slate-700/50 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Test User Credentials</span>
                    <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded">Demo</span>
                  </div>
                  <div className="p-3 max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                    <div className="flex justify-between items-center text-xs p-2 hover:bg-slate-700/50 rounded transition-colors cursor-default group">
                      <div>
                        <p className="text-white font-medium group-hover:text-green-400 transition-colors">Super Admin</p>
                        <p className="text-slate-500">admin / admin123</p>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-red-500"></div>
                    </div>
                    <div className="flex justify-between items-center text-xs p-2 hover:bg-slate-700/50 rounded transition-colors cursor-default group">
                      <div>
                        <p className="text-white font-medium group-hover:text-blue-400 transition-colors">OEM User</p>
                        <p className="text-slate-500">oem_user / oem123</p>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    </div>
                    <div className="flex justify-between items-center text-xs p-2 hover:bg-slate-700/50 rounded transition-colors cursor-default group">
                      <div>
                        <p className="text-white font-medium group-hover:text-purple-400 transition-colors">Research</p>
                        <p className="text-slate-500">research / rnd123</p>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                    </div>
                    <div className="flex justify-between items-center text-xs p-2 hover:bg-slate-700/50 rounded transition-colors cursor-default group">
                      <div>
                        <p className="text-white font-medium group-hover:text-orange-400 transition-colors">Dealer</p>
                        <p className="text-slate-500">dealer / dealer123</p>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                    </div>
                    <div className="flex justify-between items-center text-xs p-2 hover:bg-slate-700/50 rounded transition-colors cursor-default group">
                      <div>
                        <p className="text-white font-medium group-hover:text-yellow-400 transition-colors">Rider</p>
                        <p className="text-slate-500">driver / driver123</p>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                    </div>
                  </div>
                </div>
              </div>

            </>
          ) : (
            <>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="mb-6 text-green-500 hover:text-green-400 font-semibold flex items-center group transition-colors"
              >
                <ArrowRight className="w-4 h-4 mr-1 rotate-180 group-hover:-translate-x-1 transition-transform text-green-500" />
                Back to Login
              </button>
              <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
              <p className="text-slate-400 mb-8">Enter your email to receive reset instructions</p>

              <form className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1 uppercase tracking-wide">Email Address</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-green-500 transition-colors" />
                    </div>
                    <input
                      type="email"
                      className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-lg leading-5 bg-slate-800/50 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all duration-200 sm:text-sm"
                      placeholder="admin@kineticgreen.com"
                      id="reset-email"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const email = (document.getElementById('reset-email') as HTMLInputElement)?.value;
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (email && emailRegex.test(email.trim())) {
                      alert('Reset link sent!');
                    } else {
                      alert('Please enter a valid email address to receive the reset link.');
                    }
                  }}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-slate-900 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Send Reset Link
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
