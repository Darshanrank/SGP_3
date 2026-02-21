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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Admin Reports</h1>
                <Button onClick={load} disabled={loading || saving}>Refresh</Button>
            </div>

            <div className="space-y-3">
                {reports.length === 0 ? <p className="text-gray-500">No reports.</p> : reports.map((report) => (
                    <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start gap-3">
                            <div className="space-y-1">
                                <p className="text-sm text-gray-600">Report ID: {report.id}</p>
                                <p className="font-semibold">{report.reason || report.type}</p>
                                <p className="text-sm text-gray-700">{report.details || report.description}</p>
                                <p className="text-xs text-gray-400">Filed: {new Date(report.createdAt || Date.now()).toLocaleString()}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2 min-w-[160px]">
                                <span className="text-xs uppercase tracking-wide px-2 py-1 rounded bg-gray-100 text-gray-700">{report.status}</span>
                                <select
                                    className="border border-gray-300 rounded px-2 py-1 text-sm"
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
