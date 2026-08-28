export interface MapTileTheme {
  id: string;
  name: string;
  category: 'Light' | 'Dark' | 'Satellite' | 'Terrain';
  url: string;
  attribution: string;
  badgeColor: string;
  isDark: boolean;
  previewColor: string;
}

export const MAP_THEMES: Record<string, MapTileTheme> = {
  voyager: {
    id: 'voyager',
    name: 'Voyager Light',
    category: 'Light',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    badgeColor: 'border-blue-200 bg-blue-50 text-blue-700',
    isDark: false,
    previewColor: '#F4F5F7',
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
  satellite: {
    id: 'satellite',
    name: 'Satellite Hybrid',
    category: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping',
    badgeColor: 'border-emerald-800 bg-emerald-950 text-emerald-400',
    isDark: true,
    previewColor: '#0B1A12',
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
