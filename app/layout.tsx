import React from 'react';
import '../styles/globals.css';

export const metadata = {
  title: 'FAOS v5.0 - Central Operating Dashboard',
  description: 'Powered by Aigorithm & TAC Core Brain',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn">
      <body className="bg-slate-900 text-slate-100 font-sans antialiased selection:bg-cyan-500 selection:text-slate-900">
        <div className="flex min-h-screen flex-col backdrop-blur-md">
          {/* Main Dashboard Control Console */}
          <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
