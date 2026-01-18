import React from 'react';

export const QuotationForm: React.FC = () => {
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
      {/* Page 1 */}
      <div
        id="quotation-page-1"
        style={{
          width: '210mm',
          minHeight: '297mm',
          backgroundColor: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          padding: '16mm 14mm 16mm 14mm',
          boxSizing: 'border-box',
          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12 }}>
             {/* Logos */}
             <div style={{ display: 'flex', gap: 12, marginRight: 24 }}>
                <img
                  src="/LOGO-THAI-PROPMA.png" 
                  alt="Thai Propma"
                  style={{ height: 60, width: 'auto', objectFit: 'contain' }}
                  onError={(e) => e.currentTarget.style.display = 'none'} 
                />
                <img
                  src="/LOGO-GO mrgreen.png"
                  alt="Mr.Green"
                  style={{ height: 60, width: 'auto', objectFit: 'contain' }}
                />
             </div>
             
             {/* Company Info */}
             <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>บริษัท มิสเตอร์กรีน เพสท์ คอนโทรล จำกัด</div>
                <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                    <div>สำนักงานใหญ่ : เลขที่ 50/127 ถนนเสนานิคม 1 (ม.เสนานิเวศน์โครงการ 1) แขวง/เขตลาดพร้าว กรุงเทพฯ 10230</div>
                    <div>โทร : 0 – 2578 – 1438 , 095 – 374 – 7897</div>
                    <div>www.mrgreen.co.th</div>
                </div>
             </div>
          </div>
          
          {/* Divider Line */}
          <div style={{ borderBottom: '2px solid #000', marginBottom: 16 }}></div>

          {/* Title */}
          <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 24, marginBottom: 8 }}>
            ใบประเมินราคาค่าบริการ
          </div>
          
          {/* Date */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
             <span style={{ fontWeight: 700, fontSize: 16, marginRight: 8 }}>วันที่</span>
             <div style={{ borderBottom: '1px dotted #000', width: 300 }}></div>
          </div>

          {/* Customer Details Header */}
          <div style={{ textDecoration: 'underline', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
            ข้อมูลรายละเอียดลูกค้า
          </div>

          <div style={{ fontSize: 16, lineHeight: 1.8 }}>
             {/* 1. Name */}
             <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
                <div style={{ width: 24, fontWeight: 700 }}>1.</div>
                <div style={{ width: 60, fontWeight: 700 }}>ชื่อ</div>
                <div style={{ marginRight: 12 }}>:</div>
                <div style={{ borderBottom: '1px dotted #000', flex: 1 }}></div>
             </div>

             {/* Address */}
             <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
                <div style={{ width: 24 }}></div>
                <div style={{ width: 60, fontWeight: 700 }}>ที่อยู่</div>
                <div style={{ marginRight: 12 }}>:</div>
                <div style={{ borderBottom: '1px dotted #000', flex: 1 }}></div>
             </div>
            
             
             {/* Phone */}
             <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 16 }}>
                <div style={{ width: 24 }}></div>
                <div style={{ width: 60, fontWeight: 700 }}>โทรศัพท์</div>
                <div style={{ marginRight: 12 }}>:</div>
                <div style={{ borderBottom: '1px dotted #000', flex: 1 }}></div>
             </div>

             {/* 2. Building Type */}
             <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, marginRight: 8, whiteSpace: 'nowrap' }}>2.</span>
                <span style={{ fontWeight: 700, marginRight: 16, whiteSpace: 'nowrap' }}>ประเภทสิ่งปลูกสร้าง</span>
                <span style={{ marginRight: 8 }}>:</span>
                <div style={{ borderBottom: '1px dotted #000', flex: 1 }}></div>
                <span style={{ fontWeight: 700, marginLeft: 16, marginRight: 16, whiteSpace: 'nowrap' }}>จำนวน</span>
             </div>
             

             {/* Service Area */}
             <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 16 }}>
                <div style={{ width: 25 }}></div>
                <span style={{ fontWeight: 700, marginRight: -13, whiteSpace: 'nowrap' }}>พื้นที่ให้บริการ</span>
                <div style={{ width: 65 }}></div>
                <span style={{ marginRight: 8 }}>:</span>
                <div style={{ borderBottom: '1px dotted #000', flex: 1 }}></div>
                <span style={{ fontWeight: 700, marginLeft: 20,marginRight:16, whiteSpace: 'nowrap' }}>เมตร</span>
             </div>

             {/* 3. Service Type */}
             <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, marginRight: 8, whiteSpace: 'nowrap' }}>3.</span>
                    <span style={{ fontWeight: 700, marginRight: 16, whiteSpace: 'nowrap' }}>ประเภทบริการ</span>
                    <span style={{ marginRight: 8 }}>:</span>
                    <div style={{ borderBottom: '1px dotted #000', flex: 1 }}></div>
                </div>
               
             </div>

             {/* 4. System Used */}
             <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, marginRight: 8, whiteSpace: 'nowrap' }}>4.</span>
                    <span style={{ fontWeight: 700, marginRight: 16, whiteSpace: 'nowrap' }}>ระบบที่ใช้บริการ</span>
                    <span style={{ marginRight: 8 }}>:</span>
                    <div style={{ borderBottom: '1px dotted #000', flex: 1 }}></div>
                </div>
               
             </div>

             {/* Table */}
             <div style={{ marginBottom: 24, border: '1px solid #000' }}>
                {/* Table Header */}
                <div style={{ display: 'flex', borderBottom: '1px solid #000', fontWeight: 700, textAlign: 'center', backgroundColor: '#f0f0f0' }}>
                   <div style={{ width: 60, borderRight: '1px solid #000', padding: 4 }}>ลำดับ</div>
                   <div style={{ flex: 1, borderRight: '1px solid #000', padding: 4 }}>รายการ</div>
                   <div style={{ width: 60, borderRight: '1px solid #000', padding: 4 }}>จำนวน</div>
                   <div style={{ width: 60, borderRight: '1px solid #000', padding: 4 }}>หน่วย</div>
                   <div style={{ width: 100, borderRight: '1px solid #000', padding: 4 }}>ราคา/หน่วย</div>
                   <div style={{ width: 100, padding: 4 }}>จำนวนเงิน</div>
                </div>
                
                {/* Table Rows (Empty) */}
                {[1, 2, 3].map((i) => (
                   <div key={i} style={{ display: 'flex', borderBottom: '1px solid #000', height: 32 }}>
                      <div style={{ width: 60, borderRight: '1px solid #000' }}></div>
                      <div style={{ flex: 1, borderRight: '1px solid #000' }}></div>
                      <div style={{ width: 60, borderRight: '1px solid #000' }}></div>
                      <div style={{ width: 60, borderRight: '1px solid #000' }}></div>
                      <div style={{ width: 100, borderRight: '1px solid #000' }}></div>
                      <div style={{ width: 100 }}></div>
                   </div>
                ))}
                
                {/* Total Row */}
                <div style={{ display: 'flex', fontWeight: 700 }}>
                   <div style={{ flex: 1, textAlign: 'right', padding: 4, paddingRight: 16, borderRight: '1px solid #000' }}>รวมเงิน (TOTAL)</div>
                   <div style={{ width: 100 }}></div>
                </div>
             </div>

             {/* 5. Payment Condition */}
             <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, marginRight: 8 }}>5.</span>
                <span style={{ fontWeight: 700, marginRight: 16 }}>เงื่อนไขการชำระเงิน</span>
                <span style={{ marginRight: 8 }}>:</span>
                <div style={{ borderBottom: '1px dotted #000', flex: 1 }}></div>
             </div>
           

             {/* 6. Package */}
             <div style={{ marginBottom: 30 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                   <span style={{ fontWeight: 700, marginRight: 8 }}>6.</span>
                   <span style={{ fontWeight: 700, marginRight: 24 }}>Package</span>
                   
                   <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                         <div style={{ width: 16, height: 16, border: '1px solid #000', marginRight: 12 }}></div>
                         <span style={{ fontWeight: 700 }}>Package 1 (เข้าบริการ 7 ครั้ง) สัญญาบริการ 1 ปี</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                         <div style={{ width: 16, height: 16, border: '1px solid #000', marginRight: 12 }}></div>
                         <span style={{ fontWeight: 700 }}>Package 2 (เข้าบริการ 5 ครั้ง) สัญญาบริการ 1 ปี</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                         <div style={{ width: 16, height: 16, border: '1px solid #000', marginRight: 12 }}></div>
                         <span style={{ fontWeight: 700 }}>Package 3 (เข้าบริการ 3 ครั้ง) ไม่รับประกันปลวกมาใหม่</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                         <div style={{ width: 16, height: 16, border: '1px solid #000', marginRight: 12 }}></div>
                         <span style={{ fontWeight: 700 }}>Package 4 (เข้าบริการ 1 ครั้ง) อัดน้ำยาป้องกัน (กรณีไม่พบปลวกเท่านั้น)</span>
                      </div>
                   </div>
                </div>
             </div>

          </div>
        </div>
      </div>

      {/* Page 2 */}
      <div
        id="quotation-page-2"
        style={{
          width: '210mm',
          minHeight: '297mm',
          backgroundColor: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          padding: '16mm 14mm 16mm 14mm',
          boxSizing: 'border-box',
          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
          pageBreakBefore: 'always',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header (Same as Page 1) */}
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12 }}>
             {/* Logos */}
             <div style={{ display: 'flex', gap: 12, marginRight: 24 }}>
                <img
                  src="/LOGO-THAI-PROPMA.png" 
                  alt="Thai Propma"
                  style={{ height: 60, width: 'auto', objectFit: 'contain' }}
                  onError={(e) => e.currentTarget.style.display = 'none'} 
                />
                <img
                  src="/LOGO-GO mrgreen.png"
                  alt="Mr.Green"
                  style={{ height: 60, width: 'auto', objectFit: 'contain' }}
                  onError={(e) => e.currentTarget.style.display = 'none'} 
                />
             </div>
             
             {/* Company Info */}
             <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>บริษัท มิสเตอร์กรีน เพสท์ คอนโทรล จำกัด</div>
                <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                    <div>สำนักงานใหญ่ : เลขที่ 50/127 ถนนเสนานิคม 1 (ม.เสนานิเวศน์โครงการ 1) แขวง/เขตลาดพร้าว กรุงเทพฯ 10230</div>
                    <div>โทร : 0 – 2578 – 1438 , 095 – 374 – 7897</div>
                    <div>www.mrgreen.co.th</div>
                </div>
             </div>
          </div>
          
          {/* Divider Line */}
          <div style={{ borderBottom: '2px solid #000', marginBottom: 40 }}></div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingLeft: 40, paddingRight: 40, marginTop: 40 }}>
             
             {/* Left Column - Bidder */}
             <div style={{ width: '40%' }}>
                <div style={{ textAlign: 'center', marginBottom: 30, fontWeight: 700 }}>ขอแสดงความนับถือ</div>
                
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
                    <span style={{ marginRight: 8, fontWeight: 700, whiteSpace: 'nowrap' }}>ลงนาม</span>
                    <div style={{ borderBottom: '1px dotted #000', flex: 1 }}></div>
                    <span style={{ marginLeft: 8, fontWeight: 700, whiteSpace: 'nowrap' }}>ผู้เสนอราคา</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                    <span style={{ marginRight: 8 }}>(</span>
                    <div style={{ borderBottom: '1px dotted #000', width: '90%' }}></div>
                    <span style={{ marginLeft: 8 }}>)</span>
                </div>
             </div>

             {/* Right Column - Employer */}
             <div style={{ width: '40%' }}>
                <div style={{ textAlign: 'center', marginBottom: 30, fontWeight: 700 }}>อนุมัติให้ดำเนินการ</div>
                
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
                    <span style={{ marginRight: 8, fontWeight: 700, whiteSpace: 'nowrap' }}>ผู้ว่าจ้าง</span>
                    <div style={{ borderBottom: '1px dotted #000', flex: 1 }}></div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', marginBottom: 8 }}>
                    <span style={{ marginRight: 8 }}>(</span>
                    <div style={{ borderBottom: '1px dotted #000', width: '90%' }}></div>
                    <span style={{ marginLeft: 8 }}>)</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <span style={{ marginRight: 8, fontWeight: 700, whiteSpace: 'nowrap' }}>วันที่</span>
                    <div style={{ borderBottom: '1px dotted #000', flex: 1 }}></div>
                </div>
             </div>

          </div>

          {/* STATION Section */}
          <div style={{ marginTop: 50, paddingLeft: 20, paddingRight: 20 }}>
             <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 20, textDecoration: 'underline', marginBottom: 20 }}>
                STATION
             </div>
             <div style={{ border: '1px solid #000', height: 600, width: '100%' }}></div>
          </div>

        </div>
      </div>

    </div>
  );
};
