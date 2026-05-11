// src/components/Sidebar.tsx
import React from "react";

interface SidebarProps {
  savedScores: any[];
  onLoadScore: (score: any) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  savedScores,
  onLoadScore,
}) => {
  return (
    <div className="w-full lg:w-64 bg-white p-4 rounded-2xl shadow-lg border h-fit text-gray-800 sticky top-4 z-40 hidden md:block">
      <h3 className="font-extrabold text-lg mb-4 border-b border-gray-200 pb-2 text-gray-900 flex items-center gap-2">
        📁 Mis Obras
      </h3>
      <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
        {savedScores.length === 0 && (
          <p className="text-gray-400 text-sm">No hay obras.</p>
        )}
        {savedScores.map((s) => (
          <button
            key={s.id}
            onClick={() => onLoadScore(s)}
            className="text-left p-3 rounded-lg hover:bg-blue-50 border border-gray-100 transition-all text-gray-800"
          >
            <div className="font-bold truncate text-gray-900 text-sm">
              {s.title}
            </div>
            <div className="text-[10px] text-gray-400">
              {new Date(s.created_at).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
