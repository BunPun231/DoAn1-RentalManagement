import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Search, RefreshCw, AlertCircle, Activity } from "lucide-react";
import { auditService, type AuditLogResult } from "@/services/reportService";
import { extractError } from "@/lib/api";

const ACTION_VARIANT: Record<string, "danger" | "success" | "warning" | "default"> = {
  DELETE: "danger",
  CREATE: "success",
  UPDATE: "default",
  LOGIN: "default",
  LOGOUT: "default",
  DEACTIVATE: "warning",
  REACTIVATE: "success",
};

function getActionBadge(action: string) {
  const key = action?.toUpperCase() ?? "";
  const variant = Object.keys(ACTION_VARIANT).find((k) => key.includes(k));
  return (
    <Badge variant={variant ? ACTION_VARIANT[variant] : "default"}>
      {action}
    </Badge>
  );
}

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await auditService.list(page, 20, {
        from: fromDate || undefined,
      });
      setLogs(result.content);
      setTotalPages(result.totalPages);
      setError(null);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [page, fromDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filtered = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.action?.toLowerCase().includes(q) ||
      log.entityType?.toLowerCase().includes(q) ||
      log.actorRole?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-brand-ink">Nhật ký hoạt động</h1>
          <p className="text-sm text-slate-500 mt-1">Audit Log — giám sát toàn bộ thao tác hệ thống</p>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={loading}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="audit-search"
              type="text"
              placeholder="Tìm kiếm theo hành động, đối tượng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:border-brand-deep focus:outline-none focus:ring-2 focus:ring-brand-deep/20 transition-all"
            />
          </div>
          <input
            id="audit-from-date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep bg-white"
          />
        </div>

        {error ? (
          <div className="p-8 flex flex-col items-center text-center">
            <AlertCircle size={32} className="text-red-400 mb-3" />
            <p className="text-slate-600 text-sm">{error}</p>
            <Button className="mt-4" size="sm" onClick={fetchLogs}>Thử lại</Button>
          </div>
        ) : loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-deep border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 flex flex-col items-center text-center">
            <Activity size={40} className="text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">Chưa có nhật ký nào</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Người dùng</TableHead>
                <TableHead>Hành động</TableHead>
                <TableHead>Đối tượng</TableHead>
                <TableHead>ID đối tượng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => (
                <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="text-xs text-slate-400 whitespace-nowrap">
                    {log.timestamp
                      ? new Date(log.timestamp).toLocaleString("vi-VN")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-brand-ink">
                      {log.actorId?.slice(0, 8) ?? "-"}
                    </div>
                    <div className="text-xs text-slate-400">{log.actorRole}</div>
                  </TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {log.entityType ?? "-"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-400">
                    {log.entityId ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Trước
            </Button>
            <span className="px-4 py-1.5 text-sm text-slate-600">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              Sau
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
