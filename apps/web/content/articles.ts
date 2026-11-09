// Guides for each service, in both languages. Bodies use a small Markdown subset
// rendered by components/site/ArticleBody.tsx: ## ### - 1. **bold** [text](url).
//
// Voice: the team telling what it does on real jobs. Plain sentences, no em
// dashes, no "not X but Y" contrasts, no pull-quotes, no aphorism openers.
// Client work stays anonymous (NDA), Social Listening always names the partner,
// and never claim that every service connects through MCP.

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
      title: "วางแคมเปญแบรนด์ให้ระบบ อีเวนต์ KOL และโฆษณาทำงานต่อกัน",
      description:
        "แคมเปญที่แยกจ้างทีละส่วนมักวัดผลไม่ได้ บทความนี้เล่าวิธีที่ทีมเราวางแคมเปญให้เว็บ กิจกรรมหน้างาน KOL และโฆษณาส่งข้อมูลต่อกัน ตั้งแต่คำถามแรกจนถึงการวัดผล",
      keywords: ["แคมเปญแบรนด์ครบวงจร", "Integrated Marketing Campaign", "Brand Activation", "วางแผนแคมเปญการตลาด", "Brand Experience"],
      imageAlt: "พื้นที่ทำงาน งานอีเวนต์ และสตูดิโอถ่ายทำที่เชื่อมต่อกันในภาพเดียว",
      category: "กลยุทธ์แบรนด์",
      body: `แคมเปญหนึ่งงาน แบรนด์มักต้องคุยกับผู้รับจ้างหลายเจ้า ทั้งคนทำเว็บ คนทำบูธ คนหา KOL และคนยิงแอด แต่ละเจ้าทำส่วนของตัวเองได้ดี ปัญหามักเกิดตรงรอยต่อ เช่น รายชื่อที่เก็บได้หน้างานไม่มีใครเอาไปใช้ต่อ หรือ KOL พูดคนละเรื่องกับโฆษณา

ทีมเราทำงานทั้งฝั่งระบบ หน้างาน และการตลาด จึงเห็นรอยต่อพวกนี้บ่อย บทความนี้สรุปวิธีที่เราใช้วางแคมเปญให้แต่ละส่วนส่งงานต่อกัน

## ปัญหาที่เจอบ่อยเมื่อแยกจ้างทีละส่วน

- รายชื่อลูกค้าจากงานอีเวนต์ไม่ถูกนำไปใช้ต่อ
- ข้อความของ KOL โฆษณา และเว็บไซต์ไม่ตรงกัน
- แต่ละเจ้าวัดผลของตัวเอง จึงตอบไม่ได้ว่าอะไรทำให้เกิดยอดขาย
- ทีมการตลาดของแบรนด์เสียเวลาประสานงานหลายทีม

## เริ่มจาก 4 คำถาม

ก่อนเลือกช่องทาง เราถามลูกค้า 4 ข้อนี้ทุกครั้ง

1. เป้าหมายหลักคือให้คนรู้จัก ได้รายชื่อลูกค้า หรือได้ยอดขาย
2. กลุ่มเป้าหมายอยู่ที่ไหน และเชื่อใคร
3. ต้องเก็บข้อมูลอะไร และใครจะใช้ต่อ
4. ตัวเลขไหนบอกว่าแคมเปญนี้สำเร็จ

ตอบครบแล้ว การเลือกช่องทางจะง่ายขึ้นมาก เพราะแต่ละกิจกรรมมีหน้าที่ชัด

## วางเป็น 3 ขั้น

### Build: เตรียมที่รับคนก่อน

มี[หน้าแคมเปญหรือระบบลงทะเบียน](/services/website-software/)ที่รับคนจากทุกช่องทาง และตั้งค่าการวัดผลไว้ตั้งแต่วันแรก ถ้าข้ามขั้นนี้ ตัวเลขที่เหลือหลังจบงานมักมีแค่ยอดไลก์

### Activate: ให้คนมาเจอแบรนด์

[เกมบน Kiosk](/services/event-interactive/)ที่บูธ [KOL ที่กลุ่มเป้าหมายเชื่อ](/services/kol-influencer/) และ[ทีมถ่ายทำหน้างาน](/services/event-content/) ทุกจุดควรพาคนไปที่ระบบเดียวกัน

### Grow: ตามต่อจนเป็นลูกค้า

ใช้รายชื่อและคอนเทนต์จากงานใน[การตลาดดิจิทัล](/services/digital-marketing/) แล้วดูเสียงตอบรับผ่าน[Social Listening](/services/social-listening/) เพื่อปรับรอบถัดไป

## ไม่ต้องใช้ทุกช่องทาง

แคมเปญเล็กอาจมีแค่หน้าลงทะเบียน เกมหนึ่งเครื่อง และแอดสองสัปดาห์ ถ้าทุกส่วนส่งข้อมูลเข้าที่เดียวกัน ก็วัดผลได้แล้ว

## เราช่วยอะไรได้บ้าง

ทีมเราดูแลได้ตั้งแต่ระบบ เกมหน้างาน KOL งานถ่ายทำ ไปจนถึงโฆษณาและรายงาน ส่วน Social Listening ทำร่วมกับพาร์ตเนอร์ ดูรายละเอียดได้ที่หน้า[บริการ](/services/)`,
      faq: [
        { q: "แคมเปญแบบนี้เหมาะกับแบรนด์ขนาดไหน", a: "แบรนด์ที่มีเป้าหมายชัดเจนทำได้ทุกขนาด แคมเปญเล็กใช้แค่สองสามช่องทางก็ได้ ขอให้ช่องทางที่เลือกส่งข้อมูลต่อกันได้" },
        { q: "ต้องเริ่มจากทำเว็บไซต์ก่อนไหม", a: "ไม่ต้องทำเว็บใหม่ทั้งเว็บ ขอแค่มีปลายทางที่รับคนจากแคมเปญและเก็บข้อมูลได้ หน้าแคมเปญหน้าเดียวก็พอ" },
      ],
    },
    en: {
      title: "Planning a Brand Campaign Where Systems, Events, KOLs and Ads Work Together",
      description:
        "Campaigns bought in separate pieces are hard to measure. How our team plans campaigns so the website, the event floor, KOLs and ads pass data to each other, from the first question to the report.",
      keywords: ["integrated brand campaign", "brand activation strategy", "integrated marketing campaign", "brand experience agency"],
      imageAlt: "A workspace, an event floor and a film studio connected in one continuous view",
      category: "Brand strategy",
      body: `One campaign usually means several vendors: a web team, a booth builder, someone to find KOLs and someone to run the ads. Each does its own part well. The trouble shows up between them. The names collected at the event never get used, or the KOLs talk about something different from the ads.

Our team works across systems, the event floor and marketing, so we see these gaps often. This is how we plan a campaign so each part hands its work to the next.

## What goes wrong when each part is bought separately

- Leads from the event never get used again
- KOLs, ads and the website say different things
- Each vendor measures its own part, so nobody can say what drove sales
- The brand's marketing team spends its time coordinating vendors

## Start with four questions

We ask every client these before choosing any channel.

1. Is the main goal awareness, leads or sales?
2. Where is the audience, and who do they trust?
3. What data do we need, and who will use it next?
4. Which number tells us the campaign worked?

Once these are answered, choosing channels gets much easier, because every activity has a clear job.

## Plan it in three stages

### Build: get the landing point ready first

Set up a [campaign page or registration system](/en/services/website-software/) that receives people from every channel, with measurement in place from day one. Skip this and the only numbers left after the event tend to be likes.

### Activate: bring people to the brand

A [kiosk game](/en/services/event-interactive/) at the booth, [KOLs the audience trusts](/en/services/kol-influencer/) and an [on-site film crew](/en/services/event-content/). Every one of them should send people to the same system.

### Grow: follow up until they become customers

Use the leads and content from the event in [digital marketing](/en/services/digital-marketing/), then read the response through [social listening](/en/services/social-listening/) to plan the next round.

## You don't need every channel

A small campaign can be one registration page, one kiosk and two weeks of ads. If every part sends its data to the same place, you can measure it.

## How we can help

Our team covers systems, on-site games, KOLs, filming, ads and reporting. Social listening is delivered with a partner. See all our [services](/en/services/).`,
      faq: [
        { q: "What size of brand is this kind of campaign for?", a: "Any size, as long as the goal is clear. A small campaign can use two or three channels, provided they pass data to each other." },
        { q: "Do we have to start by building a website?", a: "You don't need a whole new website. You need a landing point that receives campaign traffic and captures data. A single campaign page is enough." },
      ],
    },
  },
  {
    slug: "event-kiosk-games",
    service: "event-interactive",
    image: "/imagery/articles/kiosk-event.webp",
    datePublished: "2026-11-09",
    th: {
      title: "เกม Kiosk สำหรับงานอีเวนต์: ทำอย่างไรให้คนอยากเล่น และแบรนด์ได้ข้อมูลกลับไป",
      description:
        "สิ่งที่ทีมเราดูทุกครั้งเวลาทำเกมบนตู้ Kiosk จอทัชสกรีนให้บูธและงานอีเวนต์ ตั้งแต่เป้าหมายของเกม กติกา การเก็บข้อมูลตาม PDPA ไปจนถึงแผนสำรองหน้างาน",
      keywords: ["เกม Kiosk", "เกมจอทัชสกรีน งานอีเวนต์", "เกมออกบูธ", "Interactive Booth", "กิจกรรมบูธงานอีเวนต์", "Brand Activation"],
      imageAlt: "ผู้ร่วมงานยืนล้อมตู้ Kiosk จอทัชสกรีนในงานเปิดตัวแบรนด์",
      category: "Event Interactive",
      body: `คนเดินผ่านบูธที่มีแค่ป้ายและโบรชัวร์ได้ง่าย **เกมบนตู้ Kiosk จอทัชสกรีน** ช่วยให้คนหยุด ลองเล่น และอยู่กับแบรนด์นานขึ้น เกมจะได้ผลถ้าวางจากเป้าหมายของแคมเปญตั้งแต่แรก ข้างล่างคือสิ่งที่ทีมเราดูทุกครั้งก่อนเริ่มทำ

## ตกลงกันก่อนว่าเกมมีไว้ทำอะไร

- **ให้คนรู้จักสินค้า:** ให้เกมพาผู้เล่นผ่านจุดเด่นของสินค้า
- **ได้รายชื่อลูกค้า:** ให้ลงทะเบียนเพื่อรับรางวัลหลังเล่นจบ
- **ให้คนแชร์:** ทำหน้าผลลัพธ์ให้ถ่ายรูปหรือโพสต์ต่อได้
- **ให้ความรู้:** ให้ผู้เล่นลองตัดสินใจเองทีละขั้น แล้วบอกเหตุผลเมื่อเลือกผิด

## กติกาต้องดูคนอื่นเล่นแล้วเข้าใจ

งานอีเวนต์เสียงดังและคนรีบ ถ้าต้องอ่านวิธีเล่นยาว ๆ คนจะเดินผ่าน เราตั้งเป้าให้คนที่ยืนดูอยู่ข้างหลังเข้าใจกติกาได้ในไม่กี่วินาที

## รอบละไม่เกินหนึ่งนาที

คิวจะไม่ยาว และมีคนใหม่มาเล่นต่อเนื่อง ถ้าเกมมีหลายด่าน ให้แต่ละด่านสั้นและมีเวลาจับ

## จอตอนไม่มีคนเล่นก็ต้องทำงาน

ระหว่างรอผู้เล่น ให้จอวนภาพเคลื่อนไหวหรือคะแนนสูงสุด จะเรียกคนจากอีกฝั่งของงานได้

## ปุ่มใหญ่ และมีทางเล่นสำรอง

ผู้เล่นมีทุกวัย และส่วนใหญ่แตะจอเครื่องนี้เป็นครั้งแรก ปุ่มจึงต้องใหญ่และตอบสนองทันที ถ้าเกมใช้เสียงหรือกล้องจับท่าทาง ควรมีทางเล่นสำรองด้วยการแตะจอ เกมที่เราเพิ่งส่งมอบเล่นได้ทั้งเสียง ท่าทางหน้ากล้อง และการแตะจอ ถ้าไมค์หรือกล้องมีปัญหา ผู้เล่นยังเล่นจบได้

## เก็บข้อมูลเท่าที่ต้องใช้

ถ้าเก็บชื่อหรือเบอร์โทร ต้องบอกให้ชัดว่าเก็บไปทำอะไร และขอความยินยอมแยกจากการร่วมเล่นตาม PDPA เก็บเฉพาะที่จะใช้จริง และกำหนดว่าใครเข้าถึงได้ ถ้างานไม่ต้องการรายชื่อ เช่น เกมให้ความรู้สำหรับเด็ก การไม่เก็บข้อมูลเลยก็เป็นทางเลือกที่ดี

## เตรียมหน้างาน

1. ล็อกเครื่องให้เปิดได้เฉพาะเกม
2. ให้เกมเล่นต่อได้แม้อินเทอร์เน็ตในงานไม่เสถียร แล้วค่อยส่งข้อมูลทีหลัง
3. มีเครื่องสำรองและคนดูแลระบบอยู่หน้างาน
4. ซ้อมกับจอและสถานที่จริงก่อนวันงาน

## วัดผลหลังจบงาน

ดูจำนวนรอบที่เล่น สัดส่วนคนที่เล่นจบ และจำนวนรายชื่อที่ได้รับความยินยอม ตัวเลขชุดนี้บอกว่างานหน้าควรปรับอะไร

## เราช่วยอะไรได้บ้าง

เราออกแบบและเขียนเกม ทำระบบลงทะเบียนและสุ่มรางวัล และส่งคนดูแลระบบหน้างาน ดูรายละเอียดที่หน้า [Event Interactive](/services/event-interactive/)`,
      faq: [
        { q: "เกมบน Kiosk ใช้เวลาเตรียมนานแค่ไหน", a: "ขึ้นกับความซับซ้อนของเกมและการเชื่อมข้อมูล ควรคุยตั้งแต่รู้วันงาน จะได้มีเวลาออกแบบ ทดสอบ และซ้อมกับเครื่องจริง" },
        { q: "เกมบน Kiosk ต้องใช้อินเทอร์เน็ตไหม", a: "ไม่ต้องเสมอไป เกมทำให้เล่นแบบออฟไลน์ได้ แล้วค่อยส่งข้อมูลเมื่อเชื่อมต่อได้" },
        { q: "นำเกมเดิมไปใช้ในงานอื่นได้ไหม", a: "ได้ ถ้าออกแบบให้เปลี่ยนภาพ ข้อความ และรางวัลได้ เกมชุดเดียวใช้กับหลายงานหรือหลายแคมเปญได้" },
      ],
    },
    en: {
      title: "Kiosk Games for Events: How to Make One People Want to Play",
      description:
        "What our team checks every time we build a touchscreen kiosk game for a booth or event: the game's purpose, simple rules, consent-based data capture and backup plans for the event floor.",
      keywords: ["touchscreen kiosk games", "event kiosk game", "trade show booth games", "interactive booth", "brand activation games"],
      imageAlt: "Guests gathered around touchscreen kiosks at a bright brand launch event",
      category: "Event Interactive",
      body: `A booth with only signage and brochures is easy to walk past. A **touchscreen kiosk game** gets people to stop, play and stay with the brand longer. It works when it is planned around the campaign goal from the start. This is what our team checks every time before we begin.

## Agree on what the game is for

- **Product awareness:** the game walks players through what makes the product different
- **Leads:** players register for a prize once they finish
- **Sharing:** the result screen is something people want to photograph or post
- **Learning:** players make each decision themselves, and the game explains why when they choose wrong

## Rules people can learn by watching

Event floors are loud and people are in a hurry. If the instructions take reading, people walk on. We aim for someone standing behind the player to understand the game within a few seconds.

## A minute or less per round

Queues stay short and new players keep arriving. If the game has several stages, keep each one short and timed.

## The screen should work when nobody is playing

Between players, loop an animation or a leaderboard. It pulls people in from across the room.

## Large buttons, and a backup way to play

Players come in all ages, and most are touching this screen for the first time, so buttons need to be large and respond instantly. If the game uses voice or camera gestures, give it a touch-only fallback. The game we delivered most recently can be played by voice, by moving in front of the camera and by touch. If the microphone or camera fails, players can still finish.

## Collect only what you will use

If you collect names or phone numbers, say clearly what they are for and ask for consent separately from joining the game, under Thailand's PDPA or the privacy law that applies to your event. Keep only what you will use and decide who can see it. If the event doesn't need leads, such as an educational game for children, collecting nothing at all is a good choice.

## Prepare the event floor

1. Lock the device so only the game can run
2. Keep the game playable on unreliable event internet, and send the data later
3. Have a spare unit and someone looking after the system on site
4. Rehearse on the real screen in the real venue

## Measure after the event

Track rounds played, the share of players who finish and the number of consented leads. These numbers tell you what to change next time.

## How we can help

We design and build the game, set up registration and prize draws, and send someone to look after the system on the day. See our [Event Interactive](/en/services/event-interactive/) page.`,
      faq: [
        { q: "How long does a kiosk game take to prepare?", a: "It depends on the game and its data connections. Talk to us as soon as you know the date, so there is time to design, test and rehearse on the actual hardware." },
        { q: "Does a kiosk game need internet?", a: "Not always. A game can run offline and send its data once a connection is available." },
        { q: "Can the same game be reused at other events?", a: "Yes. If images, text and prizes are configurable, one game can serve many events or campaigns." },
      ],
    },
  },
  {
    slug: "kol-influencer-campaign-guide",
    service: "kol-influencer",
    image: "/imagery/articles/kol-creator.webp",
    datePublished: "2026-11-09",
    th: {
      title: "เลือก KOL และ Influencer ให้ตรงแคมเปญ: สิ่งที่เราดูก่อนเสนอรายชื่อ",
      description:
        "วิธีเลือก KOL และ Influencer ให้เหมาะกับแบรนด์ ดูจากกลุ่มผู้ชม ความน่าเชื่อถือ และผลงานเดิม พร้อมวิธีบรีฟ วางตารางคอนเทนต์ และวัดผล จากงานคัด KOL ของทีมเรา",
      keywords: ["เลือก KOL", "จ้าง Influencer", "KOL Marketing", "Influencer Marketing", "แคมเปญ KOL", "หา KOL ให้แบรนด์"],
      imageAlt: "ครีเอเตอร์กำลังถ่ายวิดีโอด้วยสมาร์ตโฟนในบูธงานอีเวนต์",
      category: "KOL และ Influencer",
      body: `คำถามแรกที่แบรนด์มักถามคือ ควรใช้ใคร คำถามที่เราอยากให้ถามก่อนคือ แคมเปญนี้ต้องการให้คนทำอะไร เพราะคนที่มีผู้ติดตามมากที่สุดอาจไม่ใช่คนที่กลุ่มเป้าหมายเชื่อในเรื่องนั้น

## แบ่งหน้าที่ก่อนเลือกคน

- **ให้คนรู้จัก:** ครีเอเตอร์ที่มีผู้ชมกว้าง
- **ให้คนเชื่อ:** คนที่มีความรู้ในเรื่องนั้นจริง
- **ให้คนตัดสินใจ:** ครีเอเตอร์สายรีวิวที่มีผู้ติดตามเฉพาะกลุ่ม

แคมเปญส่วนใหญ่ใช้หลายกลุ่มร่วมกัน แคมเปญที่เราทำให้แบรนด์เครื่องพิมพ์ระดับโลกใช้ KOL 55 คน แต่ละกลุ่มได้บรีฟและหน้าที่ต่างกัน

## 5 ข้อที่เราเช็กก่อนเสนอรายชื่อ

1. ผู้ติดตามตรงกับลูกค้าของแบรนด์ไหม
2. คนในคอมเมนต์คุยกันจริง หรือมีแต่อีโมจิ
3. คอนเทนต์ที่ผ่านมาเข้ากับแบรนด์ไหม
4. เพิ่งรีวิวคู่แข่งโดยตรงไปหรือเปล่า
5. เคยพาผู้ชมไปทำอะไรต่อได้จริงไหม เช่น ลงทะเบียนหรือซื้อ

## บรีฟให้ชัด แล้วให้เขาเล่าเอง

บรีฟที่ดีบอกสิ่งที่ต้องพูดและสิ่งที่ห้ามพูดให้ชัด ส่วนวิธีเล่าให้เป็นสไตล์ของครีเอเตอร์ ผู้ติดตามคุ้นกับเสียงของเขา ถ้าอ่านตามสคริปต์ของแบรนด์ คนดูจะรู้ทันที

## ทำให้คอนเทนต์ทำงานต่อ

วางตารางโพสต์ให้ตรงกับโฆษณาและกิจกรรมอื่น ตกลงสิทธิ์นำคลิปไปใช้ยิงแอดตั้งแต่ตอนจ้าง และบอกผู้ชมให้ชัดว่าเป็นงานร่วมกับแบรนด์ เครื่องมือของเราช่วยทำภาพประกอบและวิดีโอพร้อมซับไตเติลให้ KOL เลือกไปใช้ งานจึงผลิตได้ไวขึ้น

## วัดผลตามเป้าหมาย

ถ้าเป้าหมายคือให้คนรู้จัก ให้ดูการเข้าถึงและการมีส่วนร่วม ถ้าเป้าหมายคือยอดขาย ให้แต่ละคนใช้ลิงก์หรือโค้ดของตัวเอง จะเห็นว่าใครพาลูกค้ามาจริง

## เราช่วยอะไรได้บ้าง

เราคัด KOL วางแผนแคมเปญ ทำ creative และสรุปผลหลังจบงาน ดูรายละเอียดที่หน้า [KOL และ Influencer](/services/kol-influencer/)`,
      faq: [
        { q: "ควรเลือก KOL รายใหญ่หรือ Micro Influencer", a: "ขึ้นกับเป้าหมาย รายใหญ่เหมาะกับการให้คนรู้จักในวงกว้าง Micro Influencer เหมาะกับกลุ่มเฉพาะและงานรีวิวที่คนเชื่อ หลายแคมเปญใช้ทั้งสองแบบ" },
        { q: "วัดผลแคมเปญ KOL อย่างไร", a: "ตั้งตัวชี้วัดก่อนเริ่ม เช่น การเข้าถึง การมีส่วนร่วม จำนวนคลิก หรือยอดขายจากลิงก์และโค้ดของแต่ละคน" },
      ],
    },
    en: {
      title: "Choosing KOLs and Influencers for a Campaign: What We Check Before Proposing Names",
      description:
        "How to choose KOLs and influencers by audience, credibility and past work, with practical steps for briefing, scheduling content and measuring results, from our team's KOL work.",
      keywords: ["how to choose KOLs", "influencer marketing guide", "KOL marketing", "influencer campaign planning", "KOL agency Thailand"],
      imageAlt: "A content creator filming with a smartphone at an event booth",
      category: "KOL & Influencers",
      body: `The first thing brands usually ask is who they should use. The question we would like to start with is what the campaign needs people to do. The creator with the biggest following may not be the person your audience trusts on that subject.

## Give each creator a role first

- **Awareness:** creators with a broad audience
- **Credibility:** people who really know the subject
- **Decision:** reviewers with a focused following

Most campaigns combine several groups. The campaign we ran for a global printer brand used 55 KOLs, and each group had its own brief and job.

## Five things we check before proposing names

1. Does the audience match the brand's customers?
2. Are people really talking in the comments, or is it all emojis?
3. Does past content fit the brand?
4. Have they just promoted a direct competitor?
5. Have they moved their audience to act before, such as registering or buying?

## Brief clearly, then let them tell it

A good brief is clear about what must be said and what must not. How it is said stays in the creator's own style. Followers know that voice, and they can tell straight away when someone reads a brand script.

## Make the content keep working

Schedule posts alongside your ads and other activity, agree the rights to reuse clips in ads when you hire, and make the partnership clear to viewers. Our own tools produce illustrations and video with subtitles for KOLs to choose from, so content gets made faster.

## Measure against the goal

For awareness, look at reach and engagement. For sales, give each creator their own link or code so you can see who really brought customers.

## How we can help

We select KOLs, plan the campaign, produce the creative and report after it ends. See our [KOL & Influencers](/en/services/kol-influencer/) service.`,
      faq: [
        { q: "Should we choose big KOLs or micro influencers?", a: "It depends on the goal. Big names suit broad awareness. Micro influencers suit focused audiences and reviews people trust. Many campaigns use both." },
        { q: "How do you measure a KOL campaign?", a: "Set the metrics before launch, such as reach, engagement, clicks or sales from each creator's link or code." },
      ],
    },
  },
  {
    slug: "event-content-production-checklist",
    service: "event-content",
    image: "/imagery/articles/event-production.webp",
    datePublished: "2026-11-09",
    th: {
      title: "ถ่ายงานอีเวนต์ให้มีคอนเทนต์ใช้ต่อ: เช็กลิสต์ก่อน ระหว่าง และหลังงาน",
      description:
        "เช็กลิสต์ถ่ายภาพและวิดีโองานอีเวนต์ที่ทีมเราใช้ ตั้งแต่ทำ shot list ขออนุญาต ถ่ายเผื่อแนวตั้ง ไปจนถึงตัดคลิปหลายแบบและจัดเก็บไฟล์ให้หาเจอ",
      keywords: ["ถ่ายทำงานอีเวนต์", "ถ่ายวิดีโองานอีเวนต์", "ตัดต่อคลิปอีเวนต์", "Event Production", "ทีมถ่ายงานอีเวนต์"],
      imageAlt: "ทีมถ่ายวิดีโอกำลังทำงานในงานเปิดตัวสินค้า",
      category: "Event Production",
      body: `งานอีเวนต์จัดไม่กี่วัน แต่ภาพและวิดีโอจากงานใช้ต่อได้อีกหลายเดือน ถ้าวางแผนการถ่ายตั้งแต่ก่อนงาน แบรนด์จะได้มากกว่าคลิปสรุปหนึ่งชิ้น นี่คือเช็กลิสต์ที่ทีมเราใช้

## ก่อนวันงาน

- ตกลงว่าคอนเทนต์จะไปลงที่ไหน เช่น Reels, TikTok, YouTube หรือหน้าเว็บ
- ทำ shot list ภาพที่ต้องได้ เช่น บรรยากาศ สินค้า ผู้บริหาร และผู้ร่วมงาน
- ไปดูสถานที่จริง เรื่องแสง เสียง และจุดตั้งกล้อง
- เตรียมป้ายแจ้งว่ามีการถ่ายภาพ และขออนุญาตคนที่จะสัมภาษณ์

## ระหว่างงาน

### ถ่ายทั้งภาพกว้างและภาพใกล้

ภาพกว้างบอกว่างานใหญ่แค่ไหน ภาพใกล้ เช่น มือที่แตะจอหรือคนที่กำลังหัวเราะ ทำให้คลิปมีชีวิต

### คิดเรื่องแนวตั้งตั้งแต่ตอนถ่าย

จัดเฟรมให้ใช้กับวิดีโอแนวตั้งได้ตั้งแต่ต้น ได้ภาพดีกว่าไปครอปทีหลัง

### ถามผู้ร่วมงานคำถามเดียว

เช่น ชอบอะไรที่สุดในงานนี้ คำตอบสั้น ๆ จากคนจริงน่าเชื่อกว่าข้อความโฆษณา

## หลังงาน

1. ปล่อยภาพและคลิปสั้นภายในวันงานหรือวันถัดไป ตอนที่คนยังพูดถึง
2. ตัดคลิปสรุปหลักสำหรับหน้าเว็บและงานนำเสนอ
3. แยกคลิปย่อยตามหัวข้อไว้โพสต์ต่อเนื่อง
4. จัดเก็บไฟล์ให้ค้นเจอและหยิบมาใช้ใหม่ได้

## เราจัดไฟล์อย่างไรให้ตัดต่อได้ไว

ทีมเราเก็บฟุตเทจบน Google Drive โดยติดข้อมูลว่าถ่ายวันไหนและถ่ายอะไร แล้วเชื่อมกับ AI ผ่าน MCP เวลาตัดต่อ แค่ถามว่าต้องการช็อตไหนก็ได้ไฟล์ทันที จากนั้นเรียงไฟล์ลงไทม์ไลน์ใน CapCut ตาม storyboard งานตัดต่อจึงส่งได้เร็ว ถ้าทีมของคุณอยากได้ระบบแบบนี้ไว้ใช้เอง เราสร้างให้ได้

## เราช่วยอะไรได้บ้าง

งานคอนเทนต์และงานขนาดเล็ก ทีมเราถ่ายและตัดต่อเอง งานใหญ่ที่ต้องใช้กล้องและทีมงานเต็มรูปแบบ เราทำร่วมกับทีมโปรดักชันที่ทำงานด้วยกันประจำ ดูรายละเอียดที่หน้า [Event Production](/services/event-content/)`,
      faq: [
        { q: "ควรจองทีมถ่ายงานอีเวนต์ล่วงหน้าเท่าไร", a: "คุยตั้งแต่รู้วันงานและกำหนดการ จะได้มีเวลาทำ shot list และไปดูสถานที่" },
        { q: "งานเดียวทำคอนเทนต์ได้กี่ชิ้น", a: "ขึ้นกับขนาดงานและแผนการถ่าย ถ้าวางแผนก่อน งานเดียวแยกเป็นคลิปสรุป คลิปสั้นหลายตัว และภาพนิ่งหลายชุดได้" },
      ],
    },
    en: {
      title: "Filming an Event for Content You Can Keep Using: A Before, During and After Checklist",
      description:
        "The checklist our team uses for event photo and video: shot lists, permissions, vertical framing, cutting several formats and keeping files easy to find.",
      keywords: ["event video production", "event content checklist", "event videography", "event recap video", "event content strategy"],
      imageAlt: "A video crew working at a bright product launch event",
      category: "Event Production",
      body: `An event lasts a few days, but its photos and video can keep working for months. When filming is planned before the event, the brand gets far more than one recap film. This is the checklist our team uses.

## Before the event

- Agree where the content will go, such as Reels, TikTok, YouTube or your website
- Write a shot list: atmosphere, products, leadership and guests
- Visit the venue to check light, sound and camera positions
- Put up filming notices and get permission from anyone you will interview

## During the event

### Shoot wide and close

Wide shots show how big the event is. Close shots, such as a hand on a screen or someone laughing, bring the film to life.

### Think vertical while you shoot

Frame for vertical video from the start. It looks better than cropping later.

### Ask guests one question

For example, what did you like most today? A short answer from a real guest is more convincing than ad copy.

## After the event

1. Post photos and short clips the same day or the next, while people are still talking
2. Cut a main recap for your website and presentations
3. Cut shorter clips by topic for ongoing posts
4. Store files so they can be found and reused

## How we keep editing fast

Our team keeps footage on Google Drive, tagged by shoot day and subject, and connected to AI through MCP. When editing, we ask for the shot we need and get the files straight away, then lay them onto a CapCut timeline in storyboard order. That is why our edits ship quickly. If your team wants a system like this for its own use, we can build one.

## How we can help

For content shoots and smaller events, our own team films and edits. For large productions that need full camera crews, we work with a production team we work with regularly. See our [Event Production](/en/services/event-content/) service.`,
      faq: [
        { q: "How far ahead should we book an event crew?", a: "Talk to us as soon as you know the date and schedule, so there is time for a shot list and a venue visit." },
        { q: "How much content can one event produce?", a: "It depends on the event and the plan. With a plan, one event can give you a recap, several short clips and a few photo sets." },
      ],
    },
  },
  {
    slug: "digital-marketing-plan-for-brands",
    service: "digital-marketing",
    image: "/imagery/articles/marketing-plan.webp",
    datePublished: "2026-11-09",
    th: {
      title: "วางแผน Digital Marketing ให้แบรนด์: เริ่มจากเป้าหมาย กลุ่มลูกค้า และการวัดผล",
      description:
        "7 ขั้นที่ทีมเราใช้วางแผน Digital Marketing ให้แบรนด์ ตั้งเป้าที่วัดได้ ทำความเข้าใจลูกค้า แบ่งหน้าที่ช่องทาง ยิงแอดแบบทดลอง และวัดผลเป็นรอบ",
      keywords: ["วางแผน Digital Marketing", "แผนการตลาดดิจิทัล", "ยิงแอด", "ดูแลเพจ", "หากลุ่มเป้าหมาย", "รับทำการตลาดออนไลน์"],
      imageAlt: "การ์ดแผนแคมเปญที่เชื่อมต่อกันบนโต๊ะสีขาว",
      category: "Digital Marketing",
      body: `เวลาแบรนด์มาคุยเรื่องยิงแอด คำถามแรกของเราคือ อยากได้อะไรจากงบก้อนนี้ ถ้ายังตอบไม่ได้ งบจะหมดไปโดยไม่รู้ว่าอะไรได้ผล แผนที่ดีไม่ต้องยาว ขอให้ตอบได้ว่าจะพูดกับใคร ที่ไหน และวัดความสำเร็จด้วยตัวเลขอะไร

## 1. ตั้งเป้าที่วัดได้

เป้าหมายควรเป็นตัวเลขทางธุรกิจ เช่น จำนวนลูกค้าที่ทักเข้ามา หรือจำนวนคนลงทะเบียน ยอดไลก์เป็นแค่ตัวเลขประกอบ

## 2. ทำความเข้าใจลูกค้า

ดูข้อมูลลูกค้าเดิม คำถามที่ทีมขายเจอบ่อย และสิ่งที่คนพูดถึงบนโซเชียล แล้วสรุปว่าเขามีปัญหาอะไร และตัดสินใจจากอะไร

## 3. ให้แต่ละช่องทางมีหน้าที่

- **โฆษณา:** พาแบรนด์ไปเจอคนกลุ่มใหม่
- **Social และเพจ:** คุยกับคนที่รู้จักแบรนด์แล้วอย่างต่อเนื่อง
- **เว็บไซต์และ SEO:** รับคนที่กำลังหาข้อมูลอยู่
- **ข้อความถึงลูกค้าเดิม:** ชวนกลับมาซื้อซ้ำ

## 4. วางคอนเทนต์ตามขั้นการตัดสินใจ

คนที่เพิ่งรู้จักแบรนด์อยากรู้คนละเรื่องกับคนที่พร้อมซื้อ ควรมีทั้งคอนเทนต์ที่ทำให้คนรู้จัก ให้ความรู้ และชวนตัดสินใจ

## 5. ยิงแอดแบบทดลองก่อน

เริ่มจากหลายชิ้นงานหรือกลุ่มเป้าหมายเล็ก ๆ ดูผลสักระยะ แล้วย้ายงบไปที่ชิ้นที่ได้ผล เสี่ยงน้อยกว่าลงงบก้อนเดียวกับชิ้นงานเดียว

## 6. ตั้งการวัดผลก่อนเริ่ม

ติดตั้งการติดตามบนเว็บไซต์ และติด UTM ในลิงก์แคมเปญก่อนปล่อยแอด จะรู้ได้ว่าลูกค้ามาจากไหน

## 7. ทบทวนเป็นรอบ

ดูผลทุกสัปดาห์เพื่อปรับชิ้นงาน และทุกเดือนเพื่อปรับแผน เราใช้ระบบที่ดึงความเคลื่อนไหวของคู่แข่งเป็นรอบ ๆ มาประกอบ และนำเสียงลูกค้าจาก [Social Listening](/services/social-listening/) มาใช้วางรอบถัดไป

## เราช่วยอะไรได้บ้าง

เราวางแผน ดูแลเพจ ยิงแอด และหากลุ่มเป้าหมายใหม่ให้แบรนด์ ดูรายละเอียดที่หน้า [Digital Marketing](/services/digital-marketing/)`,
      faq: [
        { q: "ควรเริ่มยิงแอดเมื่อไร", a: "เมื่อมีเป้าหมาย มีหน้าปลายทางที่พร้อมรับลูกค้า และตั้งการวัดผลแล้ว งบที่ใช้จะได้บอกอะไรกลับมา" },
        { q: "ต้องทำทุกแพลตฟอร์มไหม", a: "ไม่ต้อง เลือกแพลตฟอร์มที่กลุ่มเป้าหมายใช้จริงและทีมดูแลได้ต่อเนื่อง" },
      ],
    },
    en: {
      title: "Planning Digital Marketing for a Brand: Start With Goals, Customers and Measurement",
      description:
        "The seven steps our team uses to plan digital marketing for brands: measurable goals, understanding customers, a job for each channel, test-first ads and regular reviews.",
      keywords: ["digital marketing plan", "digital marketing strategy for brands", "paid ads planning", "social media management", "digital marketing agency Thailand"],
      imageAlt: "Connected campaign planning cards arranged on a white table",
      category: "Digital Marketing",
      body: `When a brand comes to us about running ads, our first question is what they want from that budget. If there is no answer yet, the money gets spent without anyone knowing what worked. A good plan doesn't need to be long. It needs to say who you are talking to, where, and which number shows success.

## 1. Set goals you can measure

Goals should be business numbers, such as enquiries or registrations. Likes are a supporting number.

## 2. Understand your customers

Look at existing customers, the questions your sales team hears most and what people say on social media. Then write down what problems they have and how they decide.

## 3. Give every channel a job

- **Paid ads:** reach new people
- **Social and pages:** keep talking with people who already know the brand
- **Website and SEO:** serve people who are already searching
- **Messages to existing customers:** bring them back

## 4. Match content to the decision stage

Someone who just found the brand wants different things from someone ready to buy. Plan content for awareness, for learning and for the decision.

## 5. Test ads before you scale

Start with several creatives or small audiences, give it some time, then move budget to what works. It is less risky than one large budget on one creative.

## 6. Set up measurement before launch

Install website tracking and add UTM tags to campaign links before the ads go out, so you know where customers come from.

## 7. Review in rounds

Check weekly to adjust creative and monthly to adjust the plan. We also pull competitor activity batch by batch, and use customer feedback from [social listening](/en/services/social-listening/) to plan the next round.

## How we can help

We plan, manage pages, run ads and find new audiences for brands. See our [Digital Marketing](/en/services/digital-marketing/) service.`,
      faq: [
        { q: "When should we start running ads?", a: "When you have a goal, a landing point ready for customers and measurement in place, so the spend tells you something." },
        { q: "Do we need to be on every platform?", a: "No. Choose the platforms your audience really uses and your team can keep up with." },
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
        "Social Listening คือการเก็บและวิเคราะห์สิ่งที่คนพูดถึงแบรนด์ คู่แข่ง และตลาดบนโลกออนไลน์ บทความนี้สรุปการใช้งาน ขั้นตอน และสิ่งที่รายงานควรมี",
      keywords: ["Social Listening คืออะไร", "Social Listening", "Social Monitoring", "วิเคราะห์ Sentiment", "รายงาน Social Listening", "ฟังเสียงลูกค้าออนไลน์"],
      imageAlt: "แผ่นกระดาษสีขาวเรียงเป็นคลื่นเสียง มีหนึ่งแผ่นสีทอง",
      category: "Social Listening",
      body: `**Social Listening** คือการเก็บและวิเคราะห์สิ่งที่คนพูดถึงแบรนด์ คู่แข่ง และตลาดบนโลกออนไลน์ แล้วสรุปเป็นสิ่งที่ทีมนำไปตัดสินใจได้ ทีมเราทำงานนี้ร่วมกับพาร์ตเนอร์ด้านวิเคราะห์ข้อมูล บทความนี้สรุปสิ่งที่แบรนด์ควรรู้ก่อนเริ่ม

## ต่างจาก Social Monitoring อย่างไร

Social Monitoring คือการตามดูว่าใครพูดถึงแบรนด์ แล้วตอบกลับเป็นรายกรณี Social Listening ดูภาพรวมของการพูดถึงทั้งหมด เพื่อหาแนวโน้มและเหตุผลเบื้องหลัง แล้วนำไปปรับกลยุทธ์

## แบรนด์ใช้ทำอะไรได้บ้าง

- ดูว่าคนรู้สึกอย่างไรกับแบรนด์
- ดูกระแสก่อนและหลังแคมเปญ
- เห็นปัญหาก่อนที่จะลุกลาม
- เทียบเสียงพูดถึงกับคู่แข่ง
- หาหัวข้อคอนเทนต์จากคำถามจริงของลูกค้า
- หาครีเอเตอร์ที่กลุ่มเป้าหมายพูดถึงอยู่แล้ว

## ขั้นตอนการทำ

1. ตั้งคำถามที่อยากรู้
2. รวมคำค้น เช่น ชื่อแบรนด์ ชื่อที่คนมักเขียนผิด ชื่อคู่แข่ง และแฮชแท็ก
3. เลือกแหล่งข้อมูลที่กลุ่มเป้าหมายใช้
4. คัดข้อมูลที่ไม่เกี่ยวข้องออก
5. วิเคราะห์หัวข้อและความรู้สึก
6. สรุปเป็นสิ่งที่ทีมต้องทำต่อ

## ระวังเรื่องภาษาไทย

ระบบวิเคราะห์ความรู้สึกอัตโนมัติอ่านคำประชด คำแสลง และบริบทแบบไทยพลาดได้ง่าย ควรให้คนอ่านตัวอย่างข้อมูลก่อนสรุปผลทุกครั้ง

## รายงานที่ทีมใช้ได้จริง

ควรมีประเด็นสำคัญ แนวโน้มการพูดถึง ความรู้สึกต่อแบรนด์ หัวข้อที่คนสนใจ ตัวอย่างความคิดเห็นจริง และข้อเสนอว่าควรทำอะไรต่อ

## เราช่วยอะไรได้บ้าง

เราทำงานนี้ร่วมกับพาร์ตเนอร์ด้าน Social Listening และเชื่อมข้อมูลแต่ละรอบเข้ากับ AI ที่ทีมของคุณใช้อยู่ผ่าน MCP ทีมของคุณจึงถามข้อมูลเองได้ตลอดเวลา ดูรายละเอียดที่หน้า [Social Listening](/services/social-listening/)`,
      faq: [
        { q: "Social Listening ดูข้อมูลอะไรได้บ้าง", a: "ส่วนใหญ่เป็นข้อมูลสาธารณะจากโซเชียลมีเดีย เว็บข่าว เว็บบอร์ด และบล็อก ข้อความส่วนตัวและกลุ่มปิดมักไม่อยู่ในขอบเขต" },
        { q: "ควรทำ Social Listening บ่อยแค่ไหน", a: "แบรนด์ที่มีคนพูดถึงต่อเนื่องควรติดตามเป็นประจำ และดูละเอียดขึ้นช่วงก่อน ระหว่าง และหลังแคมเปญสำคัญ" },
      ],
    },
    en: {
      title: "What Is Social Listening? How Brands Use It and How It Differs from Monitoring",
      description:
        "Social listening is collecting and analysing what people say online about a brand, its competitors and its market. What it is used for, how it works and what a useful report includes.",
      keywords: ["what is social listening", "social listening vs monitoring", "social listening report", "sentiment analysis", "social listening Thailand"],
      imageAlt: "White paper fins arranged like a sound wave with one gold fin",
      category: "Social Listening",
      body: `**Social listening** is collecting and analysing what people say online about a brand, its competitors and its market, then turning it into something a team can act on. We deliver this work with a data analysis partner. Here is what a brand should know before starting.

## How it differs from social monitoring

Social monitoring follows who mentions the brand and responds case by case. Social listening looks at the whole conversation to find patterns and the reasons behind them, then uses them to adjust strategy.

## What brands use it for

- Seeing how people feel about the brand
- Reading the response before and after a campaign
- Spotting problems before they spread
- Comparing share of conversation with competitors
- Finding content topics in real customer questions
- Finding the creators an audience already talks about

## How it works

1. Set the question you want answered
2. Build a keyword set: brand names, common misspellings, competitors and hashtags
3. Choose the sources your audience uses
4. Remove what isn't relevant
5. Analyse topics and sentiment
6. Turn the findings into actions

## Watch the language

Automated sentiment tools easily misread sarcasm, slang and local context, especially in Thai. Someone should read a sample of the data before any conclusion is drawn.

## A report your team can use

It should cover the key findings, conversation trends, sentiment toward the brand, the topics people care about, real example comments and what to do next.

## How we can help

We deliver social listening with a partner and connect each batch of data to the AI your team already uses through MCP, so your team can ask about it at any time. See our [Social Listening](/en/services/social-listening/) service.`,
      faq: [
        { q: "What data does social listening cover?", a: "Mostly public data from social media, news sites, forums and blogs. Private messages and closed groups are usually out of scope." },
        { q: "How often should a brand do social listening?", a: "Brands with ongoing conversation should track it regularly, and look more closely before, during and after major campaigns." },
      ],
    },
  },
  {
    slug: "what-is-mcp-for-brands",
    service: "website-software",
    image: "/imagery/articles/mcp-connect.webp",
    datePublished: "2026-11-09",
    th: {
      title: "MCP คืออะไร ทำไมระบบของแบรนด์ควรเปิดให้ AI เชื่อมต่อได้",
      description:
        "MCP หรือ Model Context Protocol คือมาตรฐานเปิดที่ให้ AI เชื่อมต่อกับข้อมูลและเครื่องมือของธุรกิจ บทความนี้อธิบายแบบง่าย พร้อมเรื่องสิทธิ์การเข้าถึงและวิธีเริ่มจากเรื่องเล็ก",
      keywords: ["MCP คืออะไร", "Model Context Protocol", "เชื่อม AI กับข้อมูลบริษัท", "AI สำหรับธุรกิจ", "ซอฟต์แวร์ที่เชื่อม AI ได้"],
      imageAlt: "อุปกรณ์เซรามิกสีขาวที่มีสายหลายเส้นเชื่อมต่อเข้าวงแหวนสีทอง",
      category: "ซอฟต์แวร์",
      body: `หลายทีมอยากถาม AI เรื่องข้อมูลของบริษัทตัวเอง เช่น แคมเปญไหนได้รายชื่อลูกค้ามากที่สุด แต่ข้อมูลอยู่กระจัดกระจายหลายระบบ **MCP หรือ Model Context Protocol** คือมาตรฐานเปิดที่ให้แอป AI เชื่อมต่อกับข้อมูลและเครื่องมือภายนอกด้วยวิธีเดียวกัน

MCP เปิดตัวโดย Anthropic เมื่อเดือนพฤศจิกายน 2024 และไม่ผูกกับ AI เจ้าใดเจ้าหนึ่ง ข้อมูลทางเทคนิคอยู่ที่[เว็บไซต์ทางการของ MCP](https://modelcontextprotocol.io/)

## อธิบายแบบง่าย

นึกถึงช่องเสียบ USB ที่ใช้กับอุปกรณ์ได้หลายชนิด ระบบที่รองรับ MCP ก็มีช่องมาตรฐานให้แอป AI ที่รองรับเข้ามาอ่านข้อมูลหรือใช้เครื่องมือได้ ไม่ต้องเขียนการเชื่อมต่อใหม่ทุกครั้งที่เปลี่ยน AI

## แบรนด์ได้อะไร

- **ถามข้อมูลด้วยภาษาธรรมดา:** ไม่ต้องรอทีมเทคนิคดึงรายงานให้ทุกครั้ง
- **เปลี่ยน AI ได้:** วันที่มีเครื่องมือที่ดีกว่า ก็ย้ายไปใช้ได้
- **ข้อมูลอยู่ที่เดิม:** AI เข้าถึงตามสิทธิ์ที่กำหนด ไม่ต้องคัดลอกข้อมูลไปไว้หลายที่

## สิ่งที่ต้องออกแบบให้ดี

การเชื่อมผ่าน MCP ไม่ได้ทำให้ระบบปลอดภัยขึ้นเอง และ AI ก็ยังไม่รู้จักธุรกิจของคุณ จึงต้องกำหนดให้ชัดว่า

1. AI เห็นข้อมูลชุดไหนได้บ้าง
2. ส่วนไหนอ่านได้อย่างเดียว ส่วนไหนแก้ไขได้
3. ใครมีสิทธิ์ใช้
4. มีบันทึกการใช้งานไว้ตรวจย้อนหลังหรือไม่

## เริ่มจากเรื่องเล็ก

เลือกคำถามที่ทีมถามบ่อยหนึ่งเรื่อง เปิดให้อ่านได้อย่างเดียวในข้อมูลชุดเล็ก ลองใช้สักระยะ เช็กว่าคำตอบถูก แล้วค่อยขยาย

## ที่ทีมเราใช้อยู่

เราใช้ MCP กับงานของตัวเองทุกวัน เช่น คลังฟุตเทจงานอีเวนต์ที่ค้นด้วย AI รวมถึงข้อมูล Social Listening และข้อมูลคู่แข่งที่ลูกค้าถาม AI ของตัวเองได้ ระบบที่เราสร้างให้ลูกค้าเชื่อมผ่าน MCP ได้ ในงานที่ทีมของลูกค้าต้องใช้ข้อมูล ดูตัวอย่างที่หน้า [เครื่องมือ](/tools/)`,
      faq: [
        { q: "MCP ใช้ได้กับ AI ตัวไหนบ้าง", a: "ใช้ได้กับแอป AI ที่รองรับมาตรฐาน MCP ซึ่งมีหลายเจ้า ควรเช็กว่าเครื่องมือที่ทีมใช้อยู่รองรับหรือยัง" },
        { q: "การเปิด MCP จะทำให้ข้อมูลรั่วไหลไหม", a: "ขึ้นกับการออกแบบ ควรจำกัดสิทธิ์ เริ่มจากอ่านอย่างเดียว และเก็บบันทึกการใช้งาน" },
      ],
    },
    en: {
      title: "What Is MCP, and Why Should a Brand's Systems Be Open to AI?",
      description:
        "MCP, the Model Context Protocol, is an open standard for connecting AI to business data and tools. A plain explanation, the access controls that matter and how to start small.",
      keywords: ["what is MCP", "Model Context Protocol for business", "connect AI to company data", "MCP explained", "AI-ready software"],
      imageAlt: "A white ceramic hub with cables connecting to a glowing gold ring",
      category: "Software",
      body: `Many teams want to ask AI about their own company data, such as which campaign brought in the most leads, but that data sits in several systems. **MCP, the Model Context Protocol,** is an open standard that lets AI apps connect to outside data and tools in the same way.

Anthropic introduced MCP in November 2024, and it is not tied to any one AI vendor. Technical details are on the [official MCP website](https://modelcontextprotocol.io/).

## The simple explanation

Think of a USB port that works with many kinds of devices. A system that supports MCP offers a standard socket that compatible AI apps can use to read data or run tools, without a new integration every time you change AI.

## What a brand gets

- **Questions in plain language:** no waiting for a technical team to pull every report
- **Freedom to change AI:** when a better tool comes along, you can move
- **Data stays where it is:** AI gets the access you grant, with no copies spread around

## What needs careful design

Connecting through MCP doesn't make a system safer by itself, and the AI still doesn't know your business. Decide clearly:

1. Which data the AI can see
2. What is read-only and what can be changed
3. Who can use it
4. Whether use is logged for later review

## Start small

Pick one question your team asks often, open read-only access to a small set of data, use it for a while, check the answers are right, then expand.

## How our team uses it

We use MCP in our own work every day, for example a footage library from events that we search with AI, and social listening and competitor data that clients query with their own AI. The systems we build for clients can connect through MCP where the client's team needs the data. See examples on our [Tools](/en/tools/) page.`,
      faq: [
        { q: "Which AI tools work with MCP?", a: "AI apps that support the MCP standard, which come from several vendors. Check whether the tools your team uses support it yet." },
        { q: "Does opening MCP put our data at risk?", a: "It depends on the design. Limit permissions, start read-only and keep usage logs." },
      ],
    },
  },
  {
    slug: "building-systems-at-scale",
    service: "website-software",
    image: "/imagery/articles/system-scale.webp",
    datePublished: "2026-11-09",
    th: {
      title: "ทำระบบให้รองรับคนใช้พร้อมกันจำนวนมาก: สิ่งที่ต้องวางแผนก่อนเริ่มพัฒนา",
      description:
        "สิ่งที่ทีมเราวางแผนทุกครั้งกับเว็บแอปและระบบองค์กรที่ต้องรับคนใช้พร้อมกันจำนวนมาก ทั้งการคาดช่วงพีก ทดสอบโหลด ความปลอดภัย และการดูแลระยะยาว",
      keywords: ["ระบบรองรับผู้ใช้จำนวนมาก", "พัฒนาระบบองค์กร", "รับทำเว็บแอป", "Load Testing", "รับทำระบบองค์กร", "Software House"],
      imageAlt: "แผงกระจกสีขาวเรียงเป็นตารางยาวสุดสายตา มีเส้นแสงสีทองพาดผ่าน",
      category: "ซอฟต์แวร์",
      body: `ระบบที่ใช้งานได้ดีตอนมีคนใช้ไม่กี่คน อาจล่มทันทีเมื่อทุกคนเข้ามาพร้อมกัน เช่น นาทีแรกที่เปิดลงทะเบียน วันเริ่มโปรโมชัน หรือเช้าวันงานอีเวนต์

ทีมเราเคยพัฒนาระบบลงทะเบียนเรียนของมหาวิทยาลัยธรรมศาสตร์ ซึ่งต้องรับนักศึกษาหลายหมื่นคนพร้อมกันในช่วงลงทะเบียน และยังใช้งานอยู่ที่ reg.tu.ac.th เรื่องด้านล่างคือสิ่งที่เราวางแผนทุกครั้งกับงานแบบนี้

## รู้ช่วงพีกก่อนออกแบบ

ถามให้ชัดว่าช่วงที่หนักที่สุดมีคนใช้พร้อมกันเท่าไร เกิดเมื่อไร และคนทำอะไรในช่วงนั้น ค่าเฉลี่ยรายวันบอกความเสี่ยงจริงไม่ได้

## ออกแบบจุดที่จะรับแรง

- แยกส่วนที่คนเปิดดูบ่อยออกจากขั้นตอนที่ต้องบันทึกข้อมูล
- เก็บแคชข้อมูลที่ไม่ค่อยเปลี่ยน
- ใช้คิวกับงานที่ไม่ต้องตอบทันที
- กันการกดซ้ำและการจองซ้อน
- ถ้าระบบรับไม่ไหว ให้ปิดบางฟีเจอร์ชั่วคราว ระบบหลักจะยังใช้งานได้

## ทดสอบด้วยสถานการณ์จริง

ทำ load test ตามพฤติกรรมจริงของผู้ใช้ เช่น ทุกคนกดปุ่มเดียวกันในนาทีแรก แล้วดูว่าส่วนไหนช้าก่อน

## ความปลอดภัยและข้อมูลส่วนบุคคล

กำหนดสิทธิ์ตามหน้าที่ เข้ารหัสข้อมูลสำคัญ บันทึกการใช้งาน และเก็บข้อมูลเท่าที่จำเป็นตาม PDPA

## วันเปิดใช้งานจริง

1. เฝ้าดูระบบแบบเรียลไทม์
2. มีทีมและขั้นตอนรับมือเมื่อเกิดปัญหา
3. มีแผนถอยกลับถ้าการอัปเดตมีปัญหา
4. แจ้งผู้ใช้เมื่อระบบช้าหรือต้องรอ

## ดูแลต่อหลังเปิดใช้

ระบบองค์กรใช้กันหลายปี ต้องมีเอกสาร มีการสำรองข้อมูลที่เคยลองกู้คืนจริงแล้ว และมีทีมที่ดูแลต่อได้

## เราช่วยอะไรได้บ้าง

เราพัฒนาเว็บแอป ระบบหลังบ้าน และระบบองค์กร ดูรายละเอียดที่หน้า [เว็บไซต์และซอฟต์แวร์](/services/website-software/) และผลงานที่หน้า [ผลงาน](/work/)`,
      faq: [
        { q: "ควรทำ load test เมื่อไร", a: "ก่อนเปิดใช้งานจริง ก่อนช่วงที่คาดว่าคนจะเข้ามาเยอะ และหลังเปลี่ยนแปลงส่วนสำคัญของระบบ" },
        { q: "ระบบเดิมที่ช้าต้องทำใหม่ทั้งหมดไหม", a: "ไม่เสมอไป ควรวัดหาจุดคอขวดก่อน หลายครั้งแก้เฉพาะส่วนที่มีปัญหาก็เร็วขึ้นมาก" },
      ],
    },
    en: {
      title: "Building Systems for Many Users at Once: What to Plan Before Development Starts",
      description:
        "What our team plans every time a web app or enterprise system has to serve many users at once: peak forecasting, load testing, security and long-term care.",
      keywords: ["high concurrency systems", "enterprise web application development", "load testing planning", "scalable web app", "software development Thailand"],
      imageAlt: "A vast grid of white glass panels with a line of gold light running through it",
      category: "Software",
      body: `A system that runs well with a handful of users can fail the moment everyone arrives together: the first minute of registration, the start of a sale, the morning of an event.

Our team built Thammasat University's course registration system, which serves tens of thousands of students at once during enrollment and still runs today at reg.tu.ac.th. This is what we plan every time on work like that.

## Know your peak before you design

Ask how many people will be active at the worst moment, when that happens and what they will be doing. A daily average won't show you the real risk.

## Design the parts that take the load

- Separate the pages people read often from the steps that write data
- Cache information that rarely changes
- Queue work that doesn't need an instant answer
- Guard against double submissions and double booking
- When load gets too high, switch off some features for a while so the core keeps working

## Test with real scenarios

Run load tests based on how people really behave, such as everyone pressing the same button in the first minute, and see what slows down first.

## Security and personal data

Give access by role, encrypt sensitive data, log activity and keep only the data you need under the privacy law that applies.

## Go-live day

1. Watch the system in real time
2. Have a team and a procedure ready for problems
3. Have a rollback plan if an update goes wrong
4. Tell users when things are slow or they need to wait

## Looking after it after launch

Enterprise systems run for years. They need documentation, backups that have actually been restored in a test, and a team that can maintain them.

## How we can help

We build web apps, back offices and enterprise systems. See [Websites & Software](/en/services/website-software/) and our [selected work](/en/work/).`,
      faq: [
        { q: "When should load testing happen?", a: "Before launch, before an expected peak and after any major change to the system." },
        { q: "Does a slow system need a full rebuild?", a: "Not always. Measure the bottlenecks first. Often fixing only the problem areas makes it much faster." },
      ],
    },
  },
];
