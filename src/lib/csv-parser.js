/**
 * CSV Parser for Shopee Affiliate Commission Report
 * 
 * Maps Vietnamese headers to English keys,
 * then matches Sub_id2 with conversions.short_id to link orders to users.
 */

// Header mapping: Vietnamese → English
const HEADER_MAP = {
  'ID đơn hàng': 'order_id',
  'Trạng thái đặt hàng': 'order_status',
  'Checkout id': 'checkout_id',
  'Thời Gian Đặt Hàng': 'order_date',
  'Thời gian hoàn thành': 'completed_date',
  'Thời gian Click': 'click_time',
  'Tên Shop': 'shop_name',
  'Shop id': 'shop_id',
  'Loại Shop': 'shop_type',
  'Item id': 'item_id',
  'Tên Item': 'item_name',
  'ID Model': 'model_id',
  'Loại sản phẩm': 'product_type',
  'Promotion id': 'promotion_id',
  'L1 Danh mục toàn cầu': 'category_l1',
  'L2 Danh mục toàn cầu': 'category_l2',
  'L3 Danh mục toàn cầu': 'category_l3',
  'Giá(₫)': 'price',
  'Số lượng': 'quantity',
  'Loại Hoa hồng': 'commission_type',
  'Đối tác chiến dịchr': 'campaign_partner',
  'Giá trị đơn hàng (₫)': 'order_value',
  'Số tiền hoàn trả (₫)': 'refund_amount',
  'Tỷ lệ sản phẩm hoa hồng Shope': 'shopee_rate',
  'Hoa hồng Shopee trên sản phẩm(₫)': 'shopee_product_commission',
  'Tỷ lệ sản phẩm hoa hồng người bán': 'seller_rate',
  'Hoa hồng Xtra trên sản phẩm(₫)': 'xtra_product_commission',
  'Tổng hoa hồng sản phẩm(₫)': 'product_commission',
  'Hoa hồng đơn hàng từ Shopee(₫)': 'shopee_order_commission',
  'Hoa hồng đơn hàng từ Người bán(₫)': 'seller_order_commission',
  'Tổng hoa hồng đơn hàng(₫)': 'order_commission',
  'Tên MNC đã liên kết': 'mcn_name',
  'Mã hợp đồng MCN': 'mcn_contract',
  'Mức phí quản lý MCN': 'mcn_fee_rate',
  'Phí quản lý MCN(₫)': 'mcn_fee',
  'Mức hoa hồng tiếp thị liên kết theo thỏa thuận': 'agreed_rate',
  'Hoa hồng ròng tiếp thị liên kết(₫)': 'net_commission',
  'Trạng thái sản phẩm liên kết': 'commission_status',
  'Ghi chú sản phẩm': 'product_note',
  'Loại thuộc tính': 'attribute_type',
  'Trạng thái người mua': 'buyer_status',
  'Sub_id1': 'sub_id1',
  'Sub_id2': 'sub_id2',
  'Sub_id3': 'sub_id3',
  'Sub_id4': 'sub_id4',
  'Sub_id5': 'sub_id5',
  'Kênh': 'channel',
};

/**
 * Map a row from Vietnamese CSV headers to English keys
 */
export function mapRow(row) {
  const mapped = {};
  for (const [vnKey, enKey] of Object.entries(HEADER_MAP)) {
    if (row[vnKey] !== undefined) {
      mapped[enKey] = row[vnKey];
    }
  }
  return mapped;
}

/**
 * Parse numeric value from Vietnamese currency format
 * Handles: "265753", "265,753", "10630.12"
 */
export function parseNumber(value) {
  if (!value || value === '') return 0;
  // Remove currency symbols and whitespace
  const cleaned = String(value).replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse date string from CSV format: "2026-04-14 12:42:13"
 */
export function parseDate(value) {
  if (!value || value === '') return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Process parsed CSV data and match with conversions
 * 
 * @param {Array} rows - Parsed CSV rows (already mapped to English keys)
 * @param {Map} conversionMap - Map of short_id → { conversion_id, user_id }
 * @param {Set} existingOrders - Set of "order_id|item_id" already in commissions
 * @param {number} shareRate - User share rate (0.8 = 80%)
 * @returns {{ matched: Array, unmatched: Array, duplicated: Array, cancelled: Array }}
 */
export function processRows(rows, conversionMap, existingOrders, shareRate = 0.8, taxRate = 0.1) {
  const matched = [];
  const unmatched = [];
  const duplicated = [];
  const cancelled = [];

  for (const row of rows) {
    const orderId = row.order_id;
    const itemId = row.item_id;
    const subId2 = row.sub_id2;
    const netCommission = parseNumber(row.net_commission);

    // Skip empty rows
    if (!orderId) continue;

    // Check for duplicate
    const orderKey = `${orderId}|${itemId}`;
    if (existingOrders.has(orderKey)) {
      duplicated.push({ ...row, reason: 'Đơn hàng đã được import trước đó' });
      continue;
    }

    // Check cancelled orders
    if (row.commission_status === 'Đã hủy') {
      cancelled.push({ ...row, reason: 'Đơn hàng đã bị hủy' });
      // Still process cancelled orders to record them
    }

    // Try to match with conversion
    const conversion = subId2 ? conversionMap.get(subId2) : null;

    const taxAmount = Math.round(netCommission * taxRate * 100) / 100;
    const postTaxCommission = netCommission - taxAmount;

    const commission = {
      order_id: orderId,
      order_status: row.order_status,
      order_date: parseDate(row.order_date),
      completed_date: parseDate(row.completed_date),
      shop_id: parseInt(row.shop_id) || null,
      item_id: parseInt(itemId) || null,
      item_name: row.item_name,
      price: parseNumber(row.price),
      order_value: parseNumber(row.order_value),
      channel: row.channel,
      total_commission: netCommission,
      tax_amount: taxAmount,
      share_rate: shareRate,
    };

    if (conversion) {
      commission.conversion_id = conversion.conversion_id;
      commission.user_id = conversion.user_id;
      commission.user_share = Math.round(postTaxCommission * shareRate * 100) / 100;
      commission.owner_share = Math.round((netCommission - commission.user_share) * 100) / 100;
      matched.push(commission);
    } else {
      // No matching conversion - unmatched order
      commission.user_share = 0;
      commission.owner_share = netCommission; // All commission goes to owner
      unmatched.push({ ...commission, sub_id2: subId2 || '(trống)', reason: subId2 ? 'Không tìm thấy conversion' : 'Không có Sub_id2' });
    }
  }

  return { matched, unmatched, duplicated, cancelled };
}

/**
 * Format currency number to Vietnamese format
 */
export function formatCurrency(num) {
  if (num === null || num === undefined) return '0₫';
  return new Intl.NumberFormat('vi-VN').format(Math.round(num)) + '₫';
}
