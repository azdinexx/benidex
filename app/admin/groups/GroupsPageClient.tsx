"use client";

import { useState, useTransition } from "react";
import { createGroupAction, renameGroupAction } from "@/app/actions";
import { Plus, Loader2, Pencil, ChevronDown, ChevronUp, X, Lock, ShieldAlert } from "lucide-react";

type Group = {
  id: string;
  name: string;
};

// ─── Edit Panel ───────────────────────────────────────────────────────────────

function GroupEditPanel({
  group,
  onUpdate,
  onClose,
}: {
  group: Group;
  onUpdate: (updated: Group) => void;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [currentName, setCurrentName] = useState(group.name);
  const [password, setPassword] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentName.trim()) return;
    setError("");
    setSuccessMsg("");

    const fd = new FormData();
    fd.append("id", group.id);
    fd.append("name", currentName.trim());
    if (password.trim()) {
      fd.append("password", password.trim());
    }

    startTransition(async () => {
      const res = await renameGroupAction(fd);
      if (res.success && res.data) {
        onUpdate({ id: group.id, name: res.data.name });
        setSuccessMsg("Group updated successfully!");
        setPassword("");
      } else {
        setError(res.error || "Failed to update group.");
      }
    });
  };

  return (
    <tr>
      <td colSpan={3} className="px-6 pb-6 pt-2 bg-slate-50/70 border-b border-slate-100">
        <form onSubmit={handleUpdate} className="max-w-xl bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Pencil size={16} className="text-blue-600" /> Edit Group: {group.name}
            </h3>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Group Name
              </label>
              <input
                required
                value={currentName}
                onChange={(e) => setCurrentName(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                New Password <span className="text-slate-400 font-normal">(leave blank to keep current)</span>
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {error && <p className="text-red-600 text-xs font-medium">{error}</p>}
          {successMsg && <p className="text-green-600 text-xs font-medium">{successMsg}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || (!password.trim() && currentName.trim() === group.name)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-55 transition-colors"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}

// ─── Group Row ────────────────────────────────────────────────────────────────

type AccuracyStat = {
  groupId: string;
  groupName: string;
  totalScanned: number;
  errorsCount: number;
  accuracyRatio: string;
};

function GroupRow({
  group,
  accuracy,
  onUpdate,
}: {
  group: Group;
  accuracy?: AccuracyStat;
  onUpdate: (updated: Group) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${expanded ? "bg-slate-50" : ""}`}>
        <td className="px-6 py-4">
          <p className="font-semibold text-slate-800 text-base">{group.name}</p>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-1.5 text-slate-400 text-sm">
            <Lock size={14} />
            <span className="font-mono text-xs select-none">••••••••</span>
          </div>
        </td>
        <td className="px-6 py-4">
          {accuracy ? (
            <div className="space-y-0.5">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                accuracy.accuracyRatio === "100%" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
              }`}>
                {accuracy.accuracyRatio === "100%" ? "100% Accuracy" : `Accuracy: ${accuracy.accuracyRatio}`}
              </span>
              <p className="text-slate-400 text-xs font-medium">
                {accuracy.totalScanned} items / {accuracy.errorsCount} errors
              </p>
            </div>
          ) : (
            <span className="text-slate-400 text-sm italic">—</span>
          )}
        </td>
        <td className="px-6 py-4 text-right">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 ml-auto px-3.5 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors"
          >
            <Pencil size={12} /> Edit
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </td>
      </tr>
      {expanded && (
        <GroupEditPanel
          group={group}
          onUpdate={(updated) => {
            onUpdate(updated);
          }}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GroupsPageClient({
  initialGroups,
  accuracyStats = [],
}: {
  initialGroups: Group[];
  accuracyStats?: AccuracyStat[];
}) {
  const [groups, setGroups] = useState(initialGroups);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createGroupAction(fd);
      if (res.success && res.data) {
        setGroups((prev) =>
          [...prev, { id: res.data!.id, name: res.data!.name }].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );
        setShowForm(false);
        (e.target as HTMLFormElement).reset();
      } else {
        setFormError(res.error || "Failed to create group");
      }
    });
  };

  const handleUpdate = (updated: Group) => {
    setGroups((prev) =>
      prev
        .map((g) => (g.id === updated.id ? updated : g))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Groups</h1>
          <p className="text-slate-500 mt-1">Create and manage operative teams and credentials</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20"
        >
          <Plus size={16} /> New Group
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm max-w-2xl">
          <h2 className="font-bold text-slate-800 text-lg">Create New Group</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Group Name</label>
              <input
                name="name"
                placeholder="e.g. Group-4"
                required
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Login Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="w-full border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl flex items-center gap-2 border border-red-100">
              <ShieldAlert size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />} Create Group
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {groups.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic">No groups found. Create one to get started.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Group Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Authentication</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Accuracy Stats</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const acc = accuracyStats.find((s) => s.groupId === g.id);
                return (
                  <GroupRow key={g.id} group={g} accuracy={acc} onUpdate={handleUpdate} />
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
