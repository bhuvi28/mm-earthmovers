import { Product } from './products';
import { getProductUrlSlug } from './utils';

export interface MachineModel {
  slug: string;
  name: string;
  fullName: string;
  category: 'Loader' | 'Motor Grader' | 'Excavator';
  categorySlug: 'loader' | 'grader' | 'excavator';
  brandName: string;
  classRating: string;
  metaTitle: string;
  metaDescription: string;
  overview: string;
  assemblies: { title: string; desc: string }[];
  faqs: { question: string; answer: string }[];
  matchProduct: (product: Product) => boolean;
}

function brandMatches(brand: string | string[] | undefined, regex: RegExp): boolean {
  if (!brand) return false;
  if (Array.isArray(brand)) {
    return brand.some(b => regex.test(String(b)));
  }
  return regex.test(String(brand));
}

export const MACHINE_MODELS: MachineModel[] = [
  {
    slug: 'hm-2021',
    name: 'HM 2021 Series (2021 / 2021D / 2021B)',
    fullName: 'HM 2021 / 2021D / 2021B Wheel Loader',
    category: 'Loader',
    categorySlug: 'loader',
    brandName: 'Hindustan Motors / AVTEC',
    classRating: '10-Tonne Class Wheel Loader',
    metaTitle: 'HM 2021 / 2021D Loader Spare Parts | MM Earthmovers',
    metaDescription: 'Buy replacement spare parts for HM 2021, 2021D & 2021B wheel loaders. Transmission gears, friction discs, hydraulic manifolds & valves. MM Earthmovers Kolkata.',
    overview: 'The HM 2021 series (HM 2021, HM 2021D, HM 2021B, and 2021E) is India\'s most trusted 10-tonne class wheel loader family, heavily deployed across mining, quarrying, steel plants, and bulk material handling. MM Earthmovers maintains extensive ready stock of over 90 replacement parts in Kolkata, covering ZF and HM countershaft transmissions, Carraro drive axles, Husco hydraulic control spools, pilot manifolds, and brake friction discs with immediate dispatch across India and global export.',
    assemblies: [
      { title: 'Transmission & Converter', desc: 'ZF 4WG-200 and HM countershaft transmission gears, bronze friction discs, copper counter plates, 1st turbine assemblies, charging pumps, and propeller shafts.' },
      { title: 'Hydraulics & Pilot Controls', desc: 'Husco main control valve spools, 2021D pilot control manifolds (P/N 4776407), joystick assemblies, orbital steering valves, and cylinder seal kits.' },
      { title: 'Braking System', desc: 'Sintered bronze friction discs, steel counter-plates, brake cams, wheel cylinders, and inverted brake treadle valves.' },
      { title: 'Engine & Filtration', desc: 'Ashok Leyland / HM engine filtration kits (air, oil, hydraulic), heavy-duty cooling fan groups (P/N 5806575, 81050245), silencers, and exhaust mufflers.' },
    ],
    faqs: [
      {
        question: 'Where can I buy genuine replacement spare parts for HM 2021, 2021D, and 2021B in India?',
        answer: 'MM Earthmovers supplies premium quality replacement spare parts for the entire HM 2021 series directly from our warehouse at 1 Metcalf Lane, Esplanade, Kolkata. We offer ready stock of 90+ parts, competitive pricing, and express dispatch to mining belts across Odisha, Jharkhand, West Bengal, and pan-India.',
      },
      {
        question: 'What are the most commonly replaced spare parts for HM 2021 loaders?',
        answer: 'The highest-demand replacement items for the HM 2021 series include transmission friction discs (P/N 23010122, 6775541), copper counter plates (P/N 23010871), hydraulic charging pumps (P/N 23011646), Husco control spools, 2021D pilot manifolds (P/N 4776407), and cylinder seal kits.',
      },
      {
        question: 'Are parts for HM 2021, HM 2021D, and HM 2021B interchangeable?',
        answer: 'Most core drivetrain and hydraulic components (such as transmission discs, gears, and charging pumps) are fully interchangeable across the HM 2021 family. However, certain pilot manifolds, cooling fan configurations, and engine accessories vary by letter variant (B, D, E). Contact us with your part number to confirm exact fitment.',
      },
      {
        question: 'Do you supply HM 2021 parts to mining sites across Odisha and Jharkhand?',
        answer: 'Yes, we regularly supply mining contractors, crusher owners, and fleet operators across Barbil, Joda, Keonjhar, Dhanbad, and Ranchi with same-day or next-day road transport dispatch from Kolkata.',
      },
    ],
    matchProduct: (p) => brandMatches(p.brand, /HM\s*2021/i),
  },
  {
    slug: 'lt-9020',
    name: 'L&T 9020',
    fullName: 'L&T 9020 Wheel Loader',
    category: 'Loader',
    categorySlug: 'loader',
    brandName: 'Larsen & Toubro',
    classRating: '10-Tonne Class Wheel Loader',
    metaTitle: 'L&T 9020 Loader Spare Parts | MM Earthmovers',
    metaDescription: 'Buy replacement spare parts for L&T 9020 wheel loaders. Charging pumps, friction discs, joystick valves & prop shafts. MM Earthmovers Kolkata.',
    overview: 'The L&T 9020 is a premier 10-tonne class wheel loader engineered by Larsen & Toubro for high-productivity material loading. MM Earthmovers supplies an extensive inventory of replacement L&T 9020 components, including charging pumps, friction plates, copper discs, joystick hydraulic valves, front/rear propeller shafts, and transmission drive gears.',
    assemblies: [
      { title: 'Transmission & Drivetrain', desc: 'Charging pumps (P/N 23011646 / A0010193), friction discs, copper plates, gear drives, and front/rear propeller shafts.' },
      { title: 'Hydraulic & Joystick Controls', desc: 'Hydraulic joystick valves (P/N WL10650C1851), torque converter pumps, and cylinder seal kits.' },
      { title: 'Axles & Differentials', desc: 'Wheel spindles, tooth points, spider gears, and differential drive components.' },
      { title: 'Braking & Steering', desc: 'Brake booster assemblies, master cylinders, and steering orbital units.' },
    ],
    faqs: [
      {
        question: 'Where can I buy L&T 9020 wheel loader spare parts in Kolkata?',
        answer: 'MM Earthmovers is a leading supplier of L&T 9020 spare parts located in Esplanade, Kolkata. We stock transmission discs, charging pumps, joystick valves, and propeller shafts with ready delivery.',
      },
      {
        question: 'Are L&T 9020 transmission discs compatible with HM 2021?',
        answer: 'Yes, both the L&T 9020 and HM 2021 share compatible transmission friction discs (P/N 23010122) and copper plates (P/N 23010871). Our specialists can verify exact tooth count and dimensions.',
      },
      {
        question: 'Do you supply L&T 9020 joystick control valves?',
        answer: 'Yes, we stock L&T 9020 joystick control valves (P/N WL10650C1851) along with replacement seal kits and spool assemblies.',
      },
    ],
    matchProduct: (p) => brandMatches(p.brand, /L&T\s*9020/i),
  },
  {
    slug: 'beml-bg605',
    name: 'BEML BG 605',
    fullName: 'BEML BG 605 Motor Grader',
    category: 'Motor Grader',
    categorySlug: 'grader',
    brandName: 'BEML',
    classRating: 'Heavy Motor Grader (Road Construction)',
    metaTitle: 'BEML BG 605 Grader Spare Parts | MM Earthmovers',
    metaDescription: 'Buy replacement spare parts for BEML BG 605 motor graders. Knuckles, axles, ball joints, brake assemblies & cylinders. MM Earthmovers Kolkata.',
    overview: 'The BEML BG 605 is the benchmark heavy motor grader utilized by Indian road builders, mining contractors, and government infrastructure projects. MM Earthmovers specializes in critical front-axle, steering, and braking components for the BG 605, including steering knuckles, stub axles, knuckle arms, ball joints, brake assemblies, and master cylinders.',
    assemblies: [
      { title: 'Front Axle & Steering Linkage', desc: 'Steering knuckles (P/N 451AX11321), stub axles (P/N 451AX11346), knuckle arms (P/N 451AX11387), and ball joints (P/N 451AX11743).' },
      { title: 'Drive & Circle Gearbox', desc: 'Worm wheels, gear adjusters (P/N 451FD12257), drive shafts, and circle guide shoes.' },
      { title: 'Braking System', desc: 'Complete brake assemblies, master cylinders (P/N 2328431510 / 451BR11891), and wheel cylinders.' },
      { title: 'Flanges & Hardware', desc: 'Companion flanges, sockets, yokes, and heavy-duty pivot pins.' },
    ],
    faqs: [
      {
        question: 'Where can I get front axle steering knuckles for BEML BG 605 motor graders?',
        answer: 'MM Earthmovers stocks genuine-specification steering knuckles (P/N 451AX11321), knuckle arms, and ball joints for BEML BG 605 graders with immediate shipping from Kolkata.',
      },
      {
        question: 'Do you supply BEML BG 605 brake master cylinders?',
        answer: 'Yes, we supply brake master cylinders (P/N 2328431510, 451BR11891) and complete wheel brake assemblies for BEML motor graders.',
      },
      {
        question: 'Do BEML BG 605 parts fit the BG 511 grader?',
        answer: 'Several components like companion sockets, yokes, and wheel cylinders are shared across the BEML BG 605/511 series. We verify your machine serial and part number before dispatch.',
      },
    ],
    matchProduct: (p) => brandMatches(p.brand, /BEML\s*BG\s*605/i),
  },
  {
    slug: 'beml-bg511',
    name: 'BEML BG 511',
    fullName: 'BEML BG 511 Motor Grader',
    category: 'Motor Grader',
    categorySlug: 'grader',
    brandName: 'BEML',
    classRating: 'Medium-Duty Motor Grader',
    metaTitle: 'BEML BG 511 Grader Spare Parts | MM Earthmovers',
    metaDescription: 'Replacement spare parts for BEML BG 511 motor graders. Differential cages, sockets, yokes & worm gears. MM Earthmovers Kolkata.',
    overview: 'The BEML BG 511 motor grader is widely operated for road maintenance, land grading, and secondary mining roads. MM Earthmovers stocks replacement differential cages (P/N 23A2211250), sockets, yokes, worm wheels, and wheel cylinders for the BG 511 platform.',
    assemblies: [
      { title: 'Differential & Drivetrain', desc: 'Differential cages (P/N 23A2211250), drive shafts, yokes, and sockets.' },
      { title: 'Blade Circle & Adjusters', desc: 'Worm gears (P/N 451WA12896), circle guides, and blade adjusters.' },
      { title: 'Hydraulics & Brakes', desc: 'Wheel cylinders (P/N 451FD03111), master cylinders, and brake plates.' },
    ],
    faqs: [
      {
        question: 'Do you supply BEML BG 511 differential cages?',
        answer: 'Yes, we stock differential cage assemblies (P/N 23A2211250) for BEML BG 511 motor graders in Kolkata.',
      },
      {
        question: 'Can you provide worm gears for BEML BG 511 circle drive?',
        answer: 'Yes, we supply circle drive worm wheels (P/N 451WA12896) and gear shafts for BEML motor graders.',
      },
    ],
    matchProduct: (p) => brandMatches(p.brand, /BEML\s*BG\s*511/i),
  },
  {
    slug: 'tata-twl-3036',
    name: 'TATA TWL 3036',
    fullName: 'TATA TWL 3036 Wheel Loader',
    category: 'Loader',
    categorySlug: 'loader',
    brandName: 'TATA Motors / TWL',
    classRating: 'Heavy Wheel Loader',
    metaTitle: 'TATA TWL 3036 Loader Spare Parts | MM Earthmovers',
    metaDescription: 'Buy replacement spare parts for TATA TWL 3036 loaders. ZF gear pumps, pins, seal kits, friction plates & filters. MM Earthmovers Kolkata.',
    overview: 'The TATA TWL 3036 is a robust heavy wheel loader used in industrial material handling, ports, and stone crushing plants. MM Earthmovers maintains ready stock of ZF gear pumps (P/N 0501211877, 0501214894), transmission friction plates, pivot pins, and hydraulic cylinder seal kits.',
    assemblies: [
      { title: 'Hydraulic Pumps', desc: 'ZF hydraulic gear pumps (P/N 0501211877 / 0501214894) and steering pumps.' },
      { title: 'Transmission & Clutches', desc: 'ZF transmission friction plates, steel discs, and torque converter parts.' },
      { title: 'Chassis & G.E.T.', desc: 'Bucket pivot pins, bushings, adaptors, and tooth points.' },
    ],
    faqs: [
      {
        question: 'Where can I buy ZF gear pumps for TATA TWL 3036 loaders?',
        answer: 'MM Earthmovers supplies ZF gear pumps (P/N 0501211877, 0501214894) for TATA TWL 3036 loaders directly from Kolkata with pan-India courier dispatch.',
      },
      {
        question: 'Do you supply complete cylinder seal kits for TATA TWL 3036?',
        answer: 'Yes, we stock boom, bucket, and steering cylinder seal kits matching OEM dimensions for TATA loaders.',
      },
    ],
    matchProduct: (p) => brandMatches(p.brand, /TATA\s*TWL\s*3036/i),
  },
  {
    slug: 'jcb-430z',
    name: 'JCB 430Z / 430ZX',
    fullName: 'JCB 430Z & 430ZX Wheel Loader',
    category: 'Loader',
    categorySlug: 'loader',
    brandName: 'JCB',
    classRating: 'Wheel Loader (3-Tonne Payload)',
    metaTitle: 'JCB 430Z & 430ZX Loader Spare Parts | MM Earthmovers',
    metaDescription: 'Replacement spare parts for JCB 430Z & 430ZX wheel loaders. Voltage regulators, ZF pumps, seal kits & discs. MM Earthmovers Kolkata.',
    overview: 'The JCB 430Z and 430ZX wheel loaders are versatile workhorses across Indian ready-mix concrete plants, quarries, and infrastructure contracts. MM Earthmovers stocks essential JCB 430 parts including Delco-type voltage regulators (P/N 1116408), ZF transmission pumps, pivot pins, and hydraulic seal kits.',
    assemblies: [
      { title: 'Electrical & Regulators', desc: 'Heavy-duty 24V voltage regulators (P/N 1116408), alternator components, and starter motors.' },
      { title: 'Hydraulics & Transmission', desc: 'ZF charging pumps (P/N 0501211877), hydraulic seal kits, and transmission plates.' },
      { title: 'Wear Parts & Linkage', desc: 'Z-bar linkage pins, hardened steel bushings, and bucket tooth points.' },
    ],
    faqs: [
      {
        question: 'Do you supply voltage regulators for JCB 430ZX loaders?',
        answer: 'Yes, MM Earthmovers stocks genuine-specification voltage regulators (P/N 1116408) for JCB 430Z, 430ZX, and 432ZX loaders.',
      },
      {
        question: 'Are JCB 430Z transmission parts available in Kolkata?',
        answer: 'Yes, we stock transmission pumps, friction discs, and hydraulic components for JCB wheel loaders at our Esplanade, Kolkata warehouse.',
      },
    ],
    matchProduct: (p) => brandMatches(p.brand, /JCB\s*430/i),
  },
  {
    slug: 'jcb-432zx',
    name: 'JCB 432ZX',
    fullName: 'JCB 432ZX Wheel Loader',
    category: 'Loader',
    categorySlug: 'loader',
    brandName: 'JCB',
    classRating: 'Heavy Wheel Loader',
    metaTitle: 'JCB 432ZX Loader Spare Parts | MM Earthmovers',
    metaDescription: 'Replacement spare parts for JCB 432ZX wheel loaders. Voltage regulators, seal kits, pivot pins & wear plates. MM Earthmovers Kolkata.',
    overview: 'The JCB 432ZX provides heavy payload capacity for high-cycle loading applications. MM Earthmovers supplies replacement electrical regulators, hydraulic seal kits, bucket pivot pins, and transmission components for JCB 432ZX fleets.',
    assemblies: [
      { title: 'Electrical Systems', desc: 'Voltage regulators (P/N 1116408) and electrical switchgear.' },
      { title: 'Hydraulic Cylinder Kits', desc: 'High-pressure lift, tilt, and steering cylinder seal kits.' },
      { title: 'Hardware & Bushings', desc: 'Hardened bucket pins, flanged bushings, and wear shims.' },
    ],
    faqs: [
      {
        question: 'Where can I get JCB 432ZX loader spare parts in India?',
        answer: 'MM Earthmovers supplies JCB 432ZX replacement components with express dispatch from Kolkata across India and global shipping.',
      },
    ],
    matchProduct: (p) => brandMatches(p.brand, /JCB\s*432/i),
  },
  {
    slug: 'liugong',
    name: 'LiuGong Loaders',
    fullName: 'LiuGong Wheel Loaders (81-Series)',
    category: 'Loader',
    categorySlug: 'loader',
    brandName: 'LiuGong',
    classRating: 'Chinese & Indian Joint Venture Loaders',
    metaTitle: 'LiuGong Loader Spare Parts (81-Series) | MM Earthmovers',
    metaDescription: 'Buy replacement spare parts for LiuGong loaders. 81-series seal kits, gear selectors, pins & tooth points. MM Earthmovers Kolkata.',
    overview: 'LiuGong wheel loaders are widely used in Indian quarrying, road projects, and coal yards. MM Earthmovers provides comprehensive aftermarket support for LiuGong 81-series components, including lift cylinder seal kits (P/N 81050506), tilt seal kits (P/N 81050531), steering seal kits (P/N 81050652), gear selectors (P/N 0501216205 / 46C0253), and bucket tooth points.',
    assemblies: [
      { title: '81-Series Cylinder Seal Kits', desc: 'Lift cylinder kits (81050506), tilt cylinder kits (81050531), and steering cylinder kits (81050652).' },
      { title: 'Transmission & Gear Controls', desc: 'ZF-type gear selectors (P/N 0501216205 / 46C0253 / 08C0091) and shift controllers.' },
      { title: 'G.E.T. & Linkage', desc: 'Heavy-duty bucket tooth points (P/N 81002799 / WL10300C2830) and pivot pins.' },
    ],
    faqs: [
      {
        question: 'Do you supply 81-series cylinder seal kits for LiuGong loaders?',
        answer: 'Yes, MM Earthmovers stocks 81-series lift, tilt, and steering seal kits (P/N 81050506, 81050531, 81050652) with ready availability in Kolkata.',
      },
      {
        question: 'Where can I find LiuGong gear selectors (46C0253)?',
        answer: 'We stock transmission gear selector assemblies (P/N 0501216205, 46C0253) for LiuGong wheel loaders with pan-India courier delivery.',
      },
    ],
    matchProduct: (p) => brandMatches(p.brand, /LIUGONG/i),
  },
  {
    slug: 'xcmg',
    name: 'XCMG Loaders',
    fullName: 'XCMG Wheel Loaders (ZL50GN)',
    category: 'Loader',
    categorySlug: 'loader',
    brandName: 'XCMG',
    classRating: 'Heavy Chinese Wheel Loaders (5-Tonne Payload)',
    metaTitle: 'XCMG Loader Spare Parts (ZL50GN) | MM Earthmovers',
    metaDescription: 'Replacement spare parts for XCMG wheel loaders. Gear selectors, brake boosters, pins & tooth points. MM Earthmovers Kolkata.',
    overview: 'XCMG wheel loaders (including the popular ZL50GN 5-tonne series) are common across infrastructure, mining, and port operations in India. MM Earthmovers supplies replacement transmission gear selectors (P/N 0501216205 / 46C0253), brake boosters (P/N 13C0157), bucket tooth points, and linkage pins.',
    assemblies: [
      { title: 'Transmission Control', desc: 'Electronic gear selectors (P/N 0501216205 / 46C0253) and transmission valves.' },
      { title: 'Braking System', desc: 'Pneumatic-over-hydraulic brake boosters (P/N 13C0157) and caliper overhaul kits.' },
      { title: 'Bucket & Wear Parts', desc: 'Bucket tooth points, pin assemblies, and hardened pivot bushings.' },
    ],
    faqs: [
      {
        question: 'Do you supply brake boosters for XCMG ZL50GN loaders?',
        answer: 'Yes, MM Earthmovers stocks air-over-hydraulic brake booster assemblies (P/N 13C0157) for XCMG and SDLG loaders.',
      },
      {
        question: 'How to order XCMG loader parts from MM Earthmovers?',
        answer: 'Send us your part number or a photo of your required component via WhatsApp at +91 8334887009 for an instant price quote and availability check.',
      },
    ],
    matchProduct: (p) => brandMatches(p.brand, /XCMG/i),
  },
  {
    slug: 'sdlg',
    name: 'SDLG Loaders',
    fullName: 'SDLG Wheel Loaders (956 Series)',
    category: 'Loader',
    categorySlug: 'loader',
    brandName: 'SDLG',
    classRating: 'Wheel Loader (5-Tonne Class)',
    metaTitle: 'SDLG Loader Spare Parts (956) | MM Earthmovers',
    metaDescription: 'Replacement spare parts for SDLG 956 wheel loaders. Brake boosters, tooth points, pins & seal kits. MM Earthmovers Kolkata.',
    overview: 'SDLG wheel loaders (such as the LG956 series) operate extensively across stone crushing and aggregate loading sites. MM Earthmovers stocks essential replacement parts including air-over-hydraulic brake boosters (P/N 13C0157), bucket tooth points, cylinder seal kits, and pivot pin assemblies.',
    assemblies: [
      { title: 'Brakes', desc: 'Brake booster units (P/N 13C0157), air brake valves, and master cylinders.' },
      { title: 'Hydraulics & Linkage', desc: 'Bucket tooth points, pins, and hydraulic cylinder seal packages.' },
    ],
    faqs: [
      {
        question: 'Do you stock brake booster part number 13C0157 for SDLG 956?',
        answer: 'Yes, MM Earthmovers maintains stock of part number 13C0157 brake booster in Kolkata with immediate dispatch.',
      },
    ],
    matchProduct: (p) => brandMatches(p.brand, /S[DL]LG/i),
  },
];

export function getMachineBySlug(slug: string): MachineModel | undefined {
  return MACHINE_MODELS.find(m => m.slug === slug);
}

export function getAllMachineSlugs(): string[] {
  return MACHINE_MODELS.map(m => m.slug);
}

export function getMachinesForProduct(brand?: string | string[]): MachineModel[] {
  if (!brand) return [];
  return MACHINE_MODELS.filter(m => m.matchProduct({ brand } as Product));
}
