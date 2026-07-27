'use client'
import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { InfiniteSlider } from '@/components/ui/infinite-slider'
import { ProgressiveBlur } from '@/components/ui/progressive-blur'
import { cn } from '@/lib/utils'
import { Menu, X, ChevronRight, Activity, HeartPulse, Stethoscope } from 'lucide-react'
import { useScroll, motion, AnimatePresence } from 'framer-motion'
import { BottomNavBar } from '@/components/ui/bottom-nav-bar'
import heroBgVideo from '@/assets/Storyboard_animation_sequence_video_202607272342.mp4'

export function HeroSection({ setView }: { setView: (view: 'landing' | 'login' | 'signup-patient' | 'signup-doctor') => void }) {
    return (
        <div className="w-full">
            <HeroHeader setView={setView} />
            <main className="overflow-hidden w-full">
                <section className="relative w-full min-h-[100vh] flex items-center pt-20">
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute inset-0 size-full object-cover z-0"
                        src={heroBgVideo}
                    ></video>
                    {/* Dark gradient overlay for extreme contrast */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90 z-0"></div>
                    
                    <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-6 lg:px-12">
                        <div className="mx-auto max-w-3xl text-center">
                            <h1 className="mt-8 text-balance text-5xl md:text-6xl xl:text-7xl font-bold text-white leading-tight">
                                Smart EMR & Telehealth
                            </h1>
                            <p className="mt-8 text-balance text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto">
                                A voice-first system that transforms clinician-patient interactions into structured data, diagnoses, and actionable insights.
                            </p>

                            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
                                <Button
                                    onClick={() => setView('signup-patient')}
                                    size="lg"
                                    className="h-12 rounded-full pl-5 pr-3 text-base bg-primary text-primary-foreground hover:bg-primary/90 border-transparent shadow-lg shadow-primary/25">
                                    <span className="text-nowrap">I'm a Patient</span>
                                    <ChevronRight className="ml-1" />
                                </Button>
                                <Button
                                    onClick={() => setView('signup-doctor')}
                                    size="lg"
                                    className="h-12 rounded-full px-5 text-base bg-transparent border border-white/30 text-white shadow-sm hover:bg-white/20 backdrop-blur-md transition-all">
                                    <span className="text-nowrap">I'm a Clinician</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
                <section className="bg-background pb-12 mt-12 w-full">
                    <div className="group relative m-auto w-full px-6 max-w-7xl">
                        <div className="flex flex-col items-center md:flex-row w-full">
                            <div className="md:max-w-44 md:border-r md:pr-6 border-border shrink-0">
                                <p className="text-end text-sm text-muted-foreground">Powering the best hospitals</p>
                            </div>
                            <div className="relative py-6 md:w-[calc(100%-11rem)] overflow-hidden">
                                <InfiniteSlider
                                    speedOnHover={20}
                                    speed={40}
                                    gap={112}>
                                    <div className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
                                        <img className="h-6 w-auto grayscale" src="https://upload.wikimedia.org/wikipedia/commons/f/fb/Mayo_Clinic_logo.svg" alt="Mayo Clinic" />
                                    </div>
                                    <div className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
                                        <img className="h-6 w-auto grayscale" src="https://upload.wikimedia.org/wikipedia/commons/e/e0/Johns_Hopkins_University_logo.svg" alt="Johns Hopkins" />
                                    </div>
                                    <div className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
                                        <img className="h-6 w-auto grayscale" src="https://upload.wikimedia.org/wikipedia/en/e/eb/Cleveland_Clinic_Logo.svg" alt="Cleveland Clinic" />
                                    </div>
                                    <div className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
                                        <img className="h-6 w-auto grayscale" src="https://upload.wikimedia.org/wikipedia/commons/9/91/Mount_Sinai_Hospital_logo.svg" alt="Mount Sinai" />
                                    </div>
                                    <div className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
                                        <img className="h-6 w-auto grayscale" src="https://upload.wikimedia.org/wikipedia/commons/8/87/UCSF_logo.svg" alt="UCSF" />
                                    </div>
                                    <div className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
                                        <img className="h-5 w-auto grayscale" src="https://upload.wikimedia.org/wikipedia/commons/7/7b/Stanford_Medicine_logo.svg" alt="Stanford Medicine" />
                                    </div>
                                </InfiniteSlider>

                                <div className="bg-gradient-to-r from-background absolute inset-y-0 left-0 w-20"></div>
                                <div className="bg-gradient-to-l from-background absolute inset-y-0 right-0 w-20"></div>
                            </div>
                        </div>
                    </div>
                </section>
                
                {/* Mobile Bottom Navigation mapping to home views */}
                <BottomNavBar 
                  className="lg:hidden" 
                  onNavClick={(action) => {
                    if (['landing', 'login', 'signup-patient', 'signup-doctor'].includes(action)) {
                      setView(action as any);
                    } else if (['features', 'doctors', 'patients'].includes(action)) {
                      document.getElementById(action)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }} 
                />
            </main>
        </div>
    )
}

const menuItems = [
    { name: 'Features', href: '#features' },
    { name: 'How to use for Doctors', href: '#doctors' },
    { name: 'How to use for Patients', href: '#patients' },
]

const HeroHeader = ({ setView }: { setView: (view: 'landing' | 'login' | 'signup-patient' | 'signup-doctor') => void }) => {
    const [scrolled, setScrolled] = React.useState(false)
    const [registerMenuOpen, setRegisterMenuOpen] = React.useState(false)
    const { scrollY } = useScroll()

    React.useEffect(() => {
        const unsubscribe = scrollY.on('change', (latest) => {
            setScrolled(latest > (typeof window !== 'undefined' ? window.innerHeight * 0.9 : 800))
        })
        return () => unsubscribe()
    }, [scrollY])

    return (
        <header className="fixed top-6 left-0 right-0 z-50 hidden md:flex justify-center px-4 w-full">
            <nav className={cn(
                "flex items-center justify-between w-full max-w-5xl transition-all duration-500",
                scrolled ? "bg-white/70 backdrop-blur-3xl border border-black/10 rounded-full px-4 py-2 shadow-2xl" 
                         : "bg-black/10 backdrop-blur-md border border-white/5 rounded-full px-6 py-3"
            )}>
                {/* Logo Area */}
                <div
                    onClick={() => setView('landing')}
                    className="flex flex-shrink-0 items-center space-x-2 cursor-pointer transition-transform hover:scale-105">
                    <div className="bg-primary/20 p-2 rounded-full backdrop-blur-sm">
                        <Activity className="w-5 h-5 text-primary drop-shadow-md" />
                    </div>
                    <span className={cn("font-bold text-xl ml-1 tracking-wide transition-colors", scrolled ? "text-foreground" : "text-white")}>Smart EMR</span>
                </div>

                {/* Centered Navigation Links with gooey pill container */}
                <div className="flex-1 flex justify-center">
                    <ul className={cn("flex items-center gap-1 p-1 rounded-full shadow-inner transition-colors", scrolled ? "bg-black/5 border border-black/5" : "bg-white/5 border border-white/5")}>
                        {menuItems.map((item, index) => (
                            <li key={index}>
                                <a
                                    href={item.href}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        document.getElementById(item.href.substring(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}
                                    className={cn("px-5 py-2 rounded-full text-sm font-medium hover:shadow-sm transition-all duration-300 block",
                                        scrolled ? "text-foreground/70 hover:text-foreground hover:bg-white" 
                                                 : "text-white/70 hover:text-white hover:bg-white/15"
                                    )}>
                                    {item.name}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Auth Actions */}
                <div className="flex flex-shrink-0 items-center space-x-2">
                    <Button
                        onClick={() => setView('login')}
                        variant="ghost"
                        className={cn("rounded-full px-5 transition-all", scrolled ? "text-foreground hover:bg-black/5" : "text-white/80 hover:text-white hover:bg-white/10")}>
                        Sign In
                    </Button>
                    <div 
                        className="relative"
                        onMouseEnter={() => setRegisterMenuOpen(true)}
                        onMouseLeave={() => setRegisterMenuOpen(false)}
                    >
                        <Button
                            className="rounded-full px-5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:shadow-primary/40 border-transparent flex items-center gap-1">
                            Register
                            <motion.svg 
                                animate={{ rotate: registerMenuOpen ? 180 : 0 }} 
                                className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </motion.svg>
                        </Button>
                        <AnimatePresence>
                            {registerMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute right-0 top-full mt-2 w-48 rounded-2xl p-2 bg-background/95 backdrop-blur-3xl border border-border/50 shadow-2xl flex flex-col gap-1 z-[100]"
                                >
                                    <button 
                                        onClick={() => setView('signup-patient')}
                                        className="text-left px-3 py-2.5 text-sm font-medium rounded-xl hover:bg-muted/50 transition-colors flex items-center gap-3 group text-foreground"
                                    >
                                        <HeartPulse className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                                        For Patients
                                    </button>
                                    <button 
                                        onClick={() => setView('signup-doctor')}
                                        className="text-left px-3 py-2.5 text-sm font-medium rounded-xl hover:bg-muted/50 transition-colors flex items-center gap-3 group text-foreground"
                                    >
                                        <Stethoscope className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                                        For Doctors
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </nav>
        </header>
    )
}

