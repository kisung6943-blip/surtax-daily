import { PlatformConfig, GlobalSettings } from '../dailyCalculatorTypes';

export const PLATFORMS: PlatformConfig[] = [
  { id: 'smartstore', name: '스마트스토어', defaultFeeRate: 5.7, color: 'emerald' },
  { id: 'coupang', name: '쿠팡', defaultFeeRate: 10.8, color: 'rose' },
  { id: 'todayhouse', name: '오늘의집', defaultFeeRate: 13.0, color: 'sky' },
  { id: 'jasamall', name: '자사몰', defaultFeeRate: 3.3, color: 'indigo' },
  { id: 'elevenst', name: '11번가', defaultFeeRate: 12.0, color: 'red' },
  { id: 'gmarket', name: 'G마켓', defaultFeeRate: 13.0, color: 'green' },
  { id: 'auction', name: '옥션', defaultFeeRate: 13.0, color: 'amber' },
];

export const DEFAULT_SETTINGS: GlobalSettings = {
  vatIncludedInCost: true,
  corporateTaxRate: 10.0,
  defaultVatRate: 10.0,
};
