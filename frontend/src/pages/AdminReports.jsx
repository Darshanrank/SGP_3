import { useEffect, useState } from 'react';
import { getReports, updateReportStatus } from '../services/meta.service';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

const statusOptions = ['PENDING', 'RESOLVED', 'DISMISSED'];

const AdminReports = () => {
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await getReports();
            setReports(Array.isArray(data) ? data : data?.reports || []);
        } catch (e) {
            console.error(e);
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
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    if (user && user.role !== 'ADMIN') return <div>Admin access required.</div>;
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
                                <p className="text-xs text-[#8DA0BF]">Filed: {new Date(report.createdAt || Date.now()).toLocaleString()}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2 min-w-[160px]">
                                <span className="rounded-full bg-[#0E1620] px-2 py-1 text-xs uppercase tracking-wide text-[#8DA0BF]">{report.status}</span>
                                <select
                                    className="rounded-lg border border-white/10 bg-[#0E1620] px-2 py-1 text-sm text-[#DCE7F5]"
                                    value={report.status}
                                    onChange={(e) => handleStatusChange(report.id, e.target.value)}
                                    disabled={saving}
                                >
                                    {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminReports;
