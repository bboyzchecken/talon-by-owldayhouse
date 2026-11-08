import type * as React from 'react';
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'key' | 'line'; size?: 'sm' | 'md'; asChild?: boolean }
export interface CapabilityTagProps { kind: 'ai' | 'partner' | 'live' | 'sample' | 'closed' }
export interface OwlLogoProps extends Omit<React.SVGProps<SVGSVGElement>, 'height' | 'width'> { height?: number }
export interface SectionHeadingProps { label: string; title: React.ReactNode; as?: 'h1' | 'h2' | 'h3' }
export interface EyeHeroProps { lines: string[]; chips: [string, string]; eyeImage: string; subtitle: string; lead: string; actions: React.ReactNode; reveal: React.ReactNode }
export interface StatementFillProps { segments: string[]; emphasis: string }
export interface Act { word: string; description: string; services: string[]; image: string }
export interface ThreeActsProps { acts: [Act, Act, Act] }
export interface SiteHeaderProps { links: { href: string; label: string }[]; acts: Act[]; contactHref: string }
export interface ServiceIndexProps { items: { title: string; pillar: string; image: string; capability: 'ai' | 'partner'; href: string }[] }
export interface WorkEditorialProps { items: { title: string; category: string; image: string; url?: string; status?: 'live' | 'closed' }[] }
export interface NewsListProps { tabs: { id: string; label: string }[]; items: { tab: string; category: string; title: string; href: string; date?: string }[] }
export interface ToolRowProps { name: string; description: string; tags: CapabilityTagProps['kind'][]; href: string }
export interface StatRowProps { items: { label: string; value?: string; pending?: boolean }[] }
export interface LogoMarqueeProps { names: string[] }
export interface ContactCloseProps { title: string; body: string; messenger: string; phone: string; socials: { href: string; label: string }[] }
export interface TouchDemoProps { children?: React.ReactNode }
export interface ReportCardProps { title: string; segments: { label: string; value: number; tone: 'positive' | 'neutral' | 'negative' }[]; source: string; sample?: boolean }
