"use client";

import React from "react";

type ChipCategory = {
  id: string;
  name: string;
  slug: string;
};

interface CategoryChipsProps {
  categories: ChipCategory[];
  selectedCategory: string; // slug o "todos"
  onSelect: (slug: string) => void;
}

export function CategoryChips({
  categories,
  selectedCategory,
  onSelect,
}: CategoryChipsProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: "none" } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={() => onSelect("todos")}
        className={[
          "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
          selectedCategory === "todos"
            ? "bg-red-600 text-white"
            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700",
        ].join(" ")}
      >
        Todos
      </button>

      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelect(cat.slug)}
          className={[
            "shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            selectedCategory === cat.slug
              ? "bg-red-600 text-white"
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700",
          ].join(" ")}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
