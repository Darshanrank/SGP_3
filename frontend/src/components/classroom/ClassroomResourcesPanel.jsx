import { ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';

const ClassroomResourcesPanel = ({
    handleAddResource,
    resourceTitle,
    setResourceTitle,
    resourceUrl,
    setResourceUrl,
    savingResource,
    resources,
    handleDeleteResource
}) => (
    <>
        <form onSubmit={handleAddResource} className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <input
                type="text"
                value={resourceTitle}
                onChange={(e) => setResourceTitle(e.target.value)}
                placeholder="Resource title"
                className="rounded-lg border border-white/5 bg-[#0A0F14] px-3 py-2 text-sm text-[#E6EEF8] placeholder:text-[#6F83A3] focus:border-[#0A4D9F] focus:outline-none"
            />
            <input
                type="url"
                value={resourceUrl}
                onChange={(e) => setResourceUrl(e.target.value)}
                placeholder="https://example.com"
                className="rounded-lg border border-white/5 bg-[#0A0F14] px-3 py-2 text-sm text-[#E6EEF8] placeholder:text-[#6F83A3] focus:border-[#0A4D9F] focus:outline-none md:col-span-2"
            />
            <div className="md:col-span-3">
                <Button type="submit" size="sm" disabled={savingResource}>
                    {savingResource ? 'Saving...' : 'Pin Resource'}
                </Button>
            </div>
        </form>

        <div className="mt-4 space-y-2">
            {resources.length === 0 && (
                <p className="text-sm text-[#8DA0BF]">No pinned resources yet.</p>
            )}
            {resources.map((resource) => (
                <div key={resource.id} className="flex items-center justify-between rounded-lg bg-[#151D27] p-3">
                    <div className="min-w-0">
                        <a
                            href={resource.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 truncate text-sm text-[#E6EEF8] hover:text-[#7BB2FF]"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {resource.title}
                        </a>
                        <p className="text-xs text-[#8DA0BF]">Added by {resource.creator?.username || 'User'}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => handleDeleteResource(resource.id)}
                        className="shrink-0 rounded-md p-1.5 text-[#FCA5A5] hover:bg-[#1A2430]"
                        title="Remove resource"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            ))}
        </div>
    </>
);

export default ClassroomResourcesPanel;
