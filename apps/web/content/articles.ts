// Guides for each service, in both languages. Bodies use a small Markdown subset
// rendered by components/site/ArticleBody.tsx: ## ### > - 1. **bold** [text](url).

import type { Locale } from "@/lib/i18n";

export interface Faq {
  q: string;
  a: string;
}

interface ArticleCopy {
  title: string;
  description: string;
  keywords: readonly string[];
  imageAlt: string;
  category: string;
  body: string;
  faq: readonly Faq[];
}

export interface Article extends Record<Locale, ArticleCopy> {
  slug: string;
  /** Service this guide supports; drives internal links. */
  service: string;
  image: string;
  datePublished: string;
}

export const articles: readonly Article[] = [
  {
    slug: "integrated-brand-campaign",
    service: "digital-marketing",
    image: "/imagery/articles/integrated-campaign.webp",
    datePublished: "2026-11-09",
    th: {
      title: "แคมเปญแบรนด์แบบครบวงจร: ทำไมระบบ อีเวนต์ KOL และโฆษณาควรวางแผนร่วมกัน",
      description:
        "คู่มือวางแคมเปญแบรนด์แบบครบวงจร เชื่อมเว็บไซต์ กิจกรรมหน้างาน KOL โฆษณา และข้อมูลลูกค้าให้ทำงานต่อกัน แทนการแยกจ้างทีละส่วน",
      keywords: ["แคมเปญแบรนด์ครบวงจร", "Integrated Marketing Campaign", "Brand Activation", "วางแผนแคมเปญการตลาด", "Brand Experience"],
      imageAlt: "พื้นที่ทำงาน งานอีเวนต์ และสตูดิโอถ่ายทำที่เชื่อมต่อกันในภาพเดียว",
      category: "กลยุทธ์แบรนด์",
      body: `แคมเปญจำนวนมากใช้งบไม่น้อย แต่แต่ละส่วนทำงานแยกกัน ทีมเว็บไม่รู้ว่าหน้างานเก็บข้อมูลอะไร ทีมโฆษณาไม่รู้ว่า KOL พูดเรื่องอะไร สุดท้ายแบรนด์ได้กิจกรรมหลายอย่าง แต่ไม่ได้เรื่องเล่าเดียวที่คนจำได้

**แคมเปญแบบครบวงจร** คือการวางทุกจุดสัมผัสให้ส่งต่อกัน ตั้งแต่คนเห็นโฆษณา เข้าร่วมกิจกรรม ไปจนถึงกลับมาซื้อซ้ำ

## ปัญหาของการแยกจ้างทีละส่วน

- ข้อมูลลูกค้าจากงานอีเวนต์ไม่ถูกนำไปใช้ต่อ
- ข้อความของ KOL โฆษณา และเว็บไซต์ไม่ตรงกัน
- วัดผลแยกกัน จึงตอบไม่ได้ว่าอะไรทำให้เกิดยอดขาย
- ต้องประสานงานหลายทีมเอง เสียเวลาทั้งก่อนและหลังงาน

## โครงสร้าง 3 ขั้นที่ทำให้แคมเปญต่อเนื่อง

### Build: วางระบบรองรับก่อน

เริ่มจาก[เว็บไซต์และซอฟต์แวร์](/services/website-software/)ที่พร้อมรับคนจากทุกช่องทาง มีหน้าแคมเปญ ระบบเก็บข้อมูล และการติดตามผลที่ตั้งค่าไว้ตั้งแต่ต้น

### Activate: ทำให้คนอยากเข้าร่วม

ใช้[เกมบน Kiosk](/services/event-interactive/) [KOL ที่ตรงกลุ่ม](/services/kol-influencer/) และ[ทีมถ่ายทำหน้างาน](/services/event-content/) เพื่อเปลี่ยนความสนใจเป็นการมีส่วนร่วม

### Grow: ต่อยอดเป็นลูกค้า

นำข้อมูลและคอนเทนต์ไปใช้ใน[การตลาดดิจิทัล](/services/digital-marketing/) และฟังเสียงตอบรับผ่าน[Social Listening](/services/social-listening/) เพื่อปรับรอบถัดไป

> แคมเปญที่ดีไม่ได้จบวันงาน แต่ทุกขั้นต้องส่งข้อมูลให้ขั้นถัดไปใช้งานต่อได้

## เริ่มวางแผนจากคำถาม 4 ข้อ

1. เป้าหมายหลักคือการรับรู้ รายชื่อลูกค้า หรือยอดขาย
2. กลุ่มเป้าหมายอยู่ที่ไหนและเชื่อใครมากที่สุด
3. ข้อมูลอะไรที่ต้องเก็บ และจะใช้ต่ออย่างไร
4. ตัวเลขใดจะบอกว่าแคมเปญนี้สำเร็จ

เมื่อตอบได้ครบ การเลือกช่องทางจะง่ายขึ้นมาก เพราะทุกกิจกรรมมีหน้าที่ชัดเจน`,
      faq: [
        { q: "แคมเปญแบบครบวงจรเหมาะกับแบรนด์ขนาดไหน", a: "เหมาะกับแบรนด์ทุกขนาดที่มีเป้าหมายชัดเจน แคมเปญไม่จำเป็นต้องใช้ทุกช่องทาง แต่ช่องทางที่เลือกควรส่งข้อมูลต่อกันได้" },
        { q: "ต้องเริ่มจากเว็บไซต์ก่อนเสมอไหม", a: "ไม่จำเป็น แต่ควรมีจุดปลายทางที่รับคนจากแคมเปญและเก็บข้อมูลได้ ซึ่งอาจเป็นหน้าแคมเปญหน้าเดียวก็ได้" },
      ],
    },
    en: {
      title: "Integrated Brand Campaigns: Why Systems, Events, KOLs and Ads Belong Together",
      description:
        "A practical guide to integrated brand campaigns that connect websites, on-site activations, KOLs, paid media and customer data instead of running them apart.",
      keywords: ["integrated brand campaign", "brand activation strategy", "integrated marketing campaign", "brand experience agency"],
      imageAlt: "A workspace, an event floor and a film studio connected in one continuous view",
      category: "Brand strategy",
      body: `Many campaigns spend real money while each part runs on its own. The web team does not know what the event floor collects. The media team does not know what the KOLs are saying. The brand ends up with plenty of activity and no single story people remember.

An **integrated campaign** designs every touchpoint to hand off to the next, from the first ad to the event to the repeat purchase.

## What goes wrong when each part is bought separately

- Customer data from events never gets used again
- KOLs, ads and the website say different things
- Results are measured apart, so nobody can say what drove sales
- The brand spends its own time coordinating vendors

## A three-stage structure that keeps a campaign connected

### Build: put the foundation in place

Start with [websites and software](/en/services/website-software/) that can receive people from every channel, with campaign pages, data capture and measurement set up from day one.

### Activate: give people a reason to join

Use [kiosk games](/en/services/event-interactive/), [well-matched KOLs](/en/services/kol-influencer/) and an [on-site film crew](/en/services/event-content/) to turn attention into participation.

### Grow: turn participants into customers

Feed the data and content into [digital marketing](/en/services/digital-marketing/), then use [social listening](/en/services/social-listening/) to improve the next round.

> A good campaign does not end on event day. Every stage should hand usable data to the next.

## Start planning with four questions

1. Is the main goal awareness, leads or sales?
2. Where is the audience, and who do they trust?
3. What data do we need, and how will we use it?
4. Which number tells us the campaign worked?

Once these are answered, choosing channels gets much easier because every activity has a clear job.`,
      faq: [
        { q: "What size of brand is an integrated campaign for?", a: "Any brand with a clear goal. A campaign does not need every channel, but the channels it uses should be able to pass data to one another." },
        { q: "Do we always need to start with a website?", a: "Not necessarily, but you need a destination that receives campaign traffic and captures data. A single campaign page can be enough." },
      ],
    },
  },
  {
    slug: "event-kiosk-games",
    service: "event-interactive",
    image: "/imagery/articles/kiosk-event.webp",
    datePublished: "2026-11-09",
    th: {
      title: "เกม Kiosk จอทัชสกรีนสำหรับงานอีเวนต์: วางแผนอย่างไรให้คนอยากเล่นและแบรนด์ได้ข้อมูล",
      description:
        "แนวทางทำเกมบน Kiosk จอทัชสกรีนสำหรับงานอีเวนต์และบูธ ตั้งแต่เลือกรูปแบบเกม ออกแบบหน้าจอดึงดูด เก็บข้อมูลตาม PDPA ไปจนถึงแผนสำรองหน้างาน",
      keywords: ["เกม Kiosk", "เกมจอทัชสกรีน งานอีเวนต์", "เกมออกบูธ", "Interactive Booth", "กิจกรรมบูธงานอีเวนต์", "Brand Activation"],
      imageAlt: "ผู้ร่วมงานยืนล้อมตู้ Kiosk จอทัชสกรีนในงานเปิดตัวแบรนด์",
      category: "Event Interactive",
      body: `บูธที่มีแค่ป้ายและโบรชัวร์ทำให้คนเดินผ่านได้ง่าย **เกมบน Kiosk จอทัชสกรีน** ช่วยให้คนหยุด ลองเล่น และใช้เวลากับแบรนด์นานขึ้น แต่เกมจะได้ผลก็ต่อเมื่อวางแผนจากเป้าหมายของแคมเปญ ไม่ใช่จากความสนุกอย่างเดียว

## เริ่มจากสิ่งที่แบรนด์อยากได้

- **อยากให้คนรู้จักสินค้า:** ใช้เกมที่พาคนผ่านจุดเด่นของสินค้า
- **อยากได้รายชื่อลูกค้า:** ให้กรอกข้อมูลเพื่อรับรางวัลหลังเล่นจบ
- **อยากให้คนแชร์:** ออกแบบผลลัพธ์ให้ถ่ายรูปหรือแชร์ต่อได้

## หลักออกแบบเกมที่คนเล่นจริงหน้างาน

### เข้าใจได้ใน 3 วินาที

คนในงานมีเวลาน้อยและมีเสียงรบกวนมาก กติกาควรสั้นจนดูจากคนอื่นเล่นก็เข้าใจ

### เล่นจบเร็ว

รอบละไม่เกินหนึ่งนาทีเป็นจุดเริ่มต้นที่ดี ช่วยไม่ให้คิวยาวและยังมีคนใหม่มาเล่นต่อเนื่อง

### มีหน้าจอดึงดูดตอนไม่มีคนเล่น

หน้าจอที่วนแสดงภาพเคลื่อนไหวหรือคะแนนสูงสุด ทำหน้าที่เรียกคนจากระยะไกล

### ปุ่มและเป้าแตะต้องใหญ่

ผู้เล่นมีทุกวัย และมักยืนแตะจอเป็นครั้งแรก เป้าแตะจึงควรใหญ่และตอบสนองทันที

## เก็บข้อมูลอย่างถูกต้อง

ถ้าเก็บชื่อ เบอร์โทร หรืออีเมล ต้องแจ้งวัตถุประสงค์และขอความยินยอมให้ชัดเจนตาม PDPA เก็บเฉพาะข้อมูลที่จะใช้จริง และกำหนดว่าใครเข้าถึงได้

## เตรียมแผนสำรองหน้างาน

1. ล็อกเครื่องให้เปิดได้เฉพาะเกม
2. ทำให้เล่นต่อได้แม้อินเทอร์เน็ตในงานไม่เสถียร แล้วค่อยซิงก์ข้อมูลภายหลัง
3. เตรียมเครื่องสำรองและทีมดูแลระบบในวันงาน
4. ซ้อมกับจอและสถานที่จริงก่อนงาน

> เกมที่ดีต้องสนุกพอให้คนหยุด และเรียบง่ายพอให้ทีมหน้างานดูแลได้

## วัดผลหลังจบงาน

ดูจำนวนรอบที่เล่น สัดส่วนคนที่เล่นจบ และจำนวนรายชื่อที่ได้รับความยินยอม ตัวเลขเหล่านี้ช่วยให้รู้ว่าควรปรับอะไรในงานถัดไป

ดูรายละเอียดบริการได้ที่หน้า [Event Interactive](/services/event-interactive/)`,
      faq: [
        { q: "เกมบน Kiosk ใช้เวลาเตรียมนานแค่ไหน", a: "ขึ้นอยู่กับความซับซ้อนของเกมและการเชื่อมต่อข้อมูล ควรเริ่มคุยก่อนวันงานให้มีเวลาออกแบบ ทดสอบ และซ้อมกับอุปกรณ์จริง" },
        { q: "เกมบน Kiosk ต้องใช้อินเทอร์เน็ตไหม", a: "ไม่จำเป็นเสมอไป เกมสามารถออกแบบให้ทำงานได้โดยไม่ต้องต่อเน็ตตลอดเวลา แล้วค่อยส่งข้อมูลเมื่อการเชื่อมต่อพร้อม" },
        { q: "นำเกมเดิมไปใช้ในงานอื่นได้ไหม", a: "ได้ หากออกแบบให้เปลี่ยนภาพ ข้อความ และรางวัลได้ เกมชุดเดียวสามารถปรับใช้กับหลายงานหรือหลายแคมเปญ" },
      ],
    },
    en: {
      title: "Touchscreen Kiosk Games for Events: How to Plan One People Actually Play",
      description:
        "How to plan a touchscreen kiosk game for events and trade show booths, from game format and attract screens to consent-based data capture and on-site backup plans.",
      keywords: ["touchscreen kiosk games", "event kiosk game", "trade show booth games", "interactive booth", "brand activation games"],
      imageAlt: "Guests gathered around touchscreen kiosks at a bright brand launch event",
      category: "Event Interactive",
      body: `A booth with only signage is easy to walk past. A **touchscreen kiosk game** gets people to stop, play and spend longer with your brand. It only works, though, when it is planned around the campaign goal rather than around fun alone.

## Start with what the brand needs

- **Product awareness:** build the game around what makes the product different
- **Leads:** offer a reward in exchange for details once the game ends
- **Sharing:** design a result people want to photograph or post

## Design rules for games people really play

### Understandable in three seconds

Event floors are loud and people are in a hurry. The rules should be simple enough to learn by watching someone else.

### Quick to finish

Aim for rounds of about a minute or less. Queues stay short and new players keep arriving.

### An attract screen for idle moments

A looping animation or leaderboard pulls people in from across the room when nobody is playing.

### Large, responsive touch targets

Players come in all ages and are usually touching the screen for the first time.

## Capture data responsibly

If you collect names, phone numbers or emails, explain why and ask for clear consent under the privacy law that applies to your event, such as Thailand's PDPA or the GDPR. Collect only what you will use, and decide who can access it.

## Prepare for the event floor

1. Lock the device so only the game can run
2. Keep the game playable on unreliable event internet, and sync data later
3. Have a spare unit and technical support on the day
4. Rehearse on the real screen in the real venue

> A good game is fun enough to make people stop and simple enough for the floor team to run.

## Measure after the event

Track rounds played, the share of players who finish, and the number of consented leads. These numbers show what to change next time.

See more on our [Event Interactive](/en/services/event-interactive/) page.`,
      faq: [
        { q: "How long does a kiosk game take to prepare?", a: "It depends on the game and its data connections. Start early enough to design, test and rehearse on the actual hardware." },
        { q: "Does a kiosk game need internet?", a: "Not always. A game can be built to run without a constant connection and send its data once the connection is available." },
        { q: "Can the same game be reused at other events?", a: "Yes. If images, text and prizes are configurable, one game can be adapted for many events or campaigns." },
      ],
    },
  },
  {
    slug: "kol-influencer-campaign-guide",
    service: "kol-influencer",
    image: "/imagery/articles/kol-creator.webp",
    datePublished: "2026-11-09",
    th: {
      title: "วิธีเลือก KOL และ Influencer ให้ตรงแคมเปญ: คู่มือสำหรับแบรนด์",
      description:
        "วิธีเลือก KOL และ Influencer จากความเหมาะสมกับแบรนด์ ไม่ใช่แค่ยอดผู้ติดตาม พร้อมขั้นตอนบรีฟ วางแผนคอนเทนต์ และวัดผลแคมเปญ",
      keywords: ["เลือก KOL", "จ้าง Influencer", "KOL Marketing", "Influencer Marketing", "แคมเปญ KOL", "หา KOL ให้แบรนด์"],
      imageAlt: "ครีเอเตอร์กำลังถ่ายวิดีโอด้วยสมาร์ตโฟนในบูธงานอีเวนต์",
      category: "KOL และ Influencer",
      body: `ยอดผู้ติดตามสูงไม่ได้แปลว่าเหมาะกับแบรนด์เสมอไป **การเลือก KOL และ Influencer** ที่ได้ผลเริ่มจากการรู้ว่าแคมเปญต้องการให้เกิดอะไร แล้วค่อยหาคนที่กลุ่มเป้าหมายเชื่อจริง

## กำหนดบทบาทของ KOL ก่อนเลือกคน

- **สร้างการรับรู้:** คนที่มีผู้ชมกว้าง
- **สร้างความน่าเชื่อถือ:** ผู้เชี่ยวชาญในเรื่องนั้น
- **สร้างการตัดสินใจ:** ครีเอเตอร์ที่รีวิวและมีผู้ติดตามเฉพาะกลุ่ม

แคมเปญที่ดีมักใช้หลายระดับร่วมกัน เพราะแต่ละกลุ่มทำหน้าที่ต่างกัน

## สิ่งที่ควรดูมากกว่ายอดผู้ติดตาม

1. ผู้ติดตามตรงกับลูกค้าของแบรนด์หรือไม่
2. คนในคอมเมนต์พูดคุยจริงหรือไม่
3. เนื้อหาที่ผ่านมาเข้ากับคุณค่าของแบรนด์หรือไม่
4. เคยรีวิวคู่แข่งโดยตรงเมื่อไม่นานมานี้หรือไม่
5. มีผลงานที่พาคนไปทำบางอย่างต่อหรือไม่

## บรีฟให้ KOL ยังเป็นตัวเอง

บรีฟที่ดีบอกสิ่งที่ต้องสื่อและสิ่งที่ห้ามพูดอย่างชัดเจน แต่เปิดให้ครีเอเตอร์เล่าด้วยสไตล์ของตัวเอง เพราะผู้ติดตามเชื่อเสียงของเขา ไม่ใช่สคริปต์ของแบรนด์

> KOL ที่ดีที่สุดคือคนที่ผู้ชมเชื่อ เมื่อพูดถึงสินค้าของคุณ

## วางแผนให้คอนเทนต์ทำงานต่อ

กำหนดตารางเผยแพร่ให้สอดคล้องกับโฆษณาและกิจกรรมอื่น เตรียมขอสิทธิ์นำคอนเทนต์ไปใช้ต่อ และเปิดเผยให้ผู้ชมรู้ว่าเป็นงานร่วมกับแบรนด์

## วัดผลให้ตรงเป้าหมาย

ถ้าเป้าหมายคือการรับรู้ ให้ดูการเข้าถึงและการมีส่วนร่วม ถ้าเป้าหมายคือยอดขาย ให้ใช้ลิงก์หรือโค้ดเฉพาะของแต่ละคนเพื่อดูว่าใครพาลูกค้ามาจริง

ดูบริการของเราได้ที่หน้า [KOL และ Influencer](/services/kol-influencer/)`,
      faq: [
        { q: "ควรเลือก KOL รายใหญ่หรือ Micro Influencer", a: "ขึ้นอยู่กับเป้าหมาย รายใหญ่เหมาะกับการสร้างการรับรู้ ส่วน Micro Influencer มักเหมาะกับกลุ่มเฉพาะและการรีวิวที่น่าเชื่อถือ" },
        { q: "วัดผลแคมเปญ KOL อย่างไร", a: "กำหนดตัวชี้วัดตามเป้าหมายก่อนเริ่ม เช่น การเข้าถึง การมีส่วนร่วม การคลิก หรือยอดขายจากลิงก์และโค้ดเฉพาะ" },
      ],
    },
    en: {
      title: "How to Choose the Right KOLs and Influencers for a Campaign",
      description:
        "How brands should choose KOLs and influencers by fit rather than follower count, with practical guidance on briefing, content planning and measurement.",
      keywords: ["how to choose KOLs", "influencer marketing guide", "KOL marketing", "influencer campaign planning", "KOL agency Thailand"],
      imageAlt: "A content creator filming with a smartphone at an event booth",
      category: "KOL & Influencers",
      body: `A large following does not make someone right for your brand. **Choosing KOLs and influencers** starts with knowing what the campaign must achieve, then finding the people your audience actually trusts.

## Define the role before choosing the person

- **Awareness:** creators with broad reach
- **Credibility:** experts in the subject
- **Decision:** reviewers with a focused audience

Strong campaigns often combine levels, because each does a different job.

## What matters more than follower count

1. Does the audience match your customers?
2. Are people really talking in the comments?
3. Does past content fit your brand values?
4. Have they recently promoted a direct competitor?
5. Have they moved their audience to take action before?

## Brief creators so they can stay themselves

A good brief says clearly what must be communicated and what must be avoided, then leaves room for the creator's own style. Audiences trust that voice, not a brand script.

> The best KOL is the person your audience believes when they mention your product.

## Plan for content that keeps working

Align publishing with your ads and other activity, secure the rights to reuse content, and make the partnership clear to viewers.

## Measure against the goal

For awareness, look at reach and engagement. For sales, give each creator a unique link or code so you can see who really brought customers.

See our [KOL & Influencers](/en/services/kol-influencer/) service.`,
      faq: [
        { q: "Should we choose macro KOLs or micro influencers?", a: "It depends on the goal. Larger creators suit awareness, while micro influencers often suit focused audiences and credible reviews." },
        { q: "How do you measure a KOL campaign?", a: "Set metrics before launch, such as reach, engagement, clicks or sales from unique links and codes." },
      ],
    },
  },
  {
    slug: "event-content-production-checklist",
    service: "event-content",
    image: "/imagery/articles/event-production.webp",
    datePublished: "2026-11-09",
    th: {
      title: "ถ่ายทำงานอีเวนต์ให้ได้คอนเทนต์ใช้ต่อ: เช็กลิสต์ก่อน ระหว่าง และหลังงาน",
      description:
        "เช็กลิสต์ถ่ายภาพและวิดีโองานอีเวนต์สำหรับแบรนด์ ตั้งแต่ Shot List การขออนุญาต จนถึงการตัดต่อคลิปหลายรูปแบบสำหรับ Social Media",
      keywords: ["ถ่ายทำงานอีเวนต์", "ถ่ายวิดีโองานอีเวนต์", "ตัดต่อคลิปอีเวนต์", "Event Production", "ทีมถ่ายงานอีเวนต์"],
      imageAlt: "ทีมถ่ายวิดีโอกำลังทำงานในงานเปิดตัวสินค้า",
      category: "Event Production",
      body: `งานอีเวนต์จัดเพียงไม่กี่วัน แต่คอนเทนต์ที่ดีใช้ต่อได้อีกนาน หากวางแผน**การถ่ายทำงานอีเวนต์**ตั้งแต่ต้น แบรนด์จะได้มากกว่าคลิปสรุปหนึ่งชิ้น

## ก่อนวันงาน

- กำหนดว่าคอนเทนต์จะใช้ที่ไหน เช่น Reels, TikTok, YouTube หรือหน้าเว็บ
- ทำ Shot List ภาพที่ต้องมี เช่น บรรยากาศ สินค้า ผู้บริหาร และลูกค้า
- ดูสถานที่จริงเรื่องแสง เสียง และจุดตั้งกล้อง
- เตรียมป้ายแจ้งการถ่ายภาพ และขออนุญาตผู้ให้สัมภาษณ์

## ระหว่างงาน

### เก็บทั้งภาพกว้างและรายละเอียด

ภาพกว้างเล่าความยิ่งใหญ่ ส่วนภาพใกล้ เช่น มือที่แตะจอหรือรอยยิ้ม ทำให้คลิปมีชีวิต

### ถ่ายเผื่อแนวตั้ง

เลือกกล้องหรือจัดเฟรมให้ใช้กับวิดีโอแนวตั้งได้ตั้งแต่ต้น จะดีกว่าการครอปภายหลัง

### สัมภาษณ์สั้น ๆ ในงาน

ถามคำถามเดียว เช่น ชอบอะไรที่สุดในงาน คำตอบจริงจากผู้ร่วมงานน่าเชื่อถือกว่าข้อความโฆษณา

> วางแผนจากปลายทาง แล้วทุกภาพที่ถ่ายจะมีที่ไปชัดเจน

## หลังงาน

1. ปล่อยภาพและคลิปสั้นภายในวันงานหรือวันถัดไป ขณะที่คนยังพูดถึง
2. ตัดคลิปสรุปหลักสำหรับหน้าเว็บและงานนำเสนอ
3. แยกคลิปย่อยตามหัวข้อสำหรับโพสต์ต่อเนื่อง
4. จัดเก็บไฟล์ให้ทีมค้นหาและนำกลับมาใช้ได้

ดูรายละเอียดที่หน้า [Event Production](/services/event-content/)`,
      faq: [
        { q: "ควรจองทีมถ่ายงานอีเวนต์ล่วงหน้าเท่าไร", a: "ควรคุยตั้งแต่มีวันงานและกำหนดการ เพื่อให้มีเวลาวาง Shot List และสำรวจสถานที่" },
        { q: "งานเดียวทำคอนเทนต์ได้กี่ชิ้น", a: "ขึ้นอยู่กับขนาดงานและแผนการถ่าย หากวางแผนล่วงหน้า งานเดียวสามารถแยกเป็นคลิปสรุป คลิปสั้น และภาพนิ่งได้หลายชุด" },
      ],
    },
    en: {
      title: "Event Video Production Checklist: Get Content You Can Use Long After the Event",
      description:
        "A before, during and after checklist for event photo and video, covering shot lists, permissions, vertical framing and repurposing footage for social media.",
      keywords: ["event video production", "event content checklist", "event videography", "event recap video", "event content strategy"],
      imageAlt: "A video crew working at a bright product launch event",
      category: "Event Production",
      body: `An event lasts a few days, but good content can work much longer. When **event production** is planned from the start, the brand gets far more than a single recap film.

## Before the event

- Decide where content will live, such as Reels, TikTok, YouTube or your website
- Write a shot list covering atmosphere, products, leadership and customers
- Check the venue for light, sound and camera positions
- Prepare filming notices and get permission from interviewees

## During the event

### Capture both wide shots and details

Wide shots show the scale. Close-ups, such as a hand on a screen or a real smile, bring the film to life.

### Frame for vertical from the start

Choosing a camera setup that works for vertical video beats cropping it afterward.

### Ask one short question

Try "What did you like most today?" A real answer from a guest is more convincing than ad copy.

> Plan from the destination, and every shot has somewhere to go.

## After the event

1. Publish photos and short clips the same day or the next, while people are still talking
2. Edit a main recap for your website and presentations
3. Cut topic-based clips for ongoing posts
4. Organize files so the team can find and reuse them

See our [Event Production](/en/services/event-content/) service.`,
      faq: [
        { q: "How far ahead should we book an event crew?", a: "Talk as soon as the date and schedule are known, so there is time to plan the shot list and visit the venue." },
        { q: "How much content can one event produce?", a: "It depends on the event and the plan. With preparation, one event can yield a recap, short clips and several photo sets." },
      ],
    },
  },
  {
    slug: "digital-marketing-plan-for-brands",
    service: "digital-marketing",
    image: "/imagery/articles/marketing-plan.webp",
    datePublished: "2026-11-09",
    th: {
      title: "วางแผน Digital Marketing สำหรับแบรนด์: เริ่มจากเป้าหมาย กลุ่มลูกค้า และการวัดผล",
      description:
        "ขั้นตอนวางแผน Digital Marketing สำหรับแบรนด์ ตั้งเป้าหมาย เข้าใจกลุ่มเป้าหมาย เลือกช่องทาง ดูแล Social ยิงแอด และวัดผลอย่างเป็นระบบ",
      keywords: ["วางแผน Digital Marketing", "แผนการตลาดดิจิทัล", "ยิงแอด", "ดูแลเพจ", "หากลุ่มเป้าหมาย", "รับทำการตลาดออนไลน์"],
      imageAlt: "การ์ดแผนแคมเปญที่เชื่อมต่อกันบนโต๊ะสีขาว",
      category: "Digital Marketing",
      body: `โฆษณาที่ไม่มีแผนทำให้ใช้งบไปโดยไม่รู้ว่าอะไรได้ผล **แผน Digital Marketing** ที่ดีไม่จำเป็นต้องซับซ้อน แต่ต้องตอบได้ว่าแบรนด์จะพูดกับใคร ที่ไหน และวัดความสำเร็จอย่างไร

## 1. ตั้งเป้าหมายที่วัดได้

แยกเป้าหมายธุรกิจออกจากตัวเลขในแพลตฟอร์ม เช่น เป้าหมายคือจำนวนลูกค้าที่ติดต่อเข้ามา ไม่ใช่จำนวนไลก์

## 2. เข้าใจกลุ่มเป้าหมาย

ดูข้อมูลลูกค้าเดิม คำถามที่พบบ่อย และสิ่งที่ลูกค้าพูดถึงบนโซเชียล เพื่อสรุปว่าเขามีปัญหาอะไรและตัดสินใจจากอะไร

## 3. เลือกช่องทางตามหน้าที่

- **โฆษณา:** พาแบรนด์ไปหาคนกลุ่มใหม่
- **Social และเพจ:** สร้างความสัมพันธ์ต่อเนื่อง
- **เว็บไซต์และ SEO:** รองรับคนที่กำลังหาข้อมูล
- **ข้อความหาลูกค้าเดิม:** กระตุ้นให้กลับมาซื้อซ้ำ

## 4. วางคอนเทนต์ให้ตรงขั้นการตัดสินใจ

คนที่เพิ่งรู้จักแบรนด์ต้องการเรื่องต่างจากคนที่พร้อมซื้อ จึงควรมีเนื้อหาทั้งสร้างการรับรู้ ให้ความรู้ และชวนตัดสินใจ

## 5. ยิงแอดแบบทดลองและปรับ

เริ่มจากหลายชิ้นงานหรือกลุ่มเป้าหมายเล็ก ๆ ดูผล แล้วเพิ่มงบให้สิ่งที่ได้ผล วิธีนี้ลดความเสี่ยงกว่าการลงงบก้อนเดียว

> ทุกช่องทางควรมีหน้าที่ชัดเจน และทุกหน้าที่ควรมีตัวเลขกำกับ

## 6. ติดตั้งการวัดผลตั้งแต่ต้น

ตั้งค่าการติดตามบนเว็บไซต์และลิงก์แคมเปญก่อนเริ่มยิงแอด เพื่อให้รู้ว่าลูกค้ามาจากไหน

## 7. ทบทวนเป็นรอบ

ตรวจผลรายสัปดาห์เพื่อปรับชิ้นงาน และรายเดือนเพื่อปรับแผน แล้วนำเสียงลูกค้าจาก [Social Listening](/services/social-listening/) มาใช้ประกอบ

ดูบริการของเราได้ที่หน้า [Digital Marketing](/services/digital-marketing/)`,
      faq: [
        { q: "ควรเริ่มยิงแอดเมื่อไร", a: "เริ่มเมื่อมีเป้าหมาย ปลายทางที่พร้อมรับลูกค้า และระบบวัดผลแล้ว เพื่อให้เรียนรู้จากงบที่ใช้ได้จริง" },
        { q: "ต้องทำทุกแพลตฟอร์มไหม", a: "ไม่จำเป็น ควรเลือกแพลตฟอร์มที่กลุ่มเป้าหมายใช้จริงและทีมสามารถดูแลได้อย่างต่อเนื่อง" },
      ],
    },
    en: {
      title: "How to Build a Digital Marketing Plan: Goals, Audience, Channels and Measurement",
      description:
        "A step-by-step digital marketing plan for brands, covering measurable goals, audience research, channel roles, social management, paid ads and reporting.",
      keywords: ["digital marketing plan", "digital marketing strategy for brands", "paid ads planning", "social media management", "digital marketing agency Thailand"],
      imageAlt: "Connected campaign planning cards arranged on a white table",
      category: "Digital Marketing",
      body: `Ads without a plan spend money without showing what worked. A good **digital marketing plan** does not need to be complicated, but it must answer who the brand is talking to, where, and how success is measured.

## 1. Set measurable goals

Separate business goals from platform numbers. The goal is qualified enquiries, not likes.

## 2. Understand the audience

Review existing customers, common questions and what people say on social media to learn their problems and how they decide.

## 3. Give each channel a job

- **Paid ads:** reach new people
- **Social and pages:** build ongoing relationships
- **Website and SEO:** serve people already searching
- **Messages to existing customers:** bring them back

## 4. Match content to the decision stage

Someone who just discovered the brand needs something different from someone ready to buy. Plan content for awareness, education and decision.

## 5. Test ads, then scale

Start with several creatives or small audiences, read the results, then move budget to what works. It is safer than one large bet.

> Every channel needs a clear job, and every job needs a number.

## 6. Set up measurement first

Configure website tracking and campaign links before launch so you know where customers come from.

## 7. Review in cycles

Check weekly to adjust creative and monthly to adjust the plan, and bring in customer insight from [social listening](/en/services/social-listening/).

See our [Digital Marketing](/en/services/digital-marketing/) service.`,
      faq: [
        { q: "When should we start running ads?", a: "When you have a goal, a destination ready for customers and measurement in place, so the spend teaches you something." },
        { q: "Do we need to be on every platform?", a: "No. Choose the platforms your audience really uses and your team can maintain consistently." },
      ],
    },
  },
  {
    slug: "what-is-social-listening",
    service: "social-listening",
    image: "/imagery/articles/listening-signal.webp",
    datePublished: "2026-11-09",
    th: {
      title: "Social Listening คืออะไร แบรนด์ใช้ทำอะไรได้บ้าง และต่างจาก Social Monitoring อย่างไร",
      description:
        "Social Listening คือการติดตามและวิเคราะห์สิ่งที่คนพูดถึงแบรนด์ คู่แข่ง และตลาดบนโลกออนไลน์ เข้าใจการใช้งาน ขั้นตอน และสิ่งที่ควรมีในรายงาน",
      keywords: ["Social Listening คืออะไร", "Social Listening", "Social Monitoring", "วิเคราะห์ Sentiment", "รายงาน Social Listening", "ฟังเสียงลูกค้าออนไลน์"],
      imageAlt: "แผ่นกระดาษสีขาวเรียงเป็นคลื่นเสียง มีหนึ่งแผ่นสีทอง",
      category: "Social Listening",
      body: `**Social Listening** คือการติดตามและวิเคราะห์สิ่งที่คนพูดถึงแบรนด์ คู่แข่ง และตลาดบนโลกออนไลน์ เพื่อเข้าใจความคิดเห็นและความต้องการของลูกค้า แล้วนำไปใช้ตัดสินใจ

## Social Listening ต่างจาก Social Monitoring อย่างไร

**Social Monitoring** เน้นติดตามการกล่าวถึงและตอบกลับเป็นรายกรณี ส่วน Social Listening มองภาพรวมเพื่อหาแนวโน้มและเหตุผลเบื้องหลัง แล้วนำไปปรับกลยุทธ์

## แบรนด์ใช้ Social Listening ทำอะไรได้บ้าง

- ดูว่าคนรู้สึกอย่างไรกับแบรนด์
- ประเมินกระแสตอบรับก่อนและหลังแคมเปญ
- รู้ปัญหาตั้งแต่ยังไม่บานปลาย
- เปรียบเทียบเสียงพูดถึงกับคู่แข่ง
- หาหัวข้อคอนเทนต์จากคำถามจริงของลูกค้า
- ค้นหาครีเอเตอร์ที่กลุ่มเป้าหมายพูดถึง

## ขั้นตอนการทำ Social Listening

1. กำหนดคำถามที่อยากรู้
2. รวมคำค้น เช่น ชื่อแบรนด์ คำเรียกผิด คู่แข่ง และแฮชแท็ก
3. เลือกแหล่งข้อมูลที่กลุ่มเป้าหมายใช้
4. คัดข้อมูลที่ไม่เกี่ยวข้องออก
5. วิเคราะห์หัวข้อและความรู้สึก
6. สรุปเป็นสิ่งที่ทีมต้องทำต่อ

> รายงานที่ดีไม่ได้จบที่ตัวเลข แต่บอกว่าทีมควรทำอะไรต่อ

## ข้อควรระวังกับภาษาไทย

ระบบวิเคราะห์ความรู้สึกอัตโนมัติอาจตีความคำประชด คำแสลง หรือบริบทไทยคลาดเคลื่อน จึงควรให้คนตรวจตัวอย่างข้อมูลก่อนสรุปผล

## รายงานที่ใช้งานได้ควรมีอะไร

สรุปประเด็นสำคัญ แนวโน้มการพูดถึง ความรู้สึกต่อแบรนด์ หัวข้อที่คนสนใจ ตัวอย่างความคิดเห็นจริง และข้อเสนอแนะ

Owl Day House จัดทำงานนี้ร่วมกับพาร์ตเนอร์ด้าน Social Listening ดูรายละเอียดที่หน้า [Social Listening](/services/social-listening/)`,
      faq: [
        { q: "Social Listening ดูข้อมูลอะไรได้บ้าง", a: "โดยทั่วไปดูข้อมูลสาธารณะจากโซเชียลมีเดีย เว็บข่าว เว็บบอร์ด และบล็อก ส่วนข้อมูลส่วนตัวหรือกลุ่มปิดมักไม่อยู่ในขอบเขต" },
        { q: "ควรทำ Social Listening บ่อยแค่ไหน", a: "แบรนด์ที่มีการพูดถึงต่อเนื่องควรติดตามเป็นประจำ และควรทำเพิ่มในช่วงก่อน ระหว่าง และหลังแคมเปญสำคัญ" },
      ],
    },
    en: {
      title: "What Is Social Listening? How Brands Use It and How It Differs from Monitoring",
      description:
        "Social listening is the tracking and analysis of what people say about a brand, its competitors and its market online. Learn how it works and what a useful report includes.",
      keywords: ["what is social listening", "social listening vs monitoring", "social listening report", "sentiment analysis", "social listening Thailand"],
      imageAlt: "White paper fins arranged like a sound wave with one gold fin",
      category: "Social Listening",
      body: `**Social listening** is the tracking and analysis of what people say about a brand, its competitors and its market online, so the brand can understand customers and make better decisions.

## How social listening differs from social monitoring

**Social monitoring** tracks mentions and responds case by case. Social listening looks at the bigger picture to find patterns and the reasons behind them, then uses that to shape strategy.

## What brands use social listening for

- Understanding how people feel about the brand
- Reading the response before and after a campaign
- Catching problems before they grow
- Comparing share of conversation with competitors
- Finding content ideas in real customer questions
- Discovering the creators an audience talks about

## How social listening works

1. Define the question you want answered
2. Build a keyword set: brand names, misspellings, competitors, hashtags
3. Choose the sources your audience uses
4. Remove irrelevant data
5. Analyze topics and sentiment
6. Turn findings into actions

> A good report does not stop at numbers. It tells the team what to do next.

## Watch out for language and context

Automated sentiment analysis can misread sarcasm, slang and local context, especially in languages like Thai. People should review a data sample before conclusions are drawn.

## What a useful report includes

Key findings, conversation trends, sentiment, the topics people care about, real example comments and recommendations.

Owl Day House delivers this work with a social listening partner. See our [Social Listening](/en/services/social-listening/) service.`,
      faq: [
        { q: "What data does social listening cover?", a: "Generally public data from social media, news sites, forums and blogs. Private messages and closed groups are usually out of scope." },
        { q: "How often should a brand do social listening?", a: "Brands with ongoing conversation should track it regularly, with deeper work before, during and after major campaigns." },
      ],
    },
  },
  {
    slug: "what-is-mcp-for-brands",
    service: "website-software",
    image: "/imagery/articles/mcp-connect.webp",
    datePublished: "2026-11-09",
    th: {
      title: "MCP คืออะไร ทำไมซอฟต์แวร์ของแบรนด์ควรเปิดให้ AI เชื่อมต่อได้",
      description:
        "MCP หรือ Model Context Protocol คือมาตรฐานเปิดที่ให้ AI เชื่อมต่อกับข้อมูลและเครื่องมือของธุรกิจ เข้าใจประโยชน์ เรื่องสิทธิ์การเข้าถึง และวิธีเริ่มต้น",
      keywords: ["MCP คืออะไร", "Model Context Protocol", "เชื่อม AI กับข้อมูลบริษัท", "AI สำหรับธุรกิจ", "ซอฟต์แวร์ที่เชื่อม AI ได้"],
      imageAlt: "อุปกรณ์เซรามิกสีขาวที่มีสายหลายเส้นเชื่อมต่อเข้าวงแหวนสีทอง",
      category: "ซอฟต์แวร์",
      body: `หลายทีมอยากใช้ AI ถามข้อมูลของตัวเอง แต่ข้อมูลอยู่กระจัดกระจายในหลายระบบ **MCP หรือ Model Context Protocol** คือมาตรฐานเปิดที่ช่วยให้แอป AI เชื่อมต่อกับข้อมูลและเครื่องมือภายนอกด้วยวิธีเดียวกัน

MCP เปิดตัวโดย Anthropic เมื่อเดือนพฤศจิกายน 2024 และเป็นมาตรฐานที่ไม่ผูกกับ AI เจ้าใดเจ้าหนึ่ง อ่านข้อมูลทางเทคนิคได้ที่ [เว็บไซต์ทางการของ MCP](https://modelcontextprotocol.io/)

## อธิบายแบบง่าย

ลองนึกถึงพอร์ตที่ใช้เสียบอุปกรณ์ได้หลายชนิด ระบบที่รองรับ MCP ก็เปิดช่องมาตรฐานให้แอป AI ที่รองรับเข้ามาอ่านข้อมูลหรือใช้เครื่องมือได้ ไม่ต้องเขียนการเชื่อมต่อใหม่ทุกครั้ง

## ประโยชน์สำหรับแบรนด์

- **ถามข้อมูลด้วยภาษาธรรมดา:** เช่น แคมเปญไหนได้รายชื่อลูกค้ามากที่สุด
- **ไม่ถูกล็อกกับ AI เจ้าเดียว:** เปลี่ยนเครื่องมือได้ง่ายขึ้นเมื่อมีตัวเลือกที่ดีกว่า
- **ข้อมูลอยู่ในระบบเดิม:** ใช้การเชื่อมต่อแบบควบคุมสิทธิ์ แทนการคัดลอกข้อมูลไปไว้หลายที่
- **ทีมทำงานต่อได้เอง:** ไม่ต้องรอทีมเทคนิคออกรายงานทุกครั้ง

## เรื่องที่ต้องออกแบบให้ดี

MCP เป็นช่องทางเชื่อมต่อ ไม่ได้ทำให้ระบบปลอดภัยหรือ AI เข้าใจธุรกิจโดยอัตโนมัติ จึงต้องกำหนดให้ชัดว่า

1. AI เห็นข้อมูลชุดไหนได้บ้าง
2. ส่วนใดอ่านได้อย่างเดียว และส่วนใดแก้ไขได้
3. ใครมีสิทธิ์ใช้งาน
4. การใช้งานถูกบันทึกไว้ตรวจสอบหรือไม่

> ระบบที่ดีควรเปิดให้ทีมใช้ AI ได้ โดยที่แบรนด์ยังควบคุมข้อมูลของตัวเอง

## เริ่มต้นอย่างไร

เลือกคำถามที่ทีมถามบ่อยหนึ่งเรื่อง เปิดการเข้าถึงแบบอ่านอย่างเดียวในข้อมูลชุดเล็ก ทดสอบความถูกต้อง แล้วค่อยขยาย

ซอฟต์แวร์ที่เราสร้างให้แต่ละบริการเชื่อมต่อผ่าน MCP ได้ ดูเพิ่มเติมที่หน้า [เครื่องมือ](/tools/)`,
      faq: [
        { q: "MCP ใช้ได้กับ AI ตัวไหนบ้าง", a: "ใช้ได้กับแอป AI ที่รองรับมาตรฐาน MCP ซึ่งมีหลายผู้ให้บริการ ควรตรวจสอบการรองรับของเครื่องมือที่ทีมใช้อยู่" },
        { q: "การเปิด MCP จะทำให้ข้อมูลรั่วไหลไหม", a: "ความเสี่ยงขึ้นกับการออกแบบ ควรจำกัดสิทธิ์ เริ่มจากการอ่านอย่างเดียว และเก็บบันทึกการใช้งาน" },
      ],
    },
    en: {
      title: "What Is MCP? Why Brand Software Should Be Open to AI",
      description:
        "MCP, the Model Context Protocol, is an open standard for connecting AI to business data and tools. Learn the benefits, the access controls that matter and how to start.",
      keywords: ["what is MCP", "Model Context Protocol for business", "connect AI to company data", "MCP explained", "AI-ready software"],
      imageAlt: "A white ceramic hub with cables connecting to a glowing gold ring",
      category: "Software",
      body: `Many teams want to ask AI about their own data, but that data sits across many systems. **MCP, the Model Context Protocol,** is an open standard that lets AI applications connect to outside data and tools in a consistent way.

Anthropic introduced MCP in November 2024, and it is not tied to any single AI vendor. Technical details are on the [official MCP website](https://modelcontextprotocol.io/).

## The simple explanation

Think of a port that accepts many kinds of devices. A system that supports MCP offers a standard opening through which compatible AI apps can read data or use tools, without a new integration each time.

## What it means for brands

- **Plain-language questions:** such as which campaign produced the most leads
- **No lock-in to one AI:** switch tools more easily when something better appears
- **Data stays where it is:** permissioned access instead of copies everywhere
- **Teams move on their own:** no waiting for a technical team to run each report

## What needs careful design

MCP is a connection. It does not automatically make a system secure or make AI understand your business. Decide clearly:

1. Which data AI can see
2. What is read-only and what can be changed
3. Who is allowed to use it
4. Whether usage is logged for review

> Good systems let teams use AI while the brand stays in control of its data.

## How to start

Pick one question your team asks often, open read-only access to a small data set, test the accuracy, then expand.

The software we build for each service connects through MCP. Learn more on our [Tools](/en/tools/) page.`,
      faq: [
        { q: "Which AI tools work with MCP?", a: "AI applications that support the MCP standard, which come from several providers. Check support in the tools your team uses." },
        { q: "Does opening MCP put our data at risk?", a: "The risk depends on the design. Limit permissions, start read-only and keep usage logs." },
      ],
    },
  },
  {
    slug: "building-systems-at-scale",
    service: "website-software",
    image: "/imagery/articles/system-scale.webp",
    datePublished: "2026-11-09",
    th: {
      title: "สร้างระบบให้รองรับผู้ใช้จำนวนมากพร้อมกัน: สิ่งที่องค์กรต้องวางแผนก่อนพัฒนา",
      description:
        "แนวทางวางแผนเว็บแอปและระบบองค์กรให้รองรับผู้ใช้จำนวนมากพร้อมกัน ทั้งการคาดการณ์ช่วงพีก ทดสอบโหลด ความปลอดภัย และการดูแลระยะยาว",
      keywords: ["ระบบรองรับผู้ใช้จำนวนมาก", "พัฒนาระบบองค์กร", "รับทำเว็บแอป", "Load Testing", "รับทำระบบองค์กร", "Software House"],
      imageAlt: "แผงกระจกสีขาวเรียงเป็นตารางยาวสุดสายตา มีเส้นแสงสีทองพาดผ่าน",
      category: "ซอฟต์แวร์",
      body: `ระบบที่ทำงานดีตอนมีผู้ใช้ไม่กี่คน อาจล่มทันทีเมื่อทุกคนเข้ามาพร้อมกัน เช่น ช่วงเปิดลงทะเบียน แคมเปญลดราคา หรือวันงานอีเวนต์ **การรองรับผู้ใช้จำนวนมาก**จึงต้องวางแผนตั้งแต่ต้น

ทีมของเราเคยพัฒนาระบบลงทะเบียนเรียนของมหาวิทยาลัยธรรมศาสตร์ ซึ่งต้องรองรับนักศึกษาหลายหมื่นคนพร้อมกันในช่วงลงทะเบียน แนวทางด้านล่างมาจากการคิดแบบเดียวกันนี้

## รู้ช่วงพีกก่อนออกแบบ

ถามให้ชัดว่าช่วงที่หนักที่สุดมีผู้ใช้พร้อมกันเท่าไร เกิดเมื่อไร และผู้ใช้ทำอะไรในช่วงนั้น ค่าเฉลี่ยรายวันไม่ได้บอกความเสี่ยงที่แท้จริง

## ออกแบบส่วนที่จะรับแรงกดดัน

- แยกหน้าที่อ่านข้อมูลบ่อยออกจากขั้นตอนที่ต้องบันทึก
- แคชข้อมูลที่เปลี่ยนไม่บ่อย
- ใช้คิวกับงานที่ไม่ต้องตอบทันที
- ป้องกันการกดซ้ำและการจองซ้อน
- ออกแบบให้ระบบลดความสามารถบางส่วนได้ แทนการล่มทั้งหมด

## ทดสอบด้วยสถานการณ์จริง

ทำ Load Testing ตามพฤติกรรมจริงของผู้ใช้ เช่น ทุกคนกดปุ่มเดียวกันในนาทีแรก แล้วดูว่าส่วนใดช้าก่อน

> ความเสถียรต้องออกแบบตั้งแต่แรก ไม่ใช่สิ่งที่เติมได้ในสัปดาห์สุดท้าย

## ความปลอดภัยและข้อมูลส่วนบุคคล

กำหนดสิทธิ์ตามหน้าที่ เข้ารหัสข้อมูลสำคัญ บันทึกการใช้งาน และเก็บข้อมูลเท่าที่จำเป็นตาม PDPA

## วางแผนวันใช้งานจริง

1. เฝ้าดูระบบแบบเรียลไทม์
2. เตรียมทีมและขั้นตอนแก้ปัญหา
3. มีแผนถอยกลับหากการอัปเดตมีปัญหา
4. สื่อสารกับผู้ใช้เมื่อเกิดความล่าช้า

## ดูแลต่อหลังเปิดใช้งาน

ระบบองค์กรใช้งานหลายปี ควรมีเอกสาร การสำรองข้อมูลที่ทดสอบกู้คืนแล้ว และทีมที่ดูแลต่อได้

ดูบริการที่หน้า [เว็บไซต์และซอฟต์แวร์](/services/website-software/) และผลงานที่หน้า [ผลงาน](/work/)`,
      faq: [
        { q: "ควรทำ Load Testing เมื่อไร", a: "ควรทำก่อนเปิดใช้งานจริงและก่อนช่วงที่คาดว่าจะมีผู้ใช้สูง รวมถึงหลังการเปลี่ยนแปลงสำคัญของระบบ" },
        { q: "ระบบเดิมที่ช้าจำเป็นต้องทำใหม่ทั้งหมดไหม", a: "ไม่เสมอไป ควรวัดหาจุดคอขวดก่อน หลายกรณีปรับเฉพาะส่วนที่มีปัญหาก็ช่วยได้มาก" },
      ],
    },
    en: {
      title: "Building Systems for High Concurrency: What to Plan Before Development Starts",
      description:
        "How to plan web apps and enterprise systems for large numbers of concurrent users, covering peak forecasting, load testing, security and long-term maintenance.",
      keywords: ["high concurrency systems", "enterprise web application development", "load testing planning", "scalable web app", "software development Thailand"],
      imageAlt: "A vast grid of white glass panels with a line of gold light running through it",
      category: "Software",
      body: `A system that runs well with a handful of users can fail the moment everyone arrives at once, such as when registration opens, a sale starts or an event begins. **Handling large numbers of concurrent users** has to be planned from the start.

Our team built Thammasat University's course registration system, which serves tens of thousands of students at once during enrollment. The guidance below comes from the same way of thinking.

## Know your peak before designing

Ask how many people will be active at the worst moment, when it happens and what they will be doing. A daily average does not reveal the real risk.

## Design the parts under pressure

- Separate frequent reads from steps that write data
- Cache information that rarely changes
- Queue work that does not need an instant answer
- Protect against double submissions and double booking
- Let the system reduce features gracefully instead of failing outright

## Test with realistic scenarios

Run load tests based on real behavior, such as everyone pressing the same button in the first minute, and see what slows down first.

> Reliability has to be designed in. It cannot be added in the final week.

## Security and personal data

Assign access by role, encrypt sensitive data, log activity and keep only the data you need under the privacy law that applies.

## Plan for go-live

1. Monitor the system in real time
2. Prepare the team and response procedures
3. Have a rollback plan for updates
4. Communicate with users during delays

## Look after it after launch

Enterprise systems run for years. They need documentation, backups that have been restored in a test, and a team able to maintain them.

See [Websites & Software](/en/services/website-software/) and our [selected work](/en/work/).`,
      faq: [
        { q: "When should load testing happen?", a: "Before launch, before expected peaks and after any major system change." },
        { q: "Does a slow system need a full rebuild?", a: "Not always. Measure the bottlenecks first. Improving only the problem areas often helps a great deal." },
      ],
    },
  },
];
