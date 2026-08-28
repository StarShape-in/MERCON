export interface MapTileTheme {
  id: string;
  name: string;
  category: 'Light' | 'Dark' | 'Satellite' | 'Terrain';
  url: string;
  overlayUrl?: string;
  attribution: string;
  badgeColor: string;
  isDark: boolean;
  previewColor: string;
}

export const MAP_THEMES: Record<string, MapTileTheme> = {
  voyager: {
    id: 'voyager',
    name: 'Realistic Satellite (English)',
    category: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    badgeColor: 'border-emerald-800 bg-emerald-950 text-emerald-400',
    isDark: true,
    previewColor: '#0B1A12',
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite Hybrid (English)',
    category: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    badgeColor: 'border-emerald-800 bg-emerald-950 text-emerald-400',
    isDark: true,
    previewColor: '#0B1A12',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Cyber',
    category: 'Dark',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    badgeColor: 'border-orange-900 bg-orange-950 text-orange-400',
    isDark: true,
    previewColor: '#0F1017',
  },
  positron: {
    id: 'positron',
    name: 'Positron Minimal',
    category: 'Light',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    badgeColor: 'border-slate-200 bg-slate-100 text-slate-700',
    isDark: false,
    previewColor: '#FAFAFA',
  },
  topo: {
    id: 'topo',
    name: 'Esri Topo Terrain',
    category: 'Terrain',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap',
    badgeColor: 'border-amber-200 bg-amber-50 text-amber-800',
    isDark: false,
    previewColor: '#F3EFE0',
  },
};
