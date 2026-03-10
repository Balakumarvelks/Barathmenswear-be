const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const generateInvoicePDF = (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Calculate GST
      const taxableAmount = order.subtotal - (order.discount || 0) - (order.couponDiscount || 0);
      const cgst = Math.ceil(taxableAmount * 0.025);
      const sgst = Math.ceil(taxableAmount * 0.025);

      // Colors
      const primaryColor = '#1a237e';
      const textColor = '#333333';
      const lightGray = '#f5f5f5';

      // ========== HEADER ==========
      // Logo on the left
      const logoPath = path.join(__dirname, '../uploads/products/logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 30, { width: 60, height: 60 });
      }

      // GSTIN below logo
      doc.fontSize(8).fillColor(primaryColor).font('Helvetica-Bold');
      doc.text('GSTIN: 33AQOPV6830D1ZM', 40, 95);

      // Contact numbers on right
      doc.fontSize(9).fillColor(primaryColor).font('Helvetica-Bold');
      doc.text('75023 21321', 450, 40, { align: 'right' });
      doc.text('97880 32102', 450, 52, { align: 'right' });

      // Company Name - Centered
      doc.fontSize(22).fillColor(primaryColor).font('Helvetica-Bold');
      doc.text('BARATH MENS WEAR', 120, 45, { width: 320, align: 'center' });

      // Address
      doc.fontSize(10).fillColor(textColor).font('Helvetica');
      doc.text('20/5, Kalaiselvi Complex, P.R.S. Road,', 120, 72, { width: 320, align: 'center' });
      doc.text('CHENNIMALAI - 638 051', 120, 84, { width: 320, align: 'center' });

      // Line separator
      doc.moveTo(40, 115).lineTo(555, 115).strokeColor(primaryColor).lineWidth(2).stroke();

      // ========== BILL INFO ==========
      doc.fontSize(11).font('Helvetica-Bold').fillColor(textColor);
      doc.text(`No: ${order.orderNumber}`, 40, 130);

      // Date
      const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      doc.fontSize(11).fillColor(textColor).font('Helvetica-Bold');
      doc.text(`Date: ${orderDate}`, 400, 130, { align: 'right' });

      // Line separator
      doc.moveTo(40, 155).lineTo(555, 155).strokeColor('#cccccc').lineWidth(1).stroke();

      // ========== CUSTOMER INFO ==========
      doc.fontSize(11).fillColor(textColor).font('Helvetica-Bold');
      doc.text('To M/s: ', 40, 165, { continued: true });
      doc.font('Helvetica').text(order.shippingAddress.fullName);

      doc.fontSize(10).fillColor('#555555').font('Helvetica');
      doc.text(`${order.shippingAddress.street}, ${order.shippingAddress.city}`, 40, 182);
      doc.text(`${order.shippingAddress.state} - ${order.shippingAddress.pincode}`, 40, 194);
      doc.text(`Phone: ${order.shippingAddress.phone}`, 40, 206);

      // ========== ITEMS TABLE ==========
      const tableTop = 225;
      const tableHeaders = ['S.No', 'Particulars', 'Pcs', 'Rate', 'Amount'];
      const colWidths = [40, 250, 50, 80, 95];
      const colPositions = [40, 80, 330, 380, 460];

      // Table Header
      doc.rect(40, tableTop, 515, 25).fill(primaryColor);
      doc.fontSize(10).fillColor('white').font('Helvetica-Bold');
      
      tableHeaders.forEach((header, i) => {
        const align = i >= 2 ? 'right' : 'left';
        const xPos = i === 0 ? 50 : (i === 1 ? 85 : colPositions[i]);
        doc.text(header, xPos, tableTop + 8, { 
          width: colWidths[i] - 10,
          align: i >= 2 ? 'right' : 'left'
        });
      });

      // Table Rows
      let yPos = tableTop + 25;
      doc.font('Helvetica').fillColor(textColor);

      order.items.forEach((item, index) => {
        // Row background
        if (index % 2 === 0) {
          doc.rect(40, yPos, 515, 22).fill('#fafafa');
        }

        doc.fillColor(textColor).fontSize(10);
        
        // S.No
        doc.text((index + 1).toString(), 50, yPos + 6);
        
        // Particulars
        let itemName = item.name;
        if (item.variant && (item.variant.size || item.variant.color)) {
          itemName += ` (${item.variant.size || ''}${item.variant.size && item.variant.color ? ', ' : ''}${item.variant.color || ''})`;
        }
        doc.text(itemName, 85, yPos + 6, { width: 240 });
        
        // Pcs
        doc.text(item.quantity.toString(), 330, yPos + 6, { width: 45, align: 'right' });
        
        // Rate
        doc.text(`${item.price.toFixed(2)}`, 380, yPos + 6, { width: 70, align: 'right' });
        
        // Amount
        doc.text(`${item.total.toFixed(2)}`, 460, yPos + 6, { width: 85, align: 'right' });

        yPos += 22;
      });

      // Add some empty rows for spacing
      const minRows = 5;
      const emptyRows = Math.max(0, minRows - order.items.length);
      for (let i = 0; i < emptyRows; i++) {
        if ((order.items.length + i) % 2 === 0) {
          doc.rect(40, yPos, 515, 22).fill('#fafafa');
        }
        yPos += 22;
      }

      // Discount Row
      if ((order.discount || 0) + (order.couponDiscount || 0) > 0) {
        doc.rect(40, yPos, 515, 22).fill('#fff3f3');
        doc.fillColor('#d32f2f').fontSize(10).font('Helvetica-Bold');
        doc.text(`Discount ${order.couponCode ? `(${order.couponCode})` : ''}`, 85, yPos + 6);
        doc.text(`-${((order.discount || 0) + (order.couponDiscount || 0)).toFixed(2)}`, 460, yPos + 6, { width: 85, align: 'right' });
        yPos += 22;
      }

      // Shipping Row
      if ((order.shippingCharges || 0) > 0) {
        doc.rect(40, yPos, 515, 22).fill('#fafafa');
        doc.fillColor(textColor).fontSize(10).font('Helvetica');
        doc.text('Shipping Charges', 85, yPos + 6);
        doc.text(`${order.shippingCharges.toFixed(2)}`, 460, yPos + 6, { width: 85, align: 'right' });
        yPos += 22;
      }

      // CGST Row
      doc.rect(40, yPos, 515, 22).fill(lightGray);
      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold');
      doc.text('CGST 2.5%', 85, yPos + 6);
      doc.text(`${cgst.toFixed(2)}`, 460, yPos + 6, { width: 85, align: 'right' });
      yPos += 22;

      // SGST Row
      doc.rect(40, yPos, 515, 22).fill(lightGray);
      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold');
      doc.text('SGST 2.5%', 85, yPos + 6);
      doc.text(`${sgst.toFixed(2)}`, 460, yPos + 6, { width: 85, align: 'right' });
      yPos += 22;

      // Total Row
      doc.rect(40, yPos, 515, 28).fill('#e3f2fd');
      doc.moveTo(40, yPos).lineTo(555, yPos).strokeColor(primaryColor).lineWidth(2).stroke();
      doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold');
      doc.text('TOTAL', 85, yPos + 8);
      doc.text(`${order.totalAmount.toFixed(2)}`, 460, yPos + 8, { width: 85, align: 'right' });
      yPos += 28;

      // Table border
      doc.rect(40, tableTop, 515, yPos - tableTop).stroke(primaryColor);

      // ========== FOOTER ==========
      yPos += 20;

      // E&O.E
      doc.fontSize(9).fillColor(textColor).font('Helvetica-Bold');
      doc.text('E&O.E', 40, yPos);

      // Payment Info
      doc.fontSize(10).font('Helvetica');
      doc.text(`Payment Method: ${order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod}`, 200, yPos, { align: 'center' });
      doc.text(`Payment Status: ${order.paymentStatus}`, 200, yPos + 14, { align: 'center' });

      // Signature
      doc.text('For Barath Mens Wear', 400, yPos, { align: 'right' });
      doc.moveTo(430, yPos + 45).lineTo(555, yPos + 45).strokeColor(textColor).lineWidth(1).stroke();
      doc.fontSize(9).fillColor('#666666');
      doc.text('Authorized Signatory', 430, yPos + 50, { align: 'right' });

      // Thank you message
      yPos += 80;
      doc.rect(40, yPos, 515, 40).fill(primaryColor);
      doc.fillColor('white').fontSize(11).font('Helvetica-Bold');
      doc.text('Thank you for shopping with Barath Mens Wear!', 0, yPos + 10, { align: 'center' });
      doc.fontSize(9).font('Helvetica');
      doc.text('For any queries, contact us at 75023 21321', 0, yPos + 25, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = generateInvoicePDF;
