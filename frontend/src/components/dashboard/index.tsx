"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import Chart from "./chart";

export default function Dashboard() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch("/api/transactions/sync", {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok) {
        setSyncResult(`Synced: ${data.saved} new, ${data.skipped} skipped`);
        window.location.reload();
      } else {
        setSyncResult(data.message || "Sync failed");
      }
    } catch (error) {
      setSyncResult("Network error");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <main className="p-5">
      <div className="mb-4 flex items-center gap-4">
        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? "Syncing..." : "Sync Transactions"}
        </Button>
        {syncResult && <span className="text-sm text-gray-400">{syncResult}</span>}
      </div>
      <Chart />
    </main>
  );
}
