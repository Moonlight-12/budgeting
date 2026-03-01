"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Plus, Pencil, Trash2, Check, ChevronDown } from "lucide-react";

interface Category {
  _id: string;
  categoryId: string;
  category: string;
  budget: number;
  color: string;
  upCategories: string[];
}

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function prettify(id: string) {
  return id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// ─── My Categories Tab ────────────────────────────────────────────────────────

function MyCategoriesTab({ categories, onRefresh }: { categories: Category[]; onRefresh: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", color: "#22c55e", budget: "" });
  const [addForm, setAddForm] = useState({ name: "", color: "#22c55e", budget: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const startEdit = (cat: Category) => {
    setEditingId(cat.categoryId);
    setEditForm({ name: cat.category, color: cat.color ?? "#22c55e", budget: String(cat.budget ?? 0) });
  };

  const saveEdit = async (cat: Category) => {
    setSaving(true);
    await fetch(`/api/categories/${cat.categoryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: editForm.name,
        color: editForm.color,
        budget: parseFloat(editForm.budget) || 0,
        icon: cat.icon,
        upCategories: cat.upCategories,
      }),
    });
    setSaving(false);
    setEditingId(null);
    onRefresh();
  };

  const deleteCategory = async (categoryId: string) => {
    setDeleting(categoryId);
    await fetch(`/api/categories/${categoryId}`, { method: "DELETE" });
    setDeleting(null);
    onRefresh();
  };

  const createCategory = async () => {
    if (!addForm.name.trim()) return;
    setSaving(true);
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: slugify(addForm.name),
        category: addForm.name,
        color: addForm.color,
        budget: parseFloat(addForm.budget) || 0,
      }),
    });
    setSaving(false);
    setShowAdd(false);
    setAddForm({ name: "", color: "#22c55e", budget: "" });
    onRefresh();
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <Plus size={14} />
          Add Category
        </button>
      </div>

      {showAdd && (
        <div className="bg-zinc-800 rounded-xl p-4 border border-white/10 space-y-3">
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">New Category</p>
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Name"
              value={addForm.name}
              onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              className="flex-1 min-w-32 bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
            />
            <input
              type="number"
              placeholder="Budget $"
              value={addForm.budget}
              onChange={(e) => setAddForm((f) => ({ ...f, budget: e.target.value }))}
              className="w-28 bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-500">Color</span>
              <input
                type="color"
                value={addForm.color}
                onChange={(e) => setAddForm((f) => ({ ...f, color: e.target.value }))}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createCategory}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              <Check size={13} />
              {saving ? "Saving..." : "Create"}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 text-zinc-400 hover:text-white text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {categories.length === 0 && (
        <p className="text-center text-zinc-600 py-8 text-sm">No categories yet. Add one above.</p>
      )}

      {categories.map((cat) => (
        <div key={cat.categoryId} className="bg-zinc-800 rounded-xl border border-white/8 overflow-hidden">
          {editingId === cat.categoryId ? (
            <div className="p-4 space-y-3">
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="flex-1 min-w-32 bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/25"
                />
                <input
                  type="number"
                  placeholder="Budget $"
                  value={editForm.budget}
                  onChange={(e) => setEditForm((f) => ({ ...f, budget: e.target.value }))}
                  className="w-28 bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-zinc-500">Color</span>
                  <input
                    type="color"
                    value={editForm.color}
                    onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => saveEdit(cat)}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                >
                  <Check size={13} />
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1.5 text-zinc-400 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
              <span className="text-white text-sm font-medium flex-1">{cat.category}</span>
              <span className="text-zinc-500 text-xs">
                {cat.budget > 0 ? `$${cat.budget}/mo` : "no budget"}
              </span>
              <button
                onClick={() => startEdit(cat)}
                className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => deleteCategory(cat.categoryId)}
                disabled={deleting === cat.categoryId}
                className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Up Bank Mapping Tab ──────────────────────────────────────────────────────

function MappingTab({ categories, onRefresh }: { categories: Category[]; onRefresh: () => void }) {
  const [upCategories, setUpCategories] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/transactions/up-categories")
      .then((r) => r.json())
      .then((data) => {
        const upCats: string[] = data.upCategories ?? [];
        setUpCategories(upCats);

        // Build current mapping from categories' upCategories arrays
        const currentMap: Record<string, string> = {};
        for (const cat of categories) {
          for (const upCat of cat.upCategories ?? []) {
            currentMap[upCat] = cat.categoryId;
          }
        }
        // Default unmapped Up Bank categories to themselves if a matching user category exists
        for (const upCat of upCats) {
          if (!currentMap[upCat]) {
            const match = categories.find((c) => c.categoryId === upCat);
            currentMap[upCat] = match ? upCat : "";
          }
        }
        setMappings(currentMap);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [categories]);

  const saveMapping = async () => {
    setSaving(true);
    await fetch("/api/categories/mapping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mappings }),
    });
    setSaving(false);
    onRefresh();
  };

  if (loading) {
    return <p className="text-zinc-500 text-sm text-center py-8">Loading Up Bank categories...</p>;
  }

  if (upCategories.length === 0) {
    return <p className="text-zinc-500 text-sm text-center py-8">No Up Bank categories found. Sync transactions first.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Map each Up Bank category to one of your custom categories. Changes take effect after saving — run Recategorize to update existing transactions.
      </p>

      <div className="space-y-1.5">
        {upCategories.map((upCat) => {
          const current = mappings[upCat] ?? "";
          return (
            <div key={upCat} className="flex items-center gap-3 bg-zinc-800 rounded-xl px-4 py-3 border border-white/8">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{prettify(upCat)}</p>
                <p className="text-xs text-zinc-600 font-mono">{upCat}</p>
              </div>
              <ChevronDown size={14} className="text-zinc-600 flex-shrink-0" />
              <div className="relative">
                <select
                  value={current}
                  onChange={(e) => setMappings((m) => ({ ...m, [upCat]: e.target.value }))}
                  className="appearance-none bg-zinc-900 border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-sm text-white focus:outline-none focus:border-white/25 cursor-pointer"
                >
                  <option value="">— unmapped —</option>
                  {categories.map((cat) => (
                    <option key={cat.categoryId} value={cat.categoryId}>
                      {cat.category}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={saveMapping}
        disabled={saving}
        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Mappings"}
      </button>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function CategoryManager({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"categories" | "mapping">("categories");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(() => {
    setLoading(true);
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 border-l border-white/8 h-full w-full max-w-md flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <h2 className="text-white font-semibold">Category Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/8 shrink-0">
          {(["categories", "mapping"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t
                  ? "text-white border-b-2 border-emerald-500"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t === "categories" ? "My Categories" : "Up Bank Mapping"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="text-zinc-500 text-sm text-center py-8">Loading...</p>
          ) : tab === "categories" ? (
            <MyCategoriesTab categories={categories} onRefresh={fetchCategories} />
          ) : (
            <MappingTab categories={categories} onRefresh={fetchCategories} />
          )}
        </div>
      </div>
    </div>
  );
}
