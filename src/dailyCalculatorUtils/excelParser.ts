import { PlatformType, SettlementOrder, CostMasterItem } from '../dailyCalculatorTypes';
import { calculateOrderMetrics } from './calculator';

async function getXLSX() {
  return await import('xlsx');
}

export interface ExcelParseResult {
  orders: SettlementOrder[];
  costMasterUpdates: CostMasterItem[];
  platformDetected: PlatformType;
  totalRowCount: number;
}

export async function parseSettlementExcel(
  file: File,
  platform: PlatformType,
  existingCostMaster: CostMasterItem[]
): Promise<ExcelParseResult> {
  const XLSX = await getXLSX();
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const orders: SettlementOrder[] = [];
  const costMasterUpdates: CostMasterItem[] = [];

  rawRows.forEach((row, idx) => {
    let orderDate = new Date().toISOString().split('T')[0];
    let productName = '';
    let optionName = '';
    let quantity = 1;
    let salesAmount = 0;
    let feeAmount = 0;
    let settlementAmount = 0;

    const findKey = (candidates: string[]) => {
      const keys = Object.keys(row);
      const found = keys.find((k) => candidates.some((c) => k.toLowerCase().trim().includes(c.toLowerCase())));
      return found ? row[found] : null;
    };

    switch (platform) {
      case 'smartstore':
        productName = String(findKey(['상품명', '주문상품명']) || `스마트스토어 상품 ${idx + 1}`);
        optionName = String(findKey(['옵션정보', '옵션명', '선택옵션']) || '');
        quantity = Number(findKey(['수량', '구매수량'])) || 1;
        salesAmount = Number(findKey(['결제금액', '총결제금액', '상품주문금액'])) || 0;
        feeAmount = Number(findKey(['수수료합계', '네이버페이수수료', '수수료'])) || 0;
        settlementAmount = Number(findKey(['정산예정금액', '정산금액'])) || salesAmount - feeAmount;
        orderDate = String(findKey(['주문일시', '결제일', '주문일']) || orderDate).split(' ')[0];
        break;

      case 'coupang':
        productName = String(findKey(['등록옵션명', '상품명', '노출상품명']) || `쿠팡 상품 ${idx + 1}`);
        optionName = String(findKey(['옵션', '규격']) || '');
        quantity = Number(findKey(['수량', '판매수량'])) || 1;
        salesAmount = Number(findKey(['총판매액', '결제금액', '판매액'])) || 0;
        feeAmount = Number(findKey(['서비스수수료', '수수료합계', '카테고리수수료'])) || 0;
        settlementAmount = Number(findKey(['정산예정액', '정산금액'])) || salesAmount - feeAmount;
        orderDate = String(findKey(['주문일', '결제일시', '날짜']) || orderDate).split(' ')[0];
        break;

      case 'todayhouse':
        productName = String(findKey(['상품명', '파트너상품명']) || `오늘의집 상품 ${idx + 1}`);
        optionName = String(findKey(['옵션', '옵션값']) || '');
        quantity = Number(findKey(['수량', '주문수량'])) || 1;
        salesAmount = Number(findKey(['소비자가', '판매가', '결제금액'])) || 0;
        feeAmount = Number(findKey(['수수료', '수수료액'])) || 0;
        settlementAmount = Number(findKey(['정산금액', '정산예정금액'])) || salesAmount - feeAmount;
        orderDate = String(findKey(['주문일시', '결제일']) || orderDate).split(' ')[0];
        break;

      default:
        productName = String(findKey(['상품명', '품명', '제품명']) || `상품 ${idx + 1}`);
        optionName = String(findKey(['옵션', '옵션명', '규격']) || '');
        quantity = Number(findKey(['수량', '개수'])) || 1;
        salesAmount = Number(findKey(['결제금액', '매출액', '판매가', '금액'])) || 0;
        feeAmount = Number(findKey(['수수료', '공제금액'])) || 0;
        settlementAmount = Number(findKey(['정산금액', '입금예정액'])) || salesAmount - feeAmount;
        orderDate = String(findKey(['주문일', '일자', '날짜']) || orderDate).split(' ')[0];
        break;
    }

    if (!salesAmount && !settlementAmount) return;

    const parsedOrder = calculateOrderMetrics(
      {
        platform,
        orderDate: orderDate.substring(0, 10),
        productName,
        optionName,
        quantity,
        salesAmount,
        feeAmount,
        settlementAmount,
        rawExcelData: row,
      },
      existingCostMaster
    );

    orders.push(parsedOrder);
  });

  return {
    orders,
    costMasterUpdates,
    platformDetected: platform,
    totalRowCount: orders.length,
  };
}
