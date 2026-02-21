import React from 'react';

export const OfficialQuotationForm: React.FC = () => {
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
        id="official-quotation-page-1"
        style={{
          width: '210mm',
          minHeight: '297mm',
          backgroundColor: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          padding: '12mm 12mm 12mm 12mm',
          boxSizing: 'border-box',
          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header Section */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            {/* Left: Logos and Company Info */}
            <div style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
              {/* Logos */}
              <div style={{ display: 'flex', gap: 8, marginRight: 16 }}>
                <img
                  src="/LOGO-THAI-PROPMA.png"
                  alt="Thai Propma"
                  style={{ height: 50, width: 'auto', objectFit: 'contain' }}
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
                <img
                  src="/LOGO-GO mrgreen.png"
                  alt="Mr.Green"
                  style={{ height: 50, width: 'auto', objectFit: 'contain' }}
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>

              {/* Company Name & Address */}
              <div style={{ fontSize: 11, lineHeight: 1.3 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  บริษัท มิสเตอร์กรีน เพสท์ คอนโทรล จำกัด
                </div>
                <div>
                  สำนักงานใหญ่ : เลขที่ 50/127 ถนนเสนานิคม 1
                  (ม.เสนานิเวศน์โครงการ 1)
                </div>
                <div>แขวง/เขตลาดพร้าว กรุงเทพฯ 10230</div>
                <div>โทร : 0 – 2578 – 1438 Fax : 02-578-1439</div>
                <div>เลขประจำตัวผู้เสียภาษีอากร : 0 1055 58016 62 0</div>
              </div>
            </div>

            {/* Right: Form Title */}
            <div
              style={{
                border: '1px solid #000',
                padding: '4px 12px',
                height: 'fit-content',
                fontWeight: 700,
                fontSize: 16,
                borderRadius: 4,
              }}
            >
              ใบเสนอราคาค่าบริการ
            </div>
          </div>

          {/* Quotation Details Box */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                border: '1px solid #000',
                padding: '4px 8px',
                width: 300,
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              <div style={{ display: 'flex' }}>
                <span style={{ fontWeight: 700, width: 80 }}>เลขที่</span>
                <span style={{ marginRight: 4 }}>:</span>
                <span>M 68106</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ fontWeight: 700, width: 80 }}>วันที่</span>
                <span style={{ marginRight: 4 }}>:</span>
                <span>6 August 2025</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ fontWeight: 700, width: 80 }}>กำหนดยืนราคา</span>
                <span style={{ marginRight: 4 }}>:</span>
                <span>30 วัน</span>
              </div>
            </div>
          </div>

          {/* Subject & To */}
          <div style={{ marginBottom: 12, fontSize: 14 }}>
            <div style={{ display: 'flex', marginBottom: 4 }}>
              <span style={{ fontWeight: 700, width: 40 }}>เรื่อง</span>
              <span>
                เสนอราคาค่าบริการงานควบคุมป้องกันกำจัด
                <span style={{ color: 'red', fontWeight: 700 }}>
                  ปลวก มด แมลงสาบ หนู
                </span>
              </span>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ fontWeight: 700, width: 40 }}>เรียน</span>
              <div style={{ borderBottom: '1px dotted #000', flex: 1 }}></div>
            </div>
          </div>

          {/* Intro Text */}
          <div
            style={{
              textIndent: 40,
              marginBottom: 12,
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            บริษัท มิสเตอร์กรีน เพสท์ คอนโทรล จำกัด
            ขอขอบคุณท่านที่ได้ให้ความสนใจในบริการควบคุมป้องกันกำจัดแมลงของบริษัทฯ
            พร้อมกันนี้บริษัทฯ ขอเสนองานบริการควบคุมป้องกันดังนี้
          </div>

          {/* Info Table */}
          <div
            style={{
              border: '1px solid #000',
              display: 'flex',
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            {/* Left Column */}
            <div
              style={{ flex: 1.2, borderRight: '1px solid #000', padding: 8 }}
            >
              <div style={{ display: 'flex', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, minWidth: 90 }}>
                  สถานที่ให้
                </span>
                <span style={{ marginRight: 8 }}>:</span>
                <div style={{ flex: 1 }}></div>
              </div>
              <div style={{ display: 'flex', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, minWidth: 90 }}>
                  พื้นที่ให้บริการ
                </span>
                <span style={{ marginRight: 8 }}>:</span>
                <div style={{ flex: 1 }}></div>
              </div>
              <div style={{ display: 'flex', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, minWidth: 90 }}>
                  เงื่อนไขการชำระ
                </span>
                <span style={{ marginRight: 8 }}>:</span>
                <span>ชำระเมื่อเข้าปฏิบัติงานครั้งแรกเสร็จเรียบร้อย</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ fontWeight: 700, minWidth: 90 }}>
                  เบอร์ติดต่อ
                </span>
                <span style={{ marginRight: 8 }}>:</span>
                <div style={{ flex: 1 }}></div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ flex: 1, padding: 8 }}>
              <div style={{ display: 'flex', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, minWidth: 70 }}>
                  ระบบที่ใช้
                </span>
                <span style={{ marginRight: 8 }}>:</span>
                <span>ระบบเหยื่อ และสารเคมีกึ่งชีวภาพ</span>
              </div>
              <div style={{ display: 'flex', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, minWidth: 70 }}>ประเภท</span>
                <span style={{ marginRight: 8 }}>:</span>
                <span>ควบคุมป้องกันกำจัดปลวก</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ fontWeight: 700, minWidth: 70 }}>หมายเหตุ</span>
                <span style={{ marginRight: 8 }}>:</span>
                <div>
                  <div>(สัญญาบริการ 1 ปี)</div>
                  <div>7 ครั้ง</div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Table */}
          <div
            style={{ border: '1px solid #000', fontSize: 14, marginBottom: 4 }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid #000',
                fontWeight: 700,
                textAlign: 'center',
                backgroundColor: '#f9fafb',
              }}
            >
              <div
                style={{ width: 50, padding: 4, borderRight: '1px solid #000' }}
              >
                ลำดับที่
              </div>
              <div
                style={{ flex: 1, padding: 4, borderRight: '1px solid #000' }}
              >
                รายการ
              </div>
              <div
                style={{ width: 80, padding: 4, borderRight: '1px solid #000' }}
              >
                จำนวน
              </div>
              <div
                style={{ width: 80, padding: 4, borderRight: '1px solid #000' }}
              >
                หน่วย
              </div>
              <div
                style={{
                  width: 100,
                  padding: 4,
                  borderRight: '1px solid #000',
                }}
              >
                ราคา
              </div>
              <div style={{ width: 100, padding: 4 }}>จำนวนเงิน</div>
            </div>

            {/* Row 1 */}
            <div style={{ display: 'flex', minHeight: 250 }}>
              <div
                style={{
                  width: 50,
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
                ค่าบริการควบคุมป้องกันกำจัดปลวก
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
                  width: 80,
                  padding: 8,
                  borderRight: '1px solid #000',
                  textAlign: 'center',
                }}
              >
                ปี
              </div>
              <div
                style={{
                  width: 100,
                  padding: 8,
                  borderRight: '1px solid #000',
                  textAlign: 'right',
                }}
              >
                20,000.00
              </div>
              <div style={{ width: 100, padding: 8, textAlign: 'right' }}>
                20,000.00
              </div>
            </div>

            {/* Footer Calculation */}
            <div style={{ display: 'flex', borderTop: '1px solid #000' }}>
              <div style={{ flex: 1, borderRight: '1px solid #000' }}></div>
              <div
                style={{ width: 260, display: 'flex', flexDirection: 'column' }}
              >
                {/* Total */}
                <div
                  style={{ display: 'flex', borderBottom: '1px solid #000' }}
                >
                  <div
                    style={{
                      flex: 1,
                      padding: 4,
                      fontWeight: 700,
                      paddingLeft: 8,
                    }}
                  >
                    รวมเงิน (TOTAL)
                  </div>
                  <div
                    style={{
                      width: 100,
                      padding: 4,
                      textAlign: 'right',
                      fontWeight: 700,
                    }}
                  >
                    20,000.00
                  </div>
                </div>
                {/* VAT */}
                <div
                  style={{ display: 'flex', borderBottom: '1px solid #000' }}
                >
                  <div
                    style={{
                      flex: 1,
                      padding: 4,
                      fontWeight: 700,
                      paddingLeft: 8,
                    }}
                  >
                    ภาษีมูลค่าเพิ่ม (VAT 7%)
                  </div>
                  <div
                    style={{
                      width: 100,
                      padding: 4,
                      textAlign: 'right',
                      fontWeight: 700,
                    }}
                  >
                    1,400.00
                  </div>
                </div>
                {/* Net */}
                <div style={{ display: 'flex', backgroundColor: '#f0f0f0' }}>
                  <div
                    style={{
                      flex: 1,
                      padding: 4,
                      fontWeight: 700,
                      paddingLeft: 8,
                    }}
                  >
                    ยอดเงินสุทธิ (NET AMOUNT)
                  </div>
                  <div
                    style={{
                      width: 100,
                      padding: 4,
                      textAlign: 'right',
                      fontWeight: 700,
                    }}
                  >
                    21,400.00
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Text Amount */}
          <div
            style={{
              display: 'flex',
              border: '1px solid #000',
              borderTop: 'none',
              marginBottom: 4,
              fontSize: 14,
              fontWeight: 700,
              padding: 4,
              justifyContent: 'center',
              backgroundColor: '#f9fafb',
            }}
          >
            ( สองหมื่นหนึ่งพันสี่ร้อยบาทถ้วน )
          </div>

          {/* Red Warning/Note */}
          <div
            style={{
              color: 'red',
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 12,
              textAlign: 'center',
            }}
          >
            ราคานี้รวมค่าเหยื่อ ค่าน้ำยา ค่าแรง ตลอดจนค่าเครื่องมือ
            เครื่องใช้ที่จำเป็นไว้เป็นที่เรียบร้อยแล้ว บริษัทฯ
            หวังเป็นอย่างยิ่งว่าคงจะมีโอกาสรับใช้ท่าน
          </div>

          {/* Signatures */}
          <div
            style={{
              border: '1px solid #000',
              display: 'flex',
              height: 120,
            }}
          >
            {/* Left: Bidder */}
            <div
              style={{
                flex: 1,
                borderRight: '1px solid #000',
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 40 }}>
                ขอแสดงความนับถือ
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontWeight: 700, marginRight: 8 }}>ลงนาม</span>
                <span style={{ fontWeight: 700 }}>ธนาทิป คำลี ผู้เสนอราคา</span>
              </div>
            </div>

            {/* Right: Approver */}
            <div style={{ flex: 1, padding: 8 }}>
              <div
                style={{
                  fontWeight: 700,
                  textAlign: 'center',
                  marginBottom: 4,
                }}
              >
                อนุมัติให้ดำเนินการตามใบเสนอราคา
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  marginBottom: 8,
                }}
              >
                <span style={{ fontWeight: 700, marginRight: 8 }}>ลงชื่อ</span>
                <div style={{ borderBottom: '1px dotted #000', flex: 1 }}></div>
                <span style={{ marginLeft: 4 }}>)</span>
              </div>
              <div style={{ paddingLeft: 40, marginBottom: 8 }}>
                ({' '}
                <div
                  style={{
                    borderBottom: '1px dotted #000',
                    display: 'inline-block',
                    width: '80%',
                  }}
                ></div>{' '}
                )
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  marginBottom: 8,
                }}
              >
                <span style={{ fontWeight: 700, marginRight: 8 }}>วันที่</span>
                <div style={{ borderBottom: '1px dotted #000', flex: 1 }}></div>
              </div>
              <div style={{ fontWeight: 700 }}>ประทับตราบริษัท</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
