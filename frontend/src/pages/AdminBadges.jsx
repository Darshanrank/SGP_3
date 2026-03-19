import { useEffect, useState } from 'react';
import { createBadge, assignBadge, getBadges } from '../services/meta.service';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';

const AdminBadges = () => {
    const { user } = useAuth();
    const [badges, setBadges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', condition: '' });
    const [assignForm, setAssignForm] = useState({ userId: '', badgeId: '' });

    const load = async () => {
        setLoading(true);
        try {
            const data = await getBadges();
            setBadges(Array.isArray(data) ? data : data?.badges || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!createForm.name || !createForm.condition) return;
        setSaving(true);
        try {
            const created = await createBadge(createForm);
            setBadges((prev) => [created?.badge || created || createForm, ...prev]);
            setCreateForm({ name: '', condition: '' });
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleAssign = async (e) => {
        e.preventDefault();
        if (!assignForm.userId || !assignForm.badgeId) return;
        setSaving(true);
        try {
            await assignBadge({ badgeId: assignForm.badgeId, userId: assignForm.userId });
            setAssignForm({ userId: '', badgeId: '' });
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (user && user.role !== 'ADMIN') return <div>Admin access required.</div>;

    return (
        <div className="page-shell">
            <header className="flex items-center justify-between gap-3">
                <h1 className="page-title">Admin Badges</h1>
                <Button onClick={load} disabled={loading}>Refresh</Button>
            </header>

            <form onSubmit={handleCreate} className="section-card space-y-4">
                <h2 className="section-title">Create Badge</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input label="Name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required />
                    <Input label="Condition" value={createForm.condition} onChange={(e) => setCreateForm({ ...createForm, condition: e.target.value })} required />
                </div>
                <div className="flex justify-end">
                    <Button type="submit" disabled={saving}>Create</Button>
                </div>
            </form>

            <form onSubmit={handleAssign} className="section-card space-y-4">
                <h2 className="section-title">Assign Badge</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input label="User ID" value={assignForm.userId} onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })} required />
                    <Input label="Badge ID" value={assignForm.badgeId} onChange={(e) => setAssignForm({ ...assignForm, badgeId: e.target.value })} required />
                    <div className="flex items-end">
                        <Button type="submit" disabled={saving}>Assign</Button>
                    </div>
                </div>
            </form>

            <h2 className="section-title">Badges</h2>

            {loading ? <div>Loading badges...</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {badges.length === 0 ? <p className="text-[#8DA0BF]">No badges yet.</p> : badges.map((b) => (
                        <div key={b.id || b.name} className="section-card">
                            <p className="font-semibold text-[#DCE7F5]">{b.name}</p>
                            <p className="text-sm text-[#8DA0BF]">{b.condition}</p>
                            <p className="text-xs text-[#8DA0BF]">ID: {b.id}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminBadges;
