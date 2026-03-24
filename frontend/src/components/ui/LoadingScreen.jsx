const LoadingScreen = () => {
    return (
        <div className="flex min-h-[40vh] items-center justify-center py-10">
            <div className="inline-flex items-center gap-3 rounded-lg border border-white/10 bg-[#111721] px-4 py-3 text-sm text-[#8DA0BF]">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2A3D57] border-t-[#0A4D9F]" />
                Loading...
            </div>
        </div>
    );
};

export default LoadingScreen;
