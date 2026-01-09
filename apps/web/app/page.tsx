'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, FileText, Users, History, Link2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HomePage() {
  return (
    <div className="h-screen overflow-hidden bg-background selection:bg-primary/20 flex flex-col">
      {/* Hero Section - Split Layout */}
      <main className="flex-1 flex flex-col lg:flex-row relative">
        {/* Subtle background decoration */}
        <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-30">
          <div className="absolute -top-24 -left-24 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        </div>

        {/* Left Column: Content */}
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 xl:px-24">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8"
          >
            <Image
              src="/docnex_logo.png"
              alt="DOCNEX"
              width={180}
              height={45}
              className="w-auto h-12"
              priority
            />
          </motion.div>

          {/* Tagline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-foreground mb-6 text-balance leading-[1.1]"
          >
            La Próxima Generación de<br />
            <span className="text-primary italic">Documentación Inteligente</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg lg:text-xl text-muted-foreground mb-8 max-w-xl leading-relaxed"
          >
            Plataforma cognitiva diseñada para la precisión y la trazabilidad en documentos técnicos y legales complejos.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 mb-12"
          >
            <Link
              href="/documents"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full text-lg font-semibold hover:scale-105 transition-all shadow-lg shadow-primary/20 group"
            >
              Comenzar ahora
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-card text-foreground border border-border rounded-full text-lg font-semibold hover:bg-accent transition-all"
            >
              Configuración
            </Link>
          </motion.div>

          {/* Features Grid - Compact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 gap-4 max-w-lg"
          >
            {[
              { icon: FileText, title: "Edición Cognitiva" },
              { icon: History, title: "Control de Versiones" },
              { icon: Users, title: "Workspace Unido" },
              { icon: Link2, title: "Nodos de Datos" }
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border/50 group hover:bg-muted transition-colors">
                <feature.icon className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">{feature.title}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right Column: Infographic */}
        <div className="hidden lg:flex flex-1 items-center justify-center p-8 lg:p-12 xl:p-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring", damping: 20 }}
            className="w-full h-full relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/10 via-accent/5 to-transparent rounded-[2rem] blur-2xl" />
            <div className="relative w-full h-full bg-card/50 backdrop-blur-sm border border-border/50 p-2 rounded-[2rem] shadow-2xl overflow-hidden group">
              <Image
                src="/docnex_infographic.png"
                alt="Proceso DOCNEX"
                fill
                className="object-contain p-4 group-hover:scale-[1.02] transition-transform duration-700"
                priority
              />
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer - Compact */}
      <footer className="py-6 px-8 border-t border-border/40 bg-background/50 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/docnex_logo.png"
            alt="DOCNEX"
            width={80}
            height={20}
            className="w-auto h-5 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all"
          />
          <span className="text-xs text-muted-foreground font-medium">
            &copy; 2026 DOCNEX. Inteligencia Documental.
          </span>
        </div>
        <div className="flex gap-6">
          <Link href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">Términos</Link>
          <Link href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">Privacidad</Link>
        </div>
      </footer>
    </div>
  );
}
