import React from 'react';

export const ServiceReportForm: React.FC = () => {
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
        id="service-report-page-1"
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            {/* Left Side: Company Info */}
            <div style={{ width: '60%' }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
                บริษัท มิสเตอร์กรีน เพสท์ คอนโทรล จำกัด
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.4, marginBottom: 8 }}>
                <div>
                  สำนักงานใหญ่ : เลขที่ 50/127 ถนนเสนานิคม 1 แขวง/เขตลาดพร้าว
                  กรุงเทพมหานคร 10230
                </div>
                <div>โทร : 02-578-1438 Fax : 02-578-1439</div>
                <div style={{ marginTop: 4 }}>
                  เลขประจำตัวผู้เสียภาษีอากร : 0 1055 58016 62 0
                </div>
              </div>
              <img
                src="/LOGO-GO mrgreen.png"
                alt="Mr.Green"
                style={{ height: 60, width: 'auto', objectFit: 'contain' }}
              />
            </div>

            {/* Right Side: Report Title Box */}
            <div
              style={{
                border: '1px solid #000',
                padding: '16px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: 'fit-content',
                minWidth: 200,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                รายงานการเข้าบริการ
              </div>
              <div style={{ fontSize: 18 }}>Service Report</div>
            </div>
          </div>

          {/* Double Separator Line */}
          <div
            style={{
              borderTop: '1px solid #000',
              borderBottom: '1px solid #000',
              height: 4,
              marginBottom: 24,
            }}
          ></div>

          {/* Content */}
          <div style={{ fontSize: 16, lineHeight: 1.8 }}>
            {/* Date */}
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontWeight: 700 }}>วันที่</span>{' '}
              ..............................................................................
            </div>

            {/* Name/Company */}
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontWeight: 700 }}>ชื่อ – สกุล / บริษัท</span>{' '}
              .....................................................................................................................................................................
            </div>

            {/* Service Type */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
                marginBottom: 12,
              }}
            >
              <div style={{ fontWeight: 700 }}>ประเภทบริการ</div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '1px solid #000',
                    marginRight: 8,
                  }}
                ></div>
                <span>ปลวก</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '1px solid #000',
                    marginRight: 8,
                  }}
                ></div>
                <span>มด,แมลงสาบ</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '1px solid #000',
                    marginRight: 8,
                  }}
                ></div>
                <span>หนู</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '1px solid #000',
                    marginRight: 8,
                  }}
                ></div>
                <span>ยุง</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '1px solid #000',
                    marginRight: 8,
                  }}
                ></div>
                <span>อื่นๆ</span>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              ....................................................................................................
            </div>

            {/* Time */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div style={{ flex: 1, display: 'flex' }}>
                <span style={{ fontWeight: 700, marginRight: 8, minWidth: 60 }}>
                  เวลาเข้า
                </span>
                <span
                  style={{
                    flex: 1,
                    borderBottom: '1px dotted #000',
                    marginRight: 8,
                  }}
                ></span>
                <span style={{ fontWeight: 700 }}>น.</span>
              </div>
              <div style={{ width: 40 }}></div>
              <div style={{ flex: 1, display: 'flex' }}>
                <span style={{ fontWeight: 700, marginRight: 8, minWidth: 60 }}>
                  เวลาออก
                </span>
                <span
                  style={{
                    flex: 1,
                    borderBottom: '1px dotted #000',
                    marginRight: 8,
                  }}
                ></span>
                <span style={{ fontWeight: 700 }}>น.</span>
              </div>
            </div>

            {/* Service Action */}
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: 700, marginRight: 16, minWidth: 80 }}>
                  การบริการ
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: '1px solid #000',
                        marginRight: 8,
                      }}
                    ></div>
                    <span>วางกล่อง</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: '1px solid #000',
                        marginRight: 8,
                      }}
                    ></div>
                    <span>เติมเหยื่อ</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: '1px solid #000',
                        marginRight: 8,
                      }}
                    ></div>
                    <span>อัดน้ำยา</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: '1px solid #000',
                        marginRight: 8,
                      }}
                    ></div>
                    <span>ตรวจเช็ค</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: '1px solid #000',
                        marginRight: 8,
                      }}
                    ></div>
                    <span>ฝังสถานี</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: '1px solid #000',
                        marginRight: 8,
                      }}
                    ></div>
                    <span>ต่อสัญญา</span>
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 96,
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '1px solid #000',
                    marginRight: 8,
                  }}
                ></div>
                <span style={{ marginRight: 8 }}>อื่นๆ</span>
                <span
                  style={{ borderBottom: '1px dotted #000', flex: 1 }}
                ></span>
              </div>
            </div>

            {/* Operation/Problem/Suggestion */}
            <div style={{ fontWeight: 700, marginBottom: 12 }}>
              การปฏิบัติงาน การบริการ ปัญหาที่พบ และข้อเสนอแนะ
            </div>

            {/* Termite Section */}
            <div style={{ marginBottom: 4 }}>
              <div style={{ display: 'flex', marginBottom: 4 }}>
                <div style={{ fontWeight: 700, minWidth: 80 }}>ปลวก</div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      border: '1px solid #000',
                      marginRight: 8,
                    }}
                  ></div>
                  <span style={{ marginRight: 8 }}>มี บริเวณ</span>
                  <span
                    style={{ borderBottom: '1px dotted #000', flex: 1 }}
                  ></span>
                </div>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '1px solid #000',
                    marginLeft: 8,
                  }}
                ></div>
              </div>
              <div style={{ paddingLeft: 80, marginBottom: 4 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <span style={{ marginRight: 16 }}>ไม่มี</span>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      border: '1px solid #000',
                      marginRight: 8,
                    }}
                  ></div>
                  <span>มี แต่ปริมาณลดลง</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 16,
                    marginBottom: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: '1px solid #000',
                        marginRight: 8,
                      }}
                    ></div>
                    <span>ฝังสถานี.........จุด</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: '1px solid #000',
                        marginRight: 8,
                      }}
                    ></div>
                    <span>เปลี่ยนไม้สถานี</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: '1px solid #000',
                        marginRight: 8,
                      }}
                    ></div>
                    <span>เปลี่ยนฝาสถานี</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: '1px solid #000',
                        marginRight: 8,
                      }}
                    ></div>
                    <span>เติมสาร focus ล่อปลวก</span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      border: '1px solid #000',
                      marginRight: 8,
                    }}
                  ></div>
                  <span>วางกล่อง.......กล่อง บริเวณ</span>
                </div>
                <div
                  style={{
                    borderBottom: '1px dotted #000',
                    height: 24,
                    marginBottom: 4,
                  }}
                ></div>
                <div
                  style={{
                    borderBottom: '1px dotted #000',
                    height: 24,
                    marginBottom: 4,
                  }}
                ></div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 16,
                    marginBottom: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: '1px solid #000',
                        marginRight: 8,
                      }}
                    ></div>
                    <span>เติมเหยื่อ.......กล่อง</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: '1px solid #000',
                        marginRight: 8,
                      }}
                    ></div>
                    <span>พบปลวกกินเหยื่อ........กล่อง</span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 16,
                    marginBottom: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: '1px solid #000',
                        marginRight: 8,
                      }}
                    ></div>
                    <span>อัดน้ำยารอบบ้าน</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: '1px solid #000',
                        marginRight: 8,
                      }}
                    ></div>
                    <span>อัดน้ำยาเข้าท่อปลวก.........จุด</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: '1px solid #000',
                        marginRight: 8,
                      }}
                    ></div>
                    <span>อัดน้ำยาเข้าช่องชาร์ป</span>
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      border: '1px solid #000',
                      marginRight: 8,
                    }}
                  ></div>
                  <span>สเปรย์น้ำยาภายในสวน</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page 2 */}
      <div
        id="service-report-page-2"
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
        <div style={{ fontSize: 16, lineHeight: 1.8 }}>
          {/* Top Spray Options (Continuation) */}
          <div style={{ paddingLeft: 80, marginBottom: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '1px solid #000',
                    marginRight: 8,
                  }}
                ></div>
                <span>สเปรย์น้ำยาชีวภาพ</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '1px solid #000',
                    marginRight: 8,
                  }}
                ></div>
                <span>รอบอาคาร</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '1px solid #000',
                    marginRight: 8,
                  }}
                ></div>
                <span>ช่องชาร์ป</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '1px solid #000',
                    marginRight: 8,
                  }}
                ></div>
                <span>ภายในอาคาร</span>
              </div>
            </div>
          </div>

          {/* Ants */}
          <div style={{ display: 'flex', marginBottom: 4 }}>
            <div style={{ fontWeight: 700, minWidth: 80 }}>มด</div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  border: '1px solid #000',
                  marginRight: 8,
                }}
              ></div>
              <span>หยอดเหยื่อ</span>
            </div>
          </div>

          {/* Cockroaches */}
          <div style={{ display: 'flex', marginBottom: 4 }}>
            <div style={{ fontWeight: 700, minWidth: 80 }}>แมลงสาบ</div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  border: '1px solid #000',
                  marginRight: 8,
                }}
              ></div>
              <span>หยอดเหยื่อ</span>
            </div>
          </div>

          {/* Rats */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: 4,
            }}
          >
            <div style={{ fontWeight: 700, minWidth: 80 }}>หนู</div>
            <div
              style={{ display: 'flex', flexWrap: 'wrap', gap: 16, flex: 1 }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '1px solid #000',
                    marginRight: 8,
                  }}
                ></div>
                <span>วางถาดกาว</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '1px solid #000',
                    marginRight: 8,
                  }}
                ></div>
                <span>วางเครื่องดักหนู</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '1px solid #000',
                    marginRight: 8,
                  }}
                ></div>
                <span>วางสถานีดักหนู</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '1px solid #000',
                    marginRight: 8,
                  }}
                ></div>
                <span>เติมเหยื่อสถานีดักหนู</span>
              </div>
            </div>
          </div>

          {/* Lizards */}
          <div style={{ display: 'flex', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, minWidth: 80 }}>จิ้งจก</div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  border: '1px solid #000',
                  marginRight: 8,
                }}
              ></div>
              <span>วางบ้านดักจิ้งจก แมลงคลาน</span>
            </div>
          </div>

          {/* Others */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>อื่นๆ</div>
            <div
              style={{
                borderBottom: '1px dotted #000',
                height: 24,
                marginBottom: 8,
              }}
            ></div>
            <div
              style={{
                borderBottom: '1px dotted #000',
                height: 24,
                marginBottom: 24,
              }}
            ></div>
          </div>

          {/* Next Service */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontWeight: 700 }}>เข้าทำครั้งต่อไปประมาณ</span>
              <span
                style={{
                  borderBottom: '1px dotted #000',
                  minWidth: 150,
                  flex: '0 1 auto',
                }}
              ></span>
              <span style={{ fontWeight: 700 }}>เพื่อ</span>

              <div
                style={{ display: 'flex', alignItems: 'center', marginLeft: 8 }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '1px solid #000',
                    marginRight: 8,
                  }}
                ></div>
                <span>เติมเหยื่อ</span>
              </div>
              <div
                style={{ display: 'flex', alignItems: 'center', marginLeft: 8 }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '1px solid #000',
                    marginRight: 8,
                  }}
                ></div>
                <span>อัดน้ำยา</span>
              </div>
              <div
                style={{ display: 'flex', alignItems: 'center', marginLeft: 8 }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '1px solid #000',
                    marginRight: 8,
                  }}
                ></div>
                <span>ตรวจเช็ค</span>
              </div>
              <div
                style={{ display: 'flex', alignItems: 'center', marginLeft: 8 }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '1px solid #000',
                    marginRight: 8,
                  }}
                ></div>
                <span>ฝังสถานี</span>
              </div>
              <div
                style={{ display: 'flex', alignItems: 'center', marginLeft: 8 }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '1px solid #000',
                    marginRight: 8,
                  }}
                ></div>
                <span>ต่อสัญญา</span>
              </div>
            </div>
          </div>

          {/* Service Staff */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <span
                style={{
                  fontWeight: 700,
                  marginRight: 16,
                  minWidth: 100,
                  paddingTop: 4,
                }}
              >
                พนักงานบริการ
              </span>
              <div style={{ flex: 1 }}>
                {/* 1 */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ marginRight: 8 }}>1.</span>
                    <div
                      style={{ borderBottom: '1px dotted #000', flex: 1 }}
                    ></div>
                  </div>
                </div>

                {/* 2 */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ marginRight: 8 }}>2.</span>
                    <div
                      style={{ borderBottom: '1px dotted #000', flex: 1 }}
                    ></div>
                  </div>
                </div>

                {/* 3 */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ marginRight: 8 }}>3.</span>
                    <div
                      style={{ borderBottom: '1px dotted #000', flex: 1 }}
                    ></div>
                  </div>
                </div>

                {/* 4 */}
                <div style={{ marginBottom: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ marginRight: 8 }}>4.</span>
                    <div
                      style={{ borderBottom: '1px dotted #000', flex: 1 }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceReportForm;
