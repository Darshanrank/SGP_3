const EmptyState = ({ icon: Icon, title, description, action }) => (
    <div className="py-16 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#0E1620]">
            <Icon className="h-8 w-8 text-[#8DA0BF]" />
        </div>
        <h3 className="font-semibold text-[#DCE7F5]">{title}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-[#8DA0BF]">{description}</p>
        {action && <div className="mt-4">{action}</div>}
    </div>
);

export default EmptyState;
