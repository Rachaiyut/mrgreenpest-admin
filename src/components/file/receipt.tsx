import React from 'react';

export const ReceiptForm: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        padding: 24,
        backgroundColor: '#f1f5f9',
        color: '#000000',
        fontFamily: 'Sarabun, sans-serif',
        lineHeight: 1.5,
      }}
    >
      <div
        id="receipt-page"
        style={{
          width: '210mm',
          minHeight: '297mm',
          backgroundColor: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          padding: '10mm 12mm',
          boxSizing: 'border-box',
          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          
          {/* Header Title */}
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>สำเนา</div>
            <div style={{ fontWeight: 700, fontSize: 24 }}>ใบเสร็จรับเงิน</div>
          </div>

          {/* Company Info */}
          <div style={{ fontSize: 12, marginBottom: 12, lineHeight: 1.4 }}>
            <div><span style={{ fontWeight: 700 }}>สำนักงานใหญ่ :</span> เลขที่ 50/127 ถนนเสนานิคม 1 (ม.เสนานิเวศน์โครงการ 1) แขวง/เขตลาดพร้าว กรุงเทพฯ</div>
            <div><span style={{ fontWeight: 700 }}>โทร :</span> 02-578-1438 Fax : 02-578-1439</div>
          </div>

          {/* Customer & Document Info */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 4, height: 100 }}>
            {/* Customer Box */}
            <div style={{ flex: 1, border: '1px solid #000', padding: 8, fontSize: 14 }}>
              <div style={{ display: 'flex', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, width: 140 }}>ชื่อลูกค้า / Customer</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ fontWeight: 700, width: 140 }}>ที่อยู่ / Address</span>
              </div>
            </div>

            {/* Document Info Box */}
            <div style={{ width: 250, border: '1px solid #000', padding: 8, fontSize: 14 }}>
              <div style={{ display: 'flex', marginBottom: 24 }}>
                <span style={{ fontWeight: 700, width: 80 }}>เลขที่ / No.</span>
                <span style={{ textAlign: 'right', flex: 1 }}>68380</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ fontWeight: 700, width: 80 }}>วันที่ / Date</span>
                <span style={{ textAlign: 'right', flex: 1 }}>16 August 2025</span>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div style={{ border: '1px solid #000', marginBottom: 4 }}>
            {/* Table Header */}
            <div style={{ 
              display: 'flex', 
              borderBottom: '1px solid #000', 
              textAlign: 'center', 
              fontWeight: 700,
              fontSize: 14,
              backgroundColor: '#f9fafb'
            }}>
              <div style={{ width: 60, padding: 4, borderRight: '1px solid #000' }}>
                <div>ลำดับที่</div>
                <div>Item</div>
              </div>
              <div style={{ flex: 1, padding: 4, borderRight: '1px solid #000' }}>
                <div>รายการ</div>
                <div>Description</div>
              </div>
              <div style={{ width: 80, padding: 4, borderRight: '1px solid #000' }}>
                <div>จำนวน</div>
                <div>Quantity</div>
              </div>
              <div style={{ width: 100, padding: 4, borderRight: '1px solid #000' }}>
                <div>ราคา/หน่วย</div>
                <div>Unit Price</div>
              </div>
              <div style={{ width: 100, padding: 4 }}>
                <div>จำนวนเงิน</div>
                <div>Amount</div>
              </div>
            </div>

            {/* Table Body (Content) */}
            <div style={{ display: 'flex', minHeight: 300, fontSize: 14 }}>
               <div style={{ width: 60, padding: 8, borderRight: '1px solid #000', textAlign: 'center' }}>1</div>
               <div style={{ flex: 1, padding: 8, borderRight: '1px solid #000' }}>ค่าบริการกำจัดปลวก (ปีที่ 1/2568-2569)</div>
               <div style={{ width: 80, padding: 8, borderRight: '1px solid #000', textAlign: 'center' }}>1</div>
               <div style={{ width: 100, padding: 8, borderRight: '1px solid #000', textAlign: 'right' }}>9,000.00</div>
               <div style={{ width: 100, padding: 8, textAlign: 'right' }}>9,000.00</div>
            </div>

            {/* Footer Section inside Table Border */}
            <div style={{ borderTop: '1px solid #000', display: 'flex' }}>
              {/* Left Side: Payment Details */}
              <div style={{ flex: 1, borderRight: '1px solid #000', padding: 12, fontSize: 13, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 24, marginBottom: 12, fontWeight: 700 }}>
                   <div>รายการรับชำระเงิน</div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 12, height: 12, border: '1px solid #000' }}></div> เงินสด</div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 12, height: 12, border: '1px solid #000' }}></div> เงินโอน</div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 12, height: 12, border: '1px solid #000' }}></div> เช็ค</div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                   <div style={{ display: 'flex', gap: 8, width: '45%' }}>
                      <span style={{ fontWeight: 700 }}>ธนาคาร/Bank</span>
                      <div style={{ borderBottom: '1px dotted #ccc', flex: 1 }}></div>
                   </div>
                   <div style={{ display: 'flex', gap: 8, width: '45%' }}>
                      <span style={{ fontWeight: 700 }}>เลขที่/Chq #</span>
                      <div style={{ borderBottom: '1px dotted #ccc', flex: 1 }}></div>
                   </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                   <div style={{ display: 'flex', gap: 8, width: '45%' }}>
                      <span style={{ fontWeight: 700 }}>สาขา/Branch</span>
                      <div style={{ borderBottom: '1px dotted #ccc', flex: 1 }}></div>
                   </div>
                   <div style={{ display: 'flex', gap: 8, width: '45%' }}>
                      <span style={{ fontWeight: 700 }}>ลว./Date</span>
                      <div style={{ borderBottom: '1px dotted #ccc', flex: 1 }}></div>
                   </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                   <span style={{ fontWeight: 700 }}>จำนวนเงิน/Amount</span>
                   <div style={{ borderBottom: '1px dotted #ccc', width: 150 }}></div>
                </div>
              </div>

              {/* Right Side: Totals */}
              <div style={{ width: 220 }}>
                {/* Total */}
                <div style={{ display: 'flex', borderBottom: '1px solid #000', height: 45 }}>
                  <div style={{ flex: 1, padding: 8, fontWeight: 700, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ lineHeight: 1 }}>รวมเงิน</div>
                    <div style={{ lineHeight: 1 }}>TOTAL</div>
                  </div>
                  <div style={{ width: 100, padding: 8, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontWeight: 700 }}>9,000.00</div>
                </div>
                {/* Empty Row (VAT?) */}
                <div style={{ display: 'flex', borderBottom: '1px solid #000', height: 35 }}>
                  <div style={{ flex: 1 }}></div>
                  <div style={{ width: 100 }}></div>
                </div>
                {/* Net Amount */}
                <div style={{ display: 'flex', height: 50 }}>
                  <div style={{ flex: 1, padding: 8, fontWeight: 700, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ lineHeight: 1 }}>ยอดเงินสุทธิ</div>
                    <div style={{ lineHeight: 1 }}>NET AMOUNT</div>
                  </div>
                  <div style={{ width: 100, padding: 8, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontWeight: 700 }}>9,000.00</div>
                </div>
              </div>
            </div>

             {/* Text Amount Row */}
             <div style={{ display: 'flex', borderTop: '1px solid #000' }}>
                <div style={{ width: 80, padding: 8, fontWeight: 700, display: 'flex', alignItems: 'center' }}>ตัวอักษร</div>
                <div style={{ flex: 1, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid #000' }}>
                   ( เก้าพันบาทถ้วน )
                </div>
             </div>
          </div>

          {/* Signature Section */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
             <div style={{ width: 400, border: '1px solid #000', padding: 8, textAlign: 'center', height: 150, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 700, marginBottom: 'auto', textAlign: 'left' }}>ในนาม บริษัท มิสเตอร์กรีน เพสท์ คอนโทรล จำกัด</div>
                <div style={{ borderBottom: '1px dotted #0080ff', marginBottom: 4, width: '90%', alignSelf: 'center' }}></div>
                <div style={{ fontWeight: 700 }}>ผู้มีอำนาจลงนาม/Authorized Signature</div>
             </div>
          </div>

          {/* Footer Note */}
          <div style={{ marginTop: 12, fontSize: 12, textAlign: 'center' }}>
             * ใบเสร็จรับเงินฉบับนี้จะมีผลสมบูรณ์เมื่อเช็คของท่านเรียกเก็บเงินจากธนาคารได้เรียบร้อยแล้ว
          </div>

        </div>
      </div>
    </div>
  );
};
