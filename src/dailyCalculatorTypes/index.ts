export interface CostMasterItem {
  id: string; // Unique ID
  productName: string; // Product name
  optionName: string; // Option name
  cost: number; // Unit cost (KRW)
  supplyPrice: number; // Supply price (KRW)
  vat: number; // VAT (KRW)
  memo?: string; // Memo
  updatedAt: string; // Updated ISO string
}

export type PlatformType = 'smartstore' | 'coupang' | 'todayhouse' | 'jasamall' | 'elevenst' | 'gmarket' | 'auction';

export interface PlatformConfig {
  id: PlatformType;
  name: string;
  defaultFeeRate: number; // Percentage e.g. 5.5
  color: string; // Tailwind color class or hex
}

export interface SettlementOrder {
  id: string; // Unique order ID
  platform: PlatformType; // Platform type
  orderDate: string; // Order/Payment Date (YYYY-MM-DD)
  settlementDate?: string; // Expected Settlement Date (YYYY-MM-DD)
  productName: string; // Product Name
  optionName: string; // Option Name
  quantity: number; // Order Quantity
  salesAmount: number; // Sales Amount (KRW)
  feeAmount: number; // Platform Fee (KRW)
  settlementAmount: number; // Expected Settlement Amount (KRW)
  costPerUnit: number; // Cost Per Unit (KRW)
  totalCost: number; // Total Cost = Quantity * CostPerUnit (KRW)
  adSpend: number; // Allocated Ad Spend (KRW)
  netProfit: number; // Net Profit = Settlement - TotalCost - AdSpend
  marginRate: number; // Margin Rate (%) = (NetProfit / SalesAmount) * 100
  status: 'pending' | 'completed'; // Settlement Status
  rawExcelData?: Record<string, any>; // Original raw excel row
}

export interface DailyAdSpend {
  id: string;
  date: string; // YYYY-MM-DD
  platform: PlatformType;
  amount: number; // Ad spend amount (KRW)
}

export interface GlobalSettings {
  vatIncludedInCost: boolean; // Whether cost includes VAT
  corporateTaxRate: number; // Tax rate (%)
  defaultVatRate: number; // 10%
}
