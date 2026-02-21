import React from 'react';

export const ContractForm: React.FC = () => {
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
        id="contract-a4-page-1"
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
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%) rotate(-45deg)',
            fontSize: '48px',
            fontWeight: 700,
            color: '#e2e8f0',
            opacity: 0.4,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0,
          }}
        >
          Mr. GREEN PEST CONTROL CO., LTD.
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '2px solid #000',
              paddingBottom: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', gap: 12 }}>
              <img
                src="/LOGO-GO mrgreen.png"
                alt="Thai Propma"
                style={{ height: 64, width: 'auto', objectFit: 'contain' }}
              />
              <img
                src="/LOGO-GO mrgreen.png"
                alt="Mr.Green"
                style={{ height: 64, width: 'auto', objectFit: 'contain' }}
              />
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, lineHeight: 1.4 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                บริษัท มิสเตอร์กรีน เพสท์ คอนโทรล จำกัด
              </div>
              <div>
                สำนักงานใหญ่ : เลขที่ 50/127 ถนนนวมินทร์ 1 (ม.เสนานิเวศน์โครงการ
                1)
              </div>
              <div>แขวง/เขตลาดพร้าว กรุงเทพฯ 10230</div>
              <div>โทร. 0-2578-1438 , 095-374-7897 โทรสาร. 0-2578-1439</div>
              <div>www.mrgreen.co.th</div>
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              textAlign: 'center',
              fontSize: 24,
              fontWeight: 700,
              marginBottom: 24,
            }}
          >
            สัญญาบริการ
          </div>

          {/* Date & Contract No */}
          <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 14 }}>
            <div style={{ marginBottom: 4 }}>วันที่</div>
            <div>สัญญาเลขที่</div>
          </div>

          {/* Items 1-9 */}
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            {/* 1. Employer */}
            <div style={{ display: 'flex', marginBottom: 8 }}>
              <div style={{ width: 24, fontWeight: 700 }}>1.</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>ผู้ว่าจ้าง</div>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: 80, fontWeight: 700 }}>ที่อยู่</div>
                  <div></div>
                </div>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: 80, fontWeight: 700 }}>เบอร์ติดต่อ</div>
                  <div></div>
                </div>
              </div>
            </div>

            {/* 2. Contractor */}
            <div style={{ display: 'flex', marginBottom: 8 }}>
              <div style={{ width: 24, fontWeight: 700 }}>2.</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>ผู้รับจ้าง</div>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: 80, fontWeight: 700 }}>ที่อยู่</div>
                  <div></div>
                </div>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: 80, fontWeight: 700 }}>เบอร์ติดต่อ</div>
                  <div></div>
                </div>
              </div>
            </div>

            {/* 3. Location & Building Type */}
            <div style={{ display: 'flex', marginBottom: 8 }}>
              <div style={{ width: 24, fontWeight: 700 }}>3.</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', marginBottom: 8 }}>
                  <div style={{ width: 140, fontWeight: 700 }}>
                    สถานที่ให้บริการ
                  </div>
                  <div>:</div>
                </div>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: 140, fontWeight: 700 }}>
                    ประเภทสิ่งปลูกสร้าง
                  </div>
                  <div>:</div>
                </div>
              </div>
            </div>

            {/* 4. Service Type */}
            <div style={{ display: 'flex', marginBottom: 8 }}>
              <div style={{ width: 24, fontWeight: 700 }}>4.</div>
              <div style={{ flex: 1, display: 'flex' }}>
                <div style={{ width: 140, fontWeight: 700 }}>ประเภทบริการ</div>
                <div>:</div>
              </div>
            </div>

            {/* 5. System */}
            <div style={{ display: 'flex', marginBottom: 8 }}>
              <div style={{ width: 24, fontWeight: 700 }}>5.</div>
              <div style={{ flex: 1, display: 'flex' }}>
                <div style={{ width: 140, fontWeight: 700 }}>
                  ระบบที่ใช้บริการ
                </div>
                <div>:</div>
              </div>
            </div>

            {/* 6. Period */}
            <div style={{ display: 'flex', marginBottom: 8 }}>
              <div style={{ width: 24, fontWeight: 700 }}>6.</div>
              <div style={{ flex: 1, display: 'flex' }}>
                <div style={{ width: 140, fontWeight: 700 }}>ระยะเวลาสัญญา</div>
                <div>:</div>
              </div>
            </div>

            {/* 7. Frequency */}
            <div style={{ display: 'flex', marginBottom: 8 }}>
              <div style={{ width: 24, fontWeight: 700 }}>7.</div>
              <div style={{ flex: 1, display: 'flex' }}>
                <div style={{ width: 140, fontWeight: 700 }}>การเข้าบริการ</div>
                <div>:</div>
              </div>
            </div>

            {/* 8. Fee */}
            <div style={{ display: 'flex', marginBottom: 8 }}>
              <div style={{ width: 24, fontWeight: 700 }}>8.</div>
              <div style={{ flex: 1, display: 'flex' }}>
                <div style={{ width: 140, fontWeight: 700 }}>
                  อัตราค่าบริการ
                </div>
                <div>:</div>
              </div>
            </div>

            {/* 9. Payment Terms */}
            <div style={{ display: 'flex', marginBottom: 8 }}>
              <div style={{ width: 24, fontWeight: 700 }}>9.</div>
              <div style={{ flex: 1, display: 'flex' }}>
                <div style={{ width: 140, fontWeight: 700 }}>
                  เงื่อนไขการชำระเงิน
                </div>
                <div>:</div>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 60,
              paddingLeft: 10,
              paddingRight: 10,
            }}
          >
            {/* Left: Employer */}
            <div
              style={{
                width: '48%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  marginBottom: 16,
                  whiteSpace: 'nowrap',
                  fontSize: 13,
                }}
              >
                <span style={{ fontWeight: 700, marginRight: 8 }}>ลงนาม</span>
                <span>
                  .......................................................
                </span>
                <span style={{ fontWeight: 700, marginLeft: 8 }}>
                  ผู้ว่าจ้าง
                </span>
              </div>
              <div style={{ textAlign: 'center', fontSize: 13 }}>
                <div style={{ marginBottom: 4 }}>( คุณชยกร อัคราชนกุล )</div>
                <div style={{ fontWeight: 700 }}>ผู้ว่าจ้าง</div>
              </div>
            </div>

            {/* Right: Contractor */}
            <div
              style={{
                width: '48%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  marginBottom: 16,
                  whiteSpace: 'nowrap',
                  fontSize: 13,
                }}
              >
                <span style={{ fontWeight: 700, marginRight: 8 }}>ลงนาม</span>
                <span>
                  .......................................................
                </span>
                <span style={{ fontWeight: 700, marginLeft: 8 }}>
                  ผู้รับจ้าง
                </span>
              </div>
              <div style={{ textAlign: 'center', fontSize: 13 }}>
                <div style={{ marginBottom: 4 }}>
                  ( นายธนะพัฒน์ บริบูรณ์ชัยานนท์ )
                </div>
                <div style={{ fontWeight: 700 }}>ผู้รับจ้าง</div>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div
            style={{
              marginTop: 32,
              border: '2px solid #ff0000',
              padding: 12,
              color: '#ff0000',
              fontWeight: 700,
              fontSize: 14,
              lineHeight: 1.5,
              position: 'relative',
            }}
          >
            <div style={{ marginBottom: 4 }}>
              <span style={{ textDecoration: 'underline' }}>หมายเหตุ</span>{' '}
              หากชำระค่าบริการผ่านการโอนเงิน กรุณาแจ้ง ชื่อ – นามสกุล หรือ
              เลขที่สัญญาพร้อมแนบหลักฐานการโอนชำระเงิน
            </div>
            <div style={{ textAlign: 'center', marginBottom: 4 }}>
              <span style={{ textDecoration: 'underline' }}>
                ที่เบอร์ติดต่อ
              </span>
              : 095 – 374 – 7897{' '}
              <span style={{ textDecoration: 'underline' }}>Id Line</span> :
              0953747897 หรือ @mrgreen
            </div>
            <div style={{ marginBottom: 4 }}>
              หรือ หากชำระค่าบริการเป็นเงินสด
              โปรดเรียกใบเสร็จรับเงินจากพนักงานที่รับชำระเงินเป็นหลักฐานด้วยทุกครั้ง
            </div>
            <div>
              บริษัทฯ ขอสงวนสิทธิ์หากไม่ดำเนินการตามข้างต้น
              ในการติดตามทวงถามการชำระเงินต่อไป
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: -160,
              left: 20,
              opacity: 0.2,
            }}
          >
            <img
              src="/mrgreen1.png"
              alt=""
              style={{ width: 250, height: 'auto' }}
            />
          </div>
        </div>
      </div>

      {/* Page 2 */}
      <div
        id="contract-form-page-2"
        style={{
          width: '210mm',
          height: '297mm',
          padding: '20mm',
          backgroundColor: '#fff',
          boxShadow: '0 0 10px rgba(0,0,0,0.1)',
          margin: '0 auto 20px',
          position: 'relative',
          boxSizing: 'border-box',
          color: '#000',
          fontSize: '14px',
          lineHeight: '1.8',
          fontFamily: 'Sarabun, sans-serif',
          pageBreakAfter: 'always',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%) rotate(-45deg)',
            fontSize: '48px',
            fontWeight: 700,
            color: '#e2e8f0',
            opacity: 0.4,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0,
          }}
        >
          Mr. GREEN PEST CONTROL CO., LTD.
        </div>
        <div
          style={{
            textAlign: 'center',
            fontWeight: 700,
            fontSize: 20,
            marginBottom: 16,
          }}
        >
          เอกสารแนบท้ายสัญญา
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            1. ขอบเขตงานบริการ
          </div>
          <div style={{ textIndent: 36, textAlign: 'left' }}>
            ผู้รับจ้างตกลงให้บริการแก่ผู้ว่าจ้างตามประเภทบริการตามสัญญา ข้อ4.
            หากพบปลวกในระยะเวลาของสัญญาตามข้อ 6.
            ผู้รับจ้างยินดีให้บริการโดยไม่มีค่าใช้จ่ายใดๆ เพิ่มเติม
            และขอสงวนสิทธิ์ความเสียหายของบ้านอันเกิดขึ้นจาก ปลวก แมลง
            และสัตว์รบกวนอื่นๆ จะไม่อยู่ในส่วนของผู้รับจ้าง
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            2. การเข้าบริการ
          </div>
          <div style={{ textIndent: 36, textAlign: 'left' }}>
            ผู้รับจ้างจะให้บริการแก่ผู้ว่าจ้างตามสัญญาข้อ 7.
            โดยผู้รับจ้างจะนัดหมายผู้รับจ้างอย่างน้อย 1 วัน
            ก่อนเข้าบริการแก่ผู้ว่าจ้าง
            ในกรณีที่ผู้รับจ้างได้ดำเนินการกำจัดปลวกให้แก่ผู้ว่าจ้างจนหมดแล้ว
            ในช่วงที่ระยะเวลาของสัญญา
            ผู้ว่าจ้างไม่สะดวกให้ผู้รับจ้างเข้าดำเนินการตรวจเช็คปลวกตามตารางเข้าปฏิบัติงาน
            และพบปลวกชุดใหม่ภายในสถานที่ให้บริการของผู้ว่าจ้าง
            ผู้รับจ้างยินดีบริการกำจัดปลวกชุดใหม่ให้แก่ผู้ว่าจ้าง
            แต่ขอสงวนสิทธิ์ในการคิดค่าบริการเพิ่มเติมกับผู้ว่าจ้าง
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>3. ค่าบริการ</div>
          <div style={{ textIndent: 36, textAlign: 'left' }}>
            ผู้ว่าจ้างจะจ่ายค่าบริการเพื่อตอบแทนการให้บริการตามขอบเขตของงานบริการที่ตกลงไว้กับผู้รับจ้างตามอัตราค่าบริการตามสัญญา
            ข้อ 8. โดยมีเงื่อนไขการชำระเงินตามสัญญาข้อ 9.
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            4. ระยะเวลาและการบอกเลิกสัญญา
          </div>
          <div
            style={{
              paddingLeft: 16,
              textIndent: 20,
              textAlign: 'left',
              marginBottom: 4,
            }}
          >
            4.1 สัญญาฉบับนี้มีผลบังคับใช้ตามสัญญาข้อ 6. หากครบกำหนดแล้ว
            ผู้รับจ้างยังให้บริการตามสัญญาข้อ 7.ไม่ครบถ้วน
            ผู้รับจ้างจะให้บริการจนครบตามสัญญา แต่ผู้รับจ้างขอสงวนสิทธิ์
            หากมีการนัดหมายแล้ว ผู้ว่าจ้างไม่สะดวกในการรับบริการ 3 ครั้ง
            จะนับเป็นการให้บริการ 1 ครั้ง
          </div>
          <div
            style={{
              paddingLeft: 16,
              textIndent: 20,
              textAlign: 'left',
              marginBottom: 4,
            }}
          >
            4.2 ในระหว่างสัญญานี้มีผลบังคับ
            หากผู้ว่าจ้างประสงค์จะบอกเลิกสัญญาไม่ว่าเวลาใด
            จะต้องแจ้งเป็นลายลักษณ์อักษรไปยังผู้รับจ้างทราบล่วงหน้าไม่น้อยกว่า
            30 (สามสิบ) วัน และจะต้องชำระค่าบริการตามสัญญาข้อ 8. ให้ครบถ้วน
            หรือตามจำนวนที่ผู้ให้บริการกำหนด
          </div>
          <div style={{ paddingLeft: 16, textIndent: 20, textAlign: 'left' }}>
            4.3 หากผู้ว่าจ้างผิดนัดไม่ชำระค่าบริการให้กับผู้รับจ้าง ตามสัญญาข้อ
            8. และ ข้อ 9. ผู้ให้บริการมีสิทธิเรียกดอกเบี้ยในอัตราร้อยละ 7.5
            (เจ็ดจุดห้า)
            ต่อปีของต้นเงินที่ค้างชำระจนกว่าผู้ว่าจ้างจะชำระเสร็จและมีสิทธิบอกเลิกสัญญากับผู้ว่าจ้างได้ทันที
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            5. คำรับรองของผู้รับจ้าง
          </div>
          <div style={{ textIndent: 36, textAlign: 'left' }}>
            ผู้รับจ้างให้การรับรองว่าจะกระทำการภายใต้สัญญานี้โดยใช้ทักษะ
            ความเชี่ยวชาญ ความชำนาญ ประสบการณ์ในการดำเนินการใด ๆ
            เพื่อเพิ่มประสิทธิภาพ การให้บริการ ให้ได้อย่างดีที่สุด
            และจะไม่นำข้อมูลของผู้ว่าจ้างไปใช้ประโยชน์เป็นการส่วนตัว
            หรือเพื่อประโยชน์ของบุคคลภายนอกไม่ว่าทางตรงหรือทางอ้อม
            โดยไม่ได้รับความยินยอมจากผู้ว่าจ้างโดยเด็ดขาด
            และยินยอมรับผิดชอบความเสียหายใด ๆ
            ที่เกิดขึ้นกับผู้ว่าจ้างหากผู้ให้บริการฝ่าฝืนข้อห้ามนี้
          </div>
        </div>

        <div
          style={{ position: 'absolute', bottom: 20, right: 20, opacity: 0.2 }}
        >
          <img
            src="/mrgreen1.png"
            alt=""
            style={{ width: 250, height: 'auto' }}
          />
        </div>
      </div>

      {/* Page 3 */}
      <div
        id="contract-form-page-3"
        style={{
          width: '210mm',
          height: '297mm',
          padding: '20mm',
          backgroundColor: '#fff',
          boxShadow: '0 0 10px rgba(0,0,0,0.1)',
          margin: '0 auto 20px',
          position: 'relative',
          boxSizing: 'border-box',
          color: '#000',
          fontSize: '14px',
          lineHeight: '1.8',
          fontFamily: 'Sarabun, sans-serif',
          pageBreakAfter: 'always',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%) rotate(-45deg)',
            fontSize: '48px',
            fontWeight: 700,
            color: '#e2e8f0',
            opacity: 0.4,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0,
          }}
        >
          Mr. GREEN PEST CONTROL CO., LTD.
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            6. การโอนสิทธิภายใต้สัญญา
          </div>
          <div style={{ textIndent: 36, textAlign: 'left' }}>
            ห้ามมิให้คู่สัญญาโอนสิทธิเรียกร้องหรือข้อตกลงตามสัญญาฉบับนี้ให้แก่บุคคลภายนอก
            หรือมอบหมายให้บุคคลอื่นเข้าเป็นคู่สัญญาแทนกัน หรือดำเนินการใดๆ
            แทนไม่ว่าทั้งหมดหรือบางส่วน
            เว้นแต่จะได้รับความยินยอมจากคู่สัญญาอีกฝ่ายหนึ่งเป็นลายลักษณ์อักษรเสียก่อน
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            7. ความสมบูรณ์และการแก้ไขสัญญา
          </div>
          <div style={{ textIndent: 36, textAlign: 'left' }}>
            สัญญาฉบับนี้ คู่สัญญาได้ตกลงกันโดยความเข้าใจและสมัครใจ
            ไม่ได้ถูกบังคับ หรือสำคัญผิดในสาระสำคัญ จึงมีผลสมบูรณ์
            หากคู่สัญญาฝ่ายใดประสงค์จะแก้ไขเปลี่ยนแปลงเพื่อความเหมาะสมหรือเพิ่มการให้บริการ
            หรือลดทอนหน้าที่ หรือเปลี่ยนแปลงค่าบริการ
            หรือข้ออื่นใดในสัญญาทั้งหมดหรือแต่บางส่วนก็ตาม
            คู่สัญญาทั้งสองฝ่ายจะต้องให้ความตกลงแก้ไขเพิ่มเติมสัญญาเป็นลายลักษณ์อักษรและลงนามทั้งสองฝ่าย
            หากปรากฏว่าข้อตกลงข้อใดในสัญญานี้ไม่สมบูรณ์ไม่สามารถใช้บังคับได้
            จะไม่กระทบถึงข้อตกลงข้ออื่นที่สมบูรณ์และมีผลบังคับใช้ได้อยู่
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            8. ข้อกำหนดอื่น ๆ
          </div>
          <div
            style={{
              paddingLeft: 16,
              textIndent: 20,
              textAlign: 'left',
              marginBottom: 4,
            }}
          >
            8.1 คำบอกกล่าวที่คู่สัญญาจะมีต่อกันเป็นลายลักษณ์อักษร
            หากมีการลงชื่อรับรองว่าได้รับหนังสือแล้ว
            หรือมีการส่งและตอบรับในจดหมายอิเล็กทรอนิกส์(อีเมล)
            หรือส่งและตอบรับทางโทรสาร ไลน์
            หรือหากได้ทำการส่งทางไปรษณีย์ลงทะเบียนตอบรับไปยังที่อยู่ตามที่ระบุในสัญญานี้
            ให้ถือว่าส่งโดยชอบด้วยกฎหมายแล้ว
          </div>
          <div style={{ paddingLeft: 16, textIndent: 20, textAlign: 'left' }}>
            8.2 สัญญาฉบับนี้ให้อยู่ภายใต้บังคับตามกฎหมายในราชอาณาจักรไทย
          </div>
        </div>

        <div
          style={{
            marginTop: 24,
            textAlign: 'center',
            color: 'red',
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในหนังสือนี้ตลอดแล้วเห็นว่าถูกต้องตามความประสงค์ทุกประการจึงลงลายมือชื่อไว้
        </div>

        <div
          style={{ position: 'absolute', bottom: 20, right: 20, opacity: 0.2 }}
        >
          <img
            src="/mrgreen1.png"
            alt=""
            style={{ width: 250, height: 'auto' }}
          />
        </div>
      </div>
    </div>
  );
};

export default ContractForm;
