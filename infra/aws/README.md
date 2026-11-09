# infra/aws

> **เลิกใช้แล้ว — ดู `infra/digitalocean/` แทน**
>
> ระบบเครื่องมือภายใน (`apps/api` + `apps/internal`) รันบน DigitalOcean Droplet
> ที่เช่าไว้แล้ว ไม่ได้ใช้ AWS โน้ตด้านล่างเก็บไว้เป็นประวัติของแผนเดิมเท่านั้น


Note/IaC สำหรับ deploy **Go API** (`apps/api`) บน AWS (Lightsail / EC2 `t4g.micro` free-tier).

> ของจริงใส่ใน **Step 8** (optional) — รัน Docker + reverse proxy/TLS + security group
