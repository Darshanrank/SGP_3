import { useEffect, useState } from 'react';
import { getReports, moderateReportAction, updateReportStatus } from '../services/safety.service';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const statusOptions = ['OPEN', 'RESOLVED', 'REJECTED'];
const moderationActions = ['WARNING', 'SUSPEND', 'BAN', 'REJECT'];

const AdminReports = () => {
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await getReports();
            setReports(Array.isArray(data) ? data : data?.data || data?.reports || []);
        } catch (e) {
            console.error(e);
            toast.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleStatusChange = async (reportId, status) => {
        setSaving(true);
        try {
            await updateReportStatus(reportId, status);
            setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
            toast.success('Report status updated');
        } catch (e) {
            console.error(e);
            toast.error(e?.response?.data?.message || 'Failed to update report status');
        } finally {
            setSaving(false);
        }
    };

    const handleModerationAction = async (reportId, action) => {
        const reason = action === 'REJECT' ? '' : window.prompt(`Reason for ${action.toLowerCase()} action:`) || '';
        setSaving(true);
        try {
            const updated = await moderateReportAction(reportId, action, reason);
            setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, ...updated } : r)));
            toast.success(`Action ${action.toLowerCase()} applied`);
        } catch (e) {
            console.error(e);
            toast.error(e?.response?.data?.message || 'Failed to apply moderation action');
        } finally {
            setSaving(false);
        }
    };

    if (!user) return <div>Admin access required.</div>;
    if (loading) return <div>Loading reports...</div>;

    return (
        <div className="page-shell">
            <div className="flex items-center justify-between">
                <h1 className="page-title">Admin Reports</h1>
                <Button onClick={load} disabled={loading || saving}>Refresh</Button>
            </div>

            <div className="space-y-3">
                {reports.length === 0 ? <p className="text-[#8DA0BF]">No reports.</p> : reports.map((report) => (
                    <div key={report.id} className="section-card">
                        <div className="flex justify-between items-start gap-3">
                            <div className="space-y-1">
                                <p className="text-sm text-[#8DA0BF]">Report ID: {report.id}</p>
                                <p className="font-semibold text-[#DCE7F5]">{report.reason || report.type}</p>
                                <p className="text-sm text-[#8DA0BF]">{report.details || report.description}</p>
                                <p className="text-sm text-[#8DA0BF]">Reporter: @{report.reporter?.username || 'unknown'} {'->'} Reported: @{report.reportedUser?.username || 'unknown'}</p>
                                <p className="text-xs text-[#8DA0BF]">Filed: {new Date(report.createdAt || Date.now()).toLocaleString()}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2 min-w-40">
                                <span className="rounded-full bg-[#0E1620] px-2 py-1 text-xs uppercase tracking-wide text-[#8DA0BF]">{report.status}</span>
                                <select
                                    className="rounded-lg border border-white/10 bg-[#0E1620] px-2 py-1 text-sm text-[#DCE7F5]"
                                    value={report.status}
                                    onChange={(e) => handleStatusChange(report.id, e.target.value)}
                                    disabled={saving}
                                >
                                    {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <div className="flex flex-wrap justify-end gap-1">
                                    {moderationActions.map((action) => (
                                        <button
                                            key={action}
                                            type="button"
                                            disabled={saving || report.status !== 'OPEN'}
                                            onClick={() => handleModerationAction(report.id, action)}
                                            className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-[#DCE7F5] hover:bg-[#151D27] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {action}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminReports;
