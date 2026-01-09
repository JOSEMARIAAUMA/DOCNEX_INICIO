import { Sidebar } from '@/components/ui/Sidebar';
import { cn } from '@/lib/utils';
import { Geist, Geist_Mono } from 'next/font/google';

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

interface ShellProps {
    children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
    return (
        <div className={cn(
            "min-h-screen bg-background text-foreground flex font-sans transition-colors duration-300",
            geistSans.variable,
            geistMono.variable
        )}>
            {/* Sidebar Placeholder Space */}
            <div className="w-[72px] hidden md:block shrink-0" />

            {/* Fixed Sidebar */}
            <Sidebar />

            <main className="flex-1 w-full h-screen overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
