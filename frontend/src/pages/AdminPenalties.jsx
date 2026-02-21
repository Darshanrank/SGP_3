import { useEffect, useState } from 'react';
import { getPenalties, createPenalty } from '../services/meta.service';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';

const AdminPenalties = () => {
    const { user } = useAuth();
    const [penalties, setPenalties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ userId: '', penaltyType: '', reason: '' });

    const load = async () => {
        setLoading(true);
        try {
            const data = await getPenalties();
            setPenalties(Array.isArray(data) ? data : data?.penalties || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.userId || !form.penaltyType || !form.reason) return;
        setSaving(true);
        try {
            const created = await createPenalty(form);
            setPenalties((prev) => [created?.penalty || created || form, ...prev]);
            setForm({ userId: '', penaltyType: '', reason: '' });
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (user && user.role !== 'ADMIN') return <div>Admin access required.</div>;

    return (
        <div className="space-y-5">
            <h1 className="text-2xl font-bold">Admin Penalties</h1>

            <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input label="User ID" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} required />
                    <Input label="Penalty Type" value={form.penaltyType} onChange={(e) => setForm({ ...form, penaltyType: e.target.value })} required />
                    <Input label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
                </div>
                <Button type="submit" disabled={saving}>Add Penalty</Button>
            </form>

            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recent Penalties</h2>
                <Button onClick={load} disabled={loading}>Refresh</Button>
            </div>

            {loading ? <div>Loading penalties...</div> : (
                <div className="space-y-3">
                    {penalties.length === 0 ? <p className="text-gray-500">No penalties found.</p> : penalties.map((p) => (
                        <div key={p.id || `${p.userId}-${p.penaltyType}`} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex justify-between">
                                <div>
                                    <p className="font-semibold">{p.penaltyType}</p>
                                    <p className="text-sm text-gray-600">{p.reason}</p>
                                    <p className="text-xs text-gray-400">User: {p.userId || p.user?.id}</p>
                                </div>
                                <span className="text-xs text-gray-400">{p.createdAt ? new Date(p.createdAt).toLocaleString() : 'Just now'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminPenalties;
