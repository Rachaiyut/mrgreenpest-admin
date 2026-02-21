import React from 'react';

export const InvoiceForm: React.FC = () => {
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
        id="invoice-page"
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
            <div style={{ fontWeight: 700, fontSize: 18 }}>ต้นฉบับ</div>
            <div style={{ fontWeight: 700, fontSize: 24 }}>
              ใบแจ้งหนี้/ใบวางบิล (Invoice)
            </div>
          </div>

          {/* Company Info */}
          <div style={{ fontSize: 12, marginBottom: 12, lineHeight: 1.4 }}>
            <div>
              <span style={{ fontWeight: 700 }}>สำนักงานใหญ่ :</span> เลขที่
              50/127 ถนนเสนานิคม 1 (ม.เสนานิเวศน์โครงการ 1) แขวง/เขตลาดพร้าว
              กรุงเทพฯ 10230
            </div>
            <div>
              <span style={{ fontWeight: 700 }}>โทร :</span> 02-578-143 Fax :
              02-578-1439
            </div>
          </div>

          {/* Customer & Document Info */}
          <div
            style={{ display: 'flex', gap: 12, marginBottom: 4, height: 120 }}
          >
            {/* Customer Box */}
            <div
              style={{
                flex: 1,
                border: '1px solid #000',
                padding: 8,
                fontSize: 14,
              }}
            >
              <div style={{ display: 'flex', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, width: 120 }}>
                  ชื่อลูกค้า / Custom
                </span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ fontWeight: 700, width: 120 }}>
                  ที่อยู่ / Address
                </span>
              </div>
            </div>

            {/* Document Info Box */}
            <div
              style={{
                width: 250,
                border: '1px solid #000',
                padding: 8,
                fontSize: 14,
              }}
            >
              <div style={{ display: 'flex', marginBottom: 24 }}>
                <span style={{ fontWeight: 700, width: 80 }}>เลขที่ / No.</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ fontWeight: 700, width: 80 }}>
                  วันที่ / Date
                </span>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div style={{ border: '1px solid #000', marginBottom: 4 }}>
            {/* Table Header */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid #000',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: 14,
                backgroundColor: '#f9fafb',
              }}
            >
              <div
                style={{ width: 60, padding: 4, borderRight: '1px solid #000' }}
              >
                <div>ลำดับที่</div>
                <div>Item</div>
              </div>
              <div
                style={{ flex: 1, padding: 4, borderRight: '1px solid #000' }}
              >
                <div>รายการ</div>
                <div>Description</div>
              </div>
              <div
                style={{ width: 80, padding: 4, borderRight: '1px solid #000' }}
              >
                <div>จำนวน</div>
                <div>Quantity</div>
              </div>
              <div
                style={{
                  width: 100,
                  padding: 4,
                  borderRight: '1px solid #000',
                }}
              >
                <div>ราคา/หน่วย</div>
                <div>Unit Price</div>
              </div>
              <div style={{ width: 100, padding: 4 }}>
                <div>จำนวนเงิน</div>
                <div>Amount</div>
              </div>
            </div>

            {/* Table Body (Content) */}
            <div style={{ display: 'flex', minHeight: 250, fontSize: 14 }}>
              <div
                style={{
                  width: 60,
                  padding: 8,
                  borderRight: '1px solid #000',
                  textAlign: 'center',
                }}
              >
                1
              </div>
              <div
                style={{ flex: 1, padding: 8, borderRight: '1px solid #000' }}
              >
                ค่าบริการกำจัดปลวก (ปีที่ 1/2568-2569)
              </div>
              <div
                style={{
                  width: 80,
                  padding: 8,
                  borderRight: '1px solid #000',
                  textAlign: 'center',
                }}
              >
                1
              </div>
              <div
                style={{
                  width: 100,
                  padding: 8,
                  borderRight: '1px solid #000',
                  textAlign: 'right',
                }}
              >
                9,000.00
              </div>
              <div style={{ width: 100, padding: 8, textAlign: 'right' }}>
                9,000.00
              </div>
            </div>

            {/* Footer Section inside Table Border */}
            <div style={{ borderTop: '1px solid #000', display: 'flex' }}>
              {/* Left Side: Conditions */}
              <div
                style={{
                  flex: 1,
                  borderRight: '1px solid #000',
                  padding: 8,
                  fontSize: 12,
                }}
              >
                <div>1.ได้รับบริการตามรายการข้างบนนี้ถูกต้องแล้ว</div>
                <div>
                  2.บริษัทฯ จะออกใบเสร็จรับเงิน เมื่อมีการชำระเงินเรียบร้อยแล้ว
                </div>
              </div>

              {/* Right Side: Totals */}
              <div style={{ width: 200 }}>
                <div
                  style={{
                    display: 'flex',
                    borderBottom: '1px solid #000',
                    height: 40,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      padding: 4,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      รวมเงิน
                      <br />
                      TOTAL
                    </div>
                  </div>
                  <div
                    style={{
                      width: 100,
                      padding: 4,
                      textAlign: 'right',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                    }}
                  >
                    9,000.00
                  </div>
                </div>
              </div>
            </div>

            {/* Text Amount Row */}
            <div style={{ display: 'flex', borderTop: '1px solid #000' }}>
              <div
                style={{
                  width: 60,
                  padding: 4,
                  fontWeight: 700,
                  borderRight: '1px solid #000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ตัวอักษร
              </div>
              <div
                style={{
                  flex: 1,
                  padding: 4,
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRight: '1px solid #000',
                }}
              >
                ( เก้าพันบาทถ้วน )
              </div>
              <div style={{ width: 200, display: 'flex' }}>
                <div
                  style={{ flex: 1, padding: 4, fontWeight: 700, fontSize: 12 }}
                >
                  <div>ยอดเงินสุทธิ</div>
                  <div>NET AMOUNT</div>
                </div>
                <div
                  style={{
                    width: 100,
                    padding: 4,
                    textAlign: 'right',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                  }}
                >
                  9,000.00
                </div>
              </div>
            </div>
          </div>

          {/* Bank Info Table */}
          <div
            style={{ border: '1px solid #000', fontSize: 12, marginBottom: 4 }}
          >
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid #e5e5e5',
                padding: 2,
              }}
            >
              <div style={{ width: 150, fontWeight: 700 }}>
                ชื่อบัญชี : ยุทธนา ภู่ทอง
              </div>
              <div style={{ flex: 1 }}>
                ธนาคารกรุงไทย สาขา นวมินทร์ซิตี้ อเวนิว
              </div>
              <div style={{ width: 100 }}>บัญชีออมทรัพย์</div>
              <div style={{ width: 120 }}>เลขที่ 985-6-65264-2</div>
            </div>
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid #e5e5e5',
                padding: 2,
              }}
            >
              <div style={{ width: 150 }}></div>
              <div style={{ flex: 1 }}>ธนาคารไทยพาณิชย์ สาขา เสนานิคม</div>
              <div style={{ width: 100 }}>บัญชีออมทรัพย์</div>
              <div style={{ width: 120 }}>เลขที่ 093-2-40673-8</div>
            </div>
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid #e5e5e5',
                padding: 2,
              }}
            >
              <div style={{ width: 150 }}></div>
              <div style={{ flex: 1 }}>ธนาคารกรุงศรีฯ สาขา สนง.ประกันสังคม</div>
              <div style={{ width: 100 }}>บัญชีออมทรัพย์</div>
              <div style={{ width: 120 }}>เลขที่ 460-1-04414-7</div>
            </div>
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid #e5e5e5',
                padding: 2,
              }}
            >
              <div style={{ width: 150 }}></div>
              <div style={{ flex: 1 }}>ธนาคารกสิกรไทย สาขา งามวงศ์วาน</div>
              <div style={{ width: 100 }}>บัญชีออมทรัพย์</div>
              <div style={{ width: 120 }}>เลขที่ 058-2-06656-8</div>
            </div>
            {/* Highlighted Row */}
            <div
              style={{
                display: 'flex',
                backgroundColor: '#ffff00',
                padding: 2,
                fontWeight: 700,
              }}
            >
              <div style={{ width: 150 }}>ชื่อบัญชี : บจก. มิสเตอร์กรีนฯ</div>
              <div style={{ flex: 1 }}>ธนาคารกสิกรไทย สาขา โลตัสวังหิน</div>
              <div style={{ width: 100 }}>บัญชีออมทรัพย์</div>
              <div style={{ width: 120 }}>เลขที่ 067-8-70731-7</div>
            </div>
          </div>

          {/* Red Warning/Note */}
          <div
            style={{
              border: '1px solid #000',
              padding: 4,
              marginBottom: 4,
              fontSize: 11,
            }}
          >
            <div style={{ color: 'red', fontWeight: 700 }}>
              หมายเหตุ หลังจากชำระค่าบริการเรียบร้อยแล้ว
              เพื่อความรวดเร็วในการตรวจสอบ
              กรุณาแจ้งข้อมูลและหลักฐานการโอนเงินมาที่
            </div>
            <div style={{ color: 'red', fontWeight: 700 }}>
              เบอร์โทร : 095-374-7897 หรือ Id Line : 0953747897
            </div>
          </div>

          {/* Signatures Table */}
          <div
            style={{ border: '1px solid #000', display: 'flex', fontSize: 12 }}
          >
            {/* Prepared By */}
            <div
              style={{
                flex: 1,
                borderRight: '1px solid #000',
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                height: 100,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 'auto' }}>
                ผู้จัดทำ/Prepared By
              </div>
              <div
                style={{ borderBottom: '1px dotted #ccc', marginBottom: 4 }}
              ></div>
              <div style={{ fontWeight: 700 }}>29 December 1899</div>
            </div>

            {/* Received By */}
            <div
              style={{
                flex: 1,
                borderRight: '1px solid #000',
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                height: 100,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 'auto' }}>
                ผู้รับบริการ/Received By
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700, marginRight: 4 }}>
                  วันที่/Date
                </span>
                <div style={{ borderBottom: '1px dotted #000', flex: 1 }}>
                  ...... / .......... / ..........
                </div>
              </div>
            </div>

            {/* Authorized Signature */}
            <div
              style={{
                flex: 1.2,
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                height: 100,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 'auto' }}>
                บริษัท มิสเตอร์กรีน เพสท์ คอนโทรล จำกัด
              </div>
              <div
                style={{ borderBottom: '1px dotted #ccc', marginBottom: 4 }}
              ></div>
              <div style={{ fontWeight: 700 }}>
                ผู้มีอำนาจลงนาม/Authorized Signature
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
