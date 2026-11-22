import {
  Compass,
  Moon,
  Package,
  ShieldAlert,
  Snowflake,
  Truck,
} from 'lucide-react';
import type { DriverAvatarId } from '../types/truckmaster';

export interface DriverAvatarMeta {
  id: DriverAvatarId;
  nameEn: string;
  nameSi: string;
  roleJa: string;
  bgClass: string;
  iconColorClass: string;
}

export const DRIVER_AVATARS: DriverAvatarMeta[] = [
  {
    id: 'heavy-10t',
    nameEn: '10t Highway Captain',
    nameSi: '10t අධිවේගී ට්‍රක් නියමු',
    roleJa: '大型長距離ドライバー',
    bgClass: 'bg-gradient-to-br from-[#0B4F8A] to-slate-900',
    iconColorClass: 'text-amber-300',
  },
  {
    id: 'city-4t',
    nameEn: '4t Urban Express',
    nameSi: '4t නගර ප්‍රවාහන රියදුරු',
    roleJa: '中型ルート配送',
    bgClass: 'bg-gradient-to-br from-[#0D7A5F] to-teal-900',
    iconColorClass: 'text-emerald-200',
  },
  {
    id: 'kyt-inspector',
    nameEn: 'KYT Safety Ace',
    nameSi: 'KYT ආරක්ෂක විශේෂඥ',
    roleJa: '危険予知トレーナー',
    bgClass: 'bg-gradient-to-br from-amber-500 to-orange-700',
    iconColorClass: 'text-white',
  },
  {
    id: 'cold-chain',
    nameEn: 'Cold-Chain Reefer Pro',
    nameSi: 'ශීතකරණ ප්‍රවාහන රියදුරු',
    roleJa: '冷凍・冷蔵トラック',
    bgClass: 'bg-gradient-to-br from-sky-500 to-blue-800',
    iconColorClass: 'text-cyan-100',
  },
  {
    id: 'night-express',
    nameEn: 'Night Highway Runner',
    nameSi: 'රාත්‍රී අධිවේගී රියදුරු',
    roleJa: '夜間高速ドライバー',
    bgClass: 'bg-gradient-to-br from-indigo-700 to-slate-950',
    iconColorClass: 'text-amber-300',
  },
  {
    id: 'cargo-master',
    nameEn: 'Cargo & Loading Master',
    nameSi: 'භාණ්ඩ පැටවුම් විශේෂඥ',
    roleJa: '荷役・積付エキスパート',
    bgClass: 'bg-gradient-to-br from-slate-700 to-slate-900',
    iconColorClass: 'text-sky-300',
  },
];

export function getDriverAvatarMeta(id?: DriverAvatarId): DriverAvatarMeta {
  return DRIVER_AVATARS.find((a) => a.id === id) || DRIVER_AVATARS[0];
}

export function DriverAvatarBadge({
  avatarId,
  size = 'md',
}: {
  avatarId?: DriverAvatarId;
  size?: 'sm' | 'md' | 'lg';
}) {
  const meta = getDriverAvatarMeta(avatarId);
  const boxCls =
    size === 'sm'
      ? 'w-9 h-9 rounded-xl'
      : size === 'lg'
        ? 'w-14 h-14 rounded-2xl'
        : 'w-11 h-11 rounded-xl';
  const iconCls = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';

  const Icon =
    meta.id === 'city-4t'
      ? Compass
      : meta.id === 'kyt-inspector'
        ? ShieldAlert
        : meta.id === 'cold-chain'
          ? Snowflake
          : meta.id === 'night-express'
            ? Moon
            : meta.id === 'cargo-master'
              ? Package
              : Truck;

  return (
    <div
      className={`${boxCls} ${meta.bgClass} ${meta.iconColorClass} flex items-center justify-center shrink-0 shadow-xs border border-white/15`}
      aria-hidden="true"
    >
      <Icon className={iconCls} />
    </div>
  );
}
