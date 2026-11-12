import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HeatGuard | Realtime Thermal Surveillance Matrix',
  description: 'Industrial-grade Realtime Thermal Monitoring Dashboard for 1,000+ IoT Heat Sensors',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-slate-100 antialiased tech-grid-bg">
        {children}
      </body>
    </html>
  );
}
