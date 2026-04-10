# Service Schedules Module

## Pages

### 1. ServiceSchedule (ตารางปฏิบัติงาน)
- CRUD ตารางเข้าปฏิบัติงาน (visit_no, month, work_task, service_details)
- Export PDF

### 2. ServiceDetail (รายละเอียดขั้นตอนบริการ)
- CRUD master data สำหรับรายละเอียดขั้นตอนการให้บริการ
- TipTap rich text editor (bold, italic, underline, headings, lists, text align, color, highlight, font-size, tables)
- HTML content sanitized ด้วย `sanitize-html` ที่ backend ก่อนบันทึก
- Export PDF standalone
- เชื่อมกับ Quotation/Contract เป็นเอกสารแนบท้าย

## การเชื่อมกับ Quotation & Contract

### ใบเสนอราคา (Quotation)
- เลือกแนบ **รายละเอียดงานโดยสังเขป** (service_procedure_template_id)
- เลือกแนบ **ตารางเข้าปฏิบัติงาน** (service_schedule_id)
- ตอน Export PDF → merge เป็นไฟล์เดียว: ใบเสนอราคา + รายละเอียดงาน + ตารางปฏิบัติงาน

### สัญญาบริการ (Contract)
- เลือกแนบ **ตารางเข้าปฏิบัติงาน** (service_schedule_id)
- Auto-copy จาก Quotation ที่เลือก (แก้ไขได้)
- ตอน Export PDF → merge เป็นไฟล์เดียว: สัญญาบริการ + ตารางปฏิบัติงาน

## Tech Stack
- **Frontend**: TipTap editor, React, TypeScript
- **Backend**: NestJS, Sequelize, sanitize-html, Puppeteer + Handlebars (PDF), pdf-lib (merge)
- **API**: `/service-procedure-templates` (master module), permissions: SERVICE_PROCEDURE_TEMPLATE

## Database

### service_procedure_templates
| Column | Type |
|---|---|
| id | UUID PK |
| name | VARCHAR(255) |
| content | LONGTEXT (HTML) |
| is_active | BOOLEAN |
| created_by | UUID FK → users |
| updated_by | UUID FK → users |
| deleted_at | DATETIME (soft delete) |

### quotations (columns เพิ่ม)
| Column | Type |
|---|---|
| service_procedure_template_id | UUID FK → service_procedure_templates |
| service_schedule_id | UUID FK → service_schedules |

### contracts (column เพิ่ม)
| Column | Type |
|---|---|
| service_schedule_id | UUID FK → service_schedules |
