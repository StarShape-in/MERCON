import { resolveFileUrl } from './documents';

export interface DriverAvatarMapping {
  keywords: string[];
  avatarUrl: string;
}

export const DRIVER_AVATAR_MAP: DriverAvatarMapping[] = [
  {
    keywords: ['KASHIF ALI', 'KASHIF ALI MUHAMMED ASLAM', 'MUHAMMED ASLAM'],
    avatarUrl: '/driver-assets/kashif_ali_muhammed_aslam.png',
  },
  {
    keywords: ['LIAQAT ALI', 'LIAQAT ALI MUHAMMED SULTAN', 'MUHAMMED SULTAN'],
    avatarUrl: '/driver-assets/liaqat_ali_muhammed_sultan.png',
  },
  {
    keywords: ['FAIZAN', 'MOHAMMED FAIZAN', 'MOHAMMED FAIZAN FAIZ AHMED', 'FAIZ AHMED'],
    avatarUrl: '/driver-assets/mohammed_faizan_faiz_ahmed.png',
  },
  {
    keywords: ['IQBAL', 'MOHAMMED IQBAL', 'MOHAMMED IQBAL HOSSAIN', 'IQBAL HOSSAIN'],
    avatarUrl: '/driver-assets/mohammed_iqbal_hossain.png',
  },
  {
    keywords: ['YASIN KHAIR', 'MUHAMMAD YASIN KHAIR DIN', 'KHAIR DIN', 'MUHAMMAD YASIN'],
    avatarUrl: '/driver-assets/muhammad_yasin_khair_din.png',
  },
  {
    keywords: ['ABRAR ABDUL', 'MUHAMMED ABRAR ABDUL KAREEM', 'ABRAR ABDUL KAREEM', 'MUHAMMED ABRAR'],
    avatarUrl: '/driver-assets/muhammed_abrar_abdul_kareem.png',
  },
  {
    keywords: ['RIZWAN', 'MUHAMMED RIZWAN', 'MUHAMMED RIZWAN MAQSOOD AHMAD', 'MAQSOOD AHMAD'],
    avatarUrl: '/driver-assets/muhammed_rizwan_maqsood_ahmad.png',
  },
  {
    keywords: ['SHAHBAZ', 'MUHAMMED SHAHBAZ MUHAMMAD TAZ', 'MUHAMMAD TAZ', 'MUHAMMED SHAHBAZ'],
    avatarUrl: '/driver-assets/muhammed_shahbaz_muhammad_taz.png',
  },
  {
    keywords: ['SHAHZAD', 'MUHAMMED SHAHZAD MUHAMMED AYUB BAIG', 'AYUB BAIG', 'MUHAMMED SHAHZAD'],
    avatarUrl: '/driver-assets/muhammed_shahzad_muhammed_ayub_baig.png',
  },
  {
    keywords: ['UMAIR', 'MUHAMMED UMAIR', 'MUHAMMED UMAIR MUHAMMED ALI', 'MUHAMMED ALI'],
    avatarUrl: '/driver-assets/muhammed_umair_muhammed_ali.png',
  },
  {
    keywords: ['NADAR KHAN', 'NADAR KHAN GUL SHAHZADA', 'GUL SHAHZADA'],
    avatarUrl: '/driver-assets/nadar_khan_gul_shahzada.png',
  },
  {
    keywords: ['NASEEBULLAH', 'NASEEBULLAH TAJ MANI KHAN'],
    avatarUrl: '/driver-assets/naseebullah_taj_mani_khan.png',
  },
  {
    keywords: ['NOUMAN ASHRAF', 'NOUMAN ASHRAF MUHAMMED ASHRAF'],
    avatarUrl: '/driver-assets/nouman_ashraf_muhammed_ashraf.png',
  },
  {
    keywords: ['RABIAZ KHAN', 'RABIAZ KHAN SHAH QIAZ KHAN', 'SHAH QIAZ KHAN'],
    avatarUrl: '/driver-assets/rabiaz_khan_shah_qiaz_khan.png',
  },
  {
    keywords: ['SAFI ULLAH', 'SAFI ULLAH AKHTAR ALI', 'AKHTAR ALI'],
    avatarUrl: '/driver-assets/safi_ullah_akhtar_ali.png',
  },
  {
    keywords: ['SALEEM TAHA', 'SALEEM TAHA KHAN'],
    avatarUrl: '/driver-assets/saleem_taha_khan.png',
  },
  {
    keywords: ['SAWAB KHAN', 'SAWAB KHAN TAJ MANI KHAN'],
    avatarUrl: '/driver-assets/sawab_khan_taj_mani_khan.png',
  },
  {
    keywords: ['UMAR FAROOQ', 'UMAR FAROOQ MUHAMMED BASHIR', 'MUHAMMED BASHIR'],
    avatarUrl: '/driver-assets/umar_farooq_muhammed_bashir.png',
  },
  {
    keywords: ['USMAN HABIB', 'USMAN HABIB HABIB KHAN', 'HABIB KHAN'],
    avatarUrl: '/driver-assets/usman_habib_habib_khan.png',
  },
  {
    keywords: ['WASEEM AKRAM', 'WASEEM AKRAM RAB NAWAZ', 'RAB NAWAZ'],
    avatarUrl: '/driver-assets/waseem_akram_rab_nawaz.png',
  },
  {
    keywords: ['WISAL ZAR', 'WISAL ZAR SAID', 'ZAR SAID'],
    avatarUrl: '/driver-assets/wisal_zar_said.png',
  },
  {
    keywords: ['ABDUL MALIK', 'ABDUL MALIK MALIK'],
    avatarUrl: '/driver-assets/abdul_malik.jpg',
  },
];

/**
 * Resolves a driver's avatar image URL.
 * First checks explicit `src` / `avatarUrl`, resolving backend uploads / relative paths.
 * If missing, checks the driver's name against known profile photo mappings.
 */
export function getDriverAvatar(src?: string | null, fullName?: string): string | undefined {
  if (src && src.trim()) {
    return resolveFileUrl(src);
  }
  if (!fullName || !fullName.trim()) return undefined;

  const normalized = fullName.toUpperCase().trim();

  for (const entry of DRIVER_AVATAR_MAP) {
    for (const kw of entry.keywords) {
      if (normalized.includes(kw)) {
        return entry.avatarUrl;
      }
    }
  }

  return undefined;
}
