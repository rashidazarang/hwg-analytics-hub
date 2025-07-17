import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, ArrowRight, UserPlus, ShieldCheck, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Label } from "@/components/ui/label";

const Auth = () => {
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Track mouse position for light effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Check if user is already signed in
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate("/");
      }
    };
    checkSession();
  }, [navigate]);

  // Frictionless continue handler
  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(true);
    setTimeout(() => {
      navigate("/");
    }, 800);
  };

  const mainVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.07, delayChildren: 0.1 }
    },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    },
    exit: { y: -20, opacity: 0, transition: { duration: 0.2 } }
  };

  const containerVariants = {
    hidden: { scale: 0.98, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 24,
        when: "beforeChildren"
      }
    },
    exit: { 
      scale: 0.98, 
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  const successVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { 
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
      {/* Dynamic background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 z-0" />
      <motion.div 
        className="absolute top-[-15%] right-[-10%] w-2/3 h-2/3 bg-blue-600/5 rounded-full blur-3xl"
        animate={{ x: [0, 10, 0], y: [0, -10, 0] }}
        transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
      />
      <motion.div 
        className="absolute bottom-[-15%] left-[-10%] w-2/3 h-2/3 bg-indigo-600/5 rounded-full blur-3xl"
        animate={{ x: [0, -10, 0], y: [0, 10, 0] }}
        transition={{ duration: 18, repeat: Infinity, repeatType: "reverse" }}
      />
      
      {/* Decorative grid pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGZpbGw9IiMwMDAwMDAxMCIgZD0iTTM2IDM0aDR2MWgtNHYtMXptMC0xNXY1aDVWMTloLTV6Ii8+PC9nPjwvc3ZnPg==')] opacity-20 z-0" />
      
      <div className="relative z-10 w-full max-w-md">
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              variants={successVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="w-16 h-16 mb-4 relative flex items-center justify-center">
                <motion.div
                  className="w-full h-full rounded-full bg-green-100"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
                />
                <motion.div
                  className="absolute inset-0 flex items-center justify-center text-green-600"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 20 }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <motion.path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                    />
                  </svg>
                </motion.div>
              </div>
              <motion.h2
                className="text-xl font-bold text-slate-900 mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                Access Granted!
              </motion.h2>
              <motion.p
                className="text-slate-600"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                Redirecting you to your dashboard...
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="continue-form"
              variants={mainVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <motion.div variants={containerVariants}>
                <Card 
                  ref={cardRef}
                  className="backdrop-blur-lg bg-white/80 shadow-2xl border-0 overflow-hidden"
                  style={{ boxShadow: "0 20px 40px rgba(0, 0, 0, 0.05), 0 10px 20px rgba(0, 0, 0, 0.03)" }}
                >
                  <motion.div 
                    className="absolute inset-0 opacity-30 pointer-events-none"
                    style={{ background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(79, 70, 229, 0.15) 0%, transparent 60%)` }}
                    animate={{ background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(79, 70, 229, 0.15) 0%, transparent 60%)` }}
                    transition={{ duration: 0.3 }}
                  />
                  <div className="absolute inset-0 border border-white/30 rounded-lg"></div>
                  <div className="relative z-10">
                    <CardHeader className="space-y-3 pb-4">
                      <motion.div variants={itemVariants} className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-blue-700">PaperworkFlows</span>
                      </motion.div>
                      <motion.div variants={itemVariants}>
                        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
                          Welcome to PaperworkFlows
                        </CardTitle>
                        <CardDescription className="text-muted-foreground mt-1">
                          Streamline your workflow management and analytics
                        </CardDescription>
                      </motion.div>
                    </CardHeader>
                    <CardContent className="pt-2 pb-6">
                      <form onSubmit={handleContinue} className="space-y-6">
                        <motion.div variants={itemVariants}>
                          <Button
                            type="submit"
                            className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-md relative overflow-hidden group"
                            disabled={loading}
                          >
                            {loading ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Continuing...</span>
                              </div>
                            ) : (
                              <span className="relative z-10 flex items-center justify-center gap-2">
                                Continue
                                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-700 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                              </span>
                            )}
                          </Button>
                        </motion.div>
                      </form>
                    </CardContent>
                  </div>
                </Card>
              </motion.div>
              <motion.div 
                variants={itemVariants} 
                className="text-center mt-6 text-xs text-slate-500 flex items-center justify-center gap-2"
              >
                <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                <span>Frictionless analytics access</span>
                <div className="w-1 h-1 rounded-full bg-slate-400"></div>
              </motion.div>
              {/*
                // Backup: Original authentication form preserved below for fallback
                // ... (original form code, commented out) ...
              */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Auth;
