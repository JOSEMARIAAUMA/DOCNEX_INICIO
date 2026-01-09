'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/UiCard";
import { Button } from "@/components/ui/UiButton";
import { FileText, Settings as SettingsIcon, Shield, Users, Sun, Moon, Monitor } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();

    const themes = [
        { id: 'light', label: 'Claro', icon: Sun },
        { id: 'dark', label: 'Oscuro', icon: Moon },
        { id: 'system', label: 'Sistema', icon: Monitor },
    ];

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="mb-12">
                <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">Configuración</h1>
                <p className="text-lg text-muted-foreground">Administra las preferencias de tu espacio de trabajo y la apariencia de la plataforma.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {/* Theme Selector - Chrome Style */}
                <Card className="md:col-span-2 lg:col-span-3 bg-card border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <SettingsIcon className="w-5 h-5 text-primary" />
                            Apariencia
                        </CardTitle>
                        <CardDescription>
                            Personaliza cómo se ve DOCNEX en tu dispositivo.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4 p-1 bg-muted rounded-xl w-fit">
                            {themes.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                        theme === t.id
                                            ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                                            : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                                    )}
                                >
                                    <t.icon className="w-4 h-4" />
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border hover:border-primary/30 transition-all shadow-sm group">
                    <CardHeader>
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <CardTitle className="text-xl">Análisis Estratégico</CardTitle>
                        <CardDescription className="text-muted-foreground">
                            Hoja de ruta, visión y ventajas competitivas del producto.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/settings/strategic-analysis">
                            <Button className="w-full">
                                Ver Análisis
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border opacity-70 grayscale shadow-sm">
                    <CardHeader>
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                            <Users className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-xl">Colaboradores</CardTitle>
                        <CardDescription>
                            Gestiona los miembros de tu equipo (Próximamente).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button disabled className="w-full" variant="secondary">
                            Próximamente
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border opacity-70 grayscale shadow-sm">
                    <CardHeader>
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                            <Shield className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-xl">Seguridad</CardTitle>
                        <CardDescription>
                            Ajustes de privacidad y auditoría (Próximamente).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button disabled className="w-full" variant="secondary">
                            Próximamente
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
