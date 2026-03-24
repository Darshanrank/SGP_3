const prefetchedRoutes = new Set();

const routeImporters = {
    '/': () => import('../pages/Home'),
    '/login': () => import('../pages/Login'),
    '/register': () => import('../pages/Register'),
    '/dashboard': () => import('../pages/Dashboard'),
    '/discover': () => import('../pages/DiscoverSkills'),
    '/skills': () => import('../pages/MySkills'),
    '/swaps': () => import('../pages/Swaps'),
    '/calendar': () => import('../pages/Calendar'),
    '/notifications': () => import('../pages/Notifications'),
    '/rewards': () => import('../pages/Rewards'),
    '/leaderboard': () => import('../pages/Leaderboard'),
    '/profile': () => import('../pages/Profile'),
    '/admin/reports': () => import('../pages/AdminReports'),
    '/admin/badges': () => import('../pages/AdminBadges'),
    '/admin/penalties': () => import('../pages/AdminPenalties')
};

export const prefetchRoute = (path) => {
    if (!path || prefetchedRoutes.has(path)) {
        return;
    }

    const importer = routeImporters[path];
    if (!importer) {
        return;
    }

    prefetchedRoutes.add(path);
    importer().catch(() => {
        prefetchedRoutes.delete(path);
    });
};

export const prefetchHandlers = (path) => ({
    onMouseEnter: () => prefetchRoute(path),
    onFocus: () => prefetchRoute(path)
});
