import React from 'react';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#121214] text-gray-100 flex flex-col">
      {/* Container principal ocupando a largura total sem barra lateral */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}