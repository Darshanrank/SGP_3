import { ChevronDown, ChevronRight } from 'lucide-react';

const panelCardClass = 'rounded-xl border border-white/10 bg-[#111721] p-4 shadow-md transition duration-200 hover:border-blue-500 hover:shadow-lg';
const panelTitleClass = 'text-sm font-medium text-[#DCE7F5]';

const PanelSection = ({ panelKey, collapsed, onToggle, title, icon: Icon, iconClass = 'text-[#7BB2FF]', actions, children }) => {
    return (
        <section className={panelCardClass}>
            <div className="mb-4 flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => onToggle(panelKey)}
                    className="inline-flex items-center gap-2 text-left text-sm font-medium"
                >
                    {collapsed ? (
                        <ChevronRight className="h-4 w-4 text-[#8DA0BF]" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-[#8DA0BF]" />
                    )}
                    <Icon className={`h-4 w-4 ${iconClass}`} />
                    <h2 className={panelTitleClass}>{title}</h2>
                </button>
                {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
            </div>

            {!collapsed ? children : null}
        </section>
    );
};

export default PanelSection;
