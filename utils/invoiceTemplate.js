const generateInvoiceHTML = (order, user) => {
  // Calculate GST breakdown (CGST 2.5% + SGST 2.5% = 5% total)
  const taxableAmount = order.subtotal - order.discount - order.couponDiscount;
  const cgst = Math.ceil(taxableAmount * 0.025);
  const sgst = Math.ceil(taxableAmount * 0.025);

  const itemsHTML = order.items.map((item, index) => `
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">
        ${item.name}
        ${item.variant && (item.variant.size || item.variant.color) ?
      `<br><small style="color: #666;">${item.variant.size ? `Size: ${item.variant.size}` : ''} ${item.variant.color ? `Color: ${item.variant.color}` : ''}</small>`
      : ''}
      </td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">Rs.${item.price.toFixed(2)}</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">Rs.${item.total.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${order.orderNumber}</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5;">
  <div style="max-width: 700px; margin: 0 auto; background: white; border: 2px solid #1a237e; border-radius: 8px; overflow: hidden;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 20px; border-bottom: 2px solid #1a237e;">
      <table width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="vertical-align: top; width: 150px;">
            <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; color: #1a237e;">GSTIN: 33AQOPV6830D1ZM</p>
          </td>
          <td style="text-align: center; vertical-align: middle;">
            <h1 style="margin: 0; color: #1a237e; font-size: 28px; letter-spacing: 2px;">BARATH MENS WEAR</h1>
            <p style="margin: 10px 0 0 0; color: #333; font-size: 13px; line-height: 1.5;">
              20/5, Kalaiselvi Complex, P.R.S. Road,<br>
              CHENNIMALAI - 638 051
            </p>
          </td>
          <td style="text-align: right; vertical-align: top; width: 150px;">
            <p style="margin: 2px 0; font-weight: bold; color: #333;">75023 21321</p>
            <p style="margin: 2px 0; font-weight: bold; color: #333;">97880 32102</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Bill Info -->
    <div style="display: flex; justify-content: space-between; padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #1a237e;">
      <table width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="width: 50%;">
            <span style="font-weight: bold;">No:</span>
            <span style="font-size: 16px; font-weight: bold; color: #1a237e;">${order.orderNumber}</span>
          </td>
          <td style="width: 50%; text-align: right;">
            <span style="font-weight: bold;">Date:</span>
            <span>${new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Customer Info -->
    <div style="padding: 15px 20px; border-bottom: 1px solid #ddd;">
      <p style="margin: 0;"><strong>To M/s:</strong> ${order.shippingAddress.fullName}</p>
      <p style="margin: 5px 0 0 0; color: #555; font-size: 13px;">
        ${order.shippingAddress.street}, ${order.shippingAddress.city},<br>
        ${order.shippingAddress.state} - ${order.shippingAddress.pincode}
      </p>
      <p style="margin: 5px 0 0 0; color: #555; font-size: 13px;">Phone: ${order.shippingAddress.phone}</p>
    </div>

    <!-- Items Table -->
    <table width="100%" style="border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="background: #1a237e; color: white;">
          <th style="padding: 12px 10px; border: 1px solid #1a237e; text-align: center; width: 50px;">S.No</th>
          <th style="padding: 12px 10px; border: 1px solid #1a237e; text-align: left;">Particulars</th>
          <th style="padding: 12px 10px; border: 1px solid #1a237e; text-align: center; width: 60px;">Pcs</th>
          <th style="padding: 12px 10px; border: 1px solid #1a237e; text-align: right; width: 80px;">Rate</th>
          <th style="padding: 12px 10px; border: 1px solid #1a237e; text-align: right; width: 100px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
        
        ${(order.discount > 0 || order.couponDiscount > 0) ? `
        <tr>
          <td colspan="4" style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #d32f2f; font-weight: bold;">
            Discount ${order.couponCode ? `(${order.couponCode})` : ''}
          </td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #d32f2f; font-weight: bold;">
            -Rs.${(order.discount + order.couponDiscount).toFixed(2)}
          </td>
        </tr>
        ` : ''}
        
        ${order.shippingCharges > 0 ? `
        <tr>
          <td colspan="4" style="padding: 10px; border: 1px solid #ddd; text-align: right;">Shipping Charges</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">Rs.${order.shippingCharges.toFixed(2)}</td>
        </tr>
        ` : ''}
        
        <tr style="background: #f5f5f5;">
          <td colspan="4" style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #1a237e;">CGST 2.5%</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">Rs.${cgst.toFixed(2)}</td>
        </tr>
        
        <tr style="background: #f5f5f5;">
          <td colspan="4" style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #1a237e;">SGST 2.5%</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">Rs.${sgst.toFixed(2)}</td>
        </tr>
        
        <tr style="background: #e3f2fd;">
          <td colspan="4" style="padding: 12px; border: 2px solid #1a237e; text-align: right; font-weight: bold; font-size: 15px; color: #1a237e;">TOTAL</td>
          <td style="padding: 12px; border: 2px solid #1a237e; text-align: right; font-weight: bold; font-size: 16px; color: #1a237e;">Rs.${order.totalAmount.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Footer -->
    <div style="display: flex; justify-content: space-between; padding: 20px; border-top: 1px solid #ddd;">
      <table width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="vertical-align: bottom;">
            <p style="margin: 0; font-weight: bold; font-size: 12px;">E&O.E</p>
          </td>
          <td style="text-align: center;">
            <p style="margin: 0 0 5px 0; font-size: 13px;"><strong>Payment Method:</strong> ${order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod}</p>
            <p style="margin: 0; font-size: 13px;"><strong>Payment Status:</strong> ${order.paymentStatus}</p>
          </td>
          <td style="text-align: right;">
            <p style="margin: 0; font-size: 13px;">For Barath Mens Wear</p>
            <div style="height: 40px;"></div>
            <p style="margin: 0; font-size: 11px; color: #666; border-top: 1px solid #333; padding-top: 5px;">Authorized Signatory</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Thank You Message -->
    <div style="background: #1a237e; color: white; padding: 15px; text-align: center;">
      <p style="margin: 0; font-size: 14px;">Thank you for shopping with Barath Mens Wear!</p>
      <p style="margin: 5px 0 0 0; font-size: 12px;">For any queries, contact us at 75023 21321</p>
    </div>

  </div>
</body>
</html>
  `;
};

module.exports = generateInvoiceHTML;
