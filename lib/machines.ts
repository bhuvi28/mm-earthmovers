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
  alternateNames: string[];
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
    name: 'HM 2021 Series',
    fullName: 'HM 2021 Series Wheel Loader',
    category: 'Loader',
    categorySlug: 'loader',
    brandName: 'Hindustan Motors',
    classRating: '10-Tonne Class Wheel Loader',
    metaTitle: 'HM 2021, 2021D, 2021B, 2021E Loader Parts | MM Earthmovers',
    metaDescription: 'Buy replacement spare parts for HM 2021, 2021D, 2021B & 2021E wheel loaders. Transmission gears, friction discs, 2021D control manifolds, 2021B fans. MM Earthmovers Kolkata.',
    alternateNames: [
      'HM 2021 Wheel Loader Spare Parts',
      'HM 2021 Loader Parts',
      'HM 2021D Wheel Loader Parts',
      'HM 2021B Loader Parts',
      'HM 2021E Spare Parts',
      'HM2021 Loader Spare Parts',
      'HM-2021 Wheel Loader Spares',
      'HM2021D Loader Parts',
      'HM-2021D Pilot Hydraulic Loader Parts',
      'HM2021B Classic Wheel Loader Parts',
      'Hindustan Motors 2021 Loader Spares',
      'Hindustan Motors 2021D Wheel Loader',
      'Hindustan 2021 Payloader Parts',
      'HM 2021 Payloader Spare Parts',
      'AVTEC 2021 Wheel Loader Parts',
      'HM 2021 BS-II / BS-III Wheel Loader Spares',
      'HM 10-Tonne Class Wheel Loader Spares',
      'Hindustan Motors Wheel Loader Parts Kolkata',
    ],
    overview: 'The Hindustan Motors HM 2021 series (encompassing standard HM 2021, upgraded pilot-hydraulic HM 2021D, classic HM 2021B, and 2021E) represents India\'s most trusted 10-tonne class wheel loader family, heavily deployed across mining, quarrying, steel plants, and heavy material handling. MM Earthmovers maintains extensive ready stock of 90+ replacement parts in Kolkata, covering ZF and HM countershaft transmissions, Carraro drive axles, Husco hydraulic control spools, 2021D pilot manifolds, 2021B cooling fans, and sintered bronze brake friction discs with immediate dispatch across India and global export.',
    assemblies: [
      { title: 'Transmission & Converter (All 2021 Series)', desc: 'ZF 4WG-200 and HM countershaft transmission gears, bronze friction discs (P/N 23010122, 6775541), copper counter plates (P/N 23010871), 1st turbine assemblies, charging pumps (P/N 23011646), and propeller shafts.' },
      { title: 'HM 2021D Pilot Controls & Hydraulics', desc: 'Dedicated HM 2021D pilot control manifolds (P/N 4776407 / 477-6407), joystick controllers, pilot lever groups, Husco main control valve spools, and cylinder seal kits.' },
      { title: 'HM 2021B & 2021D Cooling & Engine', desc: 'Dedicated HM 2021B engine cooling fan assemblies (P/N 81050245), HM 2021D cooling fan groups (P/N 5806575), mufflers, silencers (P/N 5177975), and dual-stage air filtration elements.' },
      { title: 'Braking & Carraro Drive Axles', desc: 'Sintered bronze friction discs, steel counter-plates, brake cams, wheel cylinders, and inverted brake treadle valves.' },
    ],
    faqs: [
      {
        question: 'Where can I buy replacement spare parts for HM 2021, 2021D, 2021B, and 2021E in India?',
        answer: 'MM Earthmovers supplies premium quality replacement spare parts for the entire HM 2021 series (HM 2021, HM 2021D, HM 2021B, and 2021E) directly from our warehouse at 1 Metcalf Lane, Esplanade, Kolkata.',
      },
      {
        question: 'What parts are specific to the HM 2021D loader compared to the standard HM 2021?',
        answer: 'The HM 2021D introduces upgraded pilot hydraulic controls and specialized engine cooling packages. Dedicated 2021D parts in our Kolkata stock include control manifolds (P/N 4776407 / 477-6407), heavy-duty cooling fan groups (P/N 5806575), exhaust silencer mufflers (P/N 5177975), and dual-stage air cleaner elements, while sharing transmission clutch discs and gears with the standard 2021.',
      },
      {
        question: 'Do you stock older HM 2021B loader parts like engine cooling fan assemblies?',
        answer: 'Yes, MM Earthmovers maintains dedicated inventory for classic HM 2021B loaders, including hard-to-find engine cooling fan assemblies (P/N 81050245), Husco control spools, transmission charging pumps, and brake friction discs with immediate dispatch.',
      },
      {
        question: 'Are parts interchangeable between HM 2021, HM 2021D, HM 2021B, and HM 2021E loaders?',
        answer: 'Core drivetrain and hydraulic components (such as transmission gears, sintered bronze friction discs, copper counter plates, charging pumps, and brake friction discs) are 100% interchangeable across the HM 2021 family. However, pilot control manifolds, cooling fan blade diameters, and exhaust assemblies differ by letter variant (B, D, E). Contact us with your part number to verify exact fitment.',
      },
      {
        question: 'What are the most commonly replaced spare parts for HM 2021 series loaders?',
        answer: 'The highest-demand replacement items for the HM 2021 family include transmission friction discs (P/N 23010122, 6775541), copper counter plates (P/N 23010871), hydraulic charging pumps (P/N 23011646), 2021D pilot manifolds (P/N 4776407), 2021B cooling fans (P/N 81050245), Husco control spools, and cylinder seal kits.',
      },
      {
        question: 'Do you ship HM 2021 spare parts pan-India and globally?',
        answer: 'Yes, MM Earthmovers supplies and dispatches replacement spare parts for the HM 2021 series across India as well as to international destinations globally. Contact us on WhatsApp or call +91 8334887009 with your required part numbers and shipping location.',
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
    metaTitle: 'L&T 9020 Wheel Loader Spare Parts | MM Earthmovers',
    metaDescription: 'Buy replacement spare parts for L&T 9020 wheel loaders. Charging pumps, friction discs, joystick valves & prop shafts. MM Earthmovers Kolkata.',
    alternateNames: [
      'L&T 9020 Wheel Loader Spare Parts',
      'LT 9020 Wheel Loader Parts',
      'L&T 9020 Loader Spare Parts',
      'L&T 9020 Loader Parts',
      'LT 9020 Parts',
      'LT9020 Loader Spare Parts',
      'LT-9020 Wheel Loader Spares',
      'L and T 9020 Loader Spares',
      'Larsen & Toubro 9020 Loader Spares',
      'Larsen and Toubro 9020 Wheel Loader',
      'L&T 9020 Payloader Spare Parts',
      'LT 9020 Payloader Parts India',
      'L&T 9020 BS-III / BS-IV Wheel Loader',
      'L&T 9020 CEV-IV Loader Spares',
      'L&T 10-Tonne Heavy Wheel Loader Parts',
      'L&T 9020 Front End Loader Spares',
    ],
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
    name: 'BEML BG 605 / BG 511',
    fullName: 'BEML BG 605 & BG 511 Motor Graders',
    category: 'Motor Grader',
    categorySlug: 'grader',
    brandName: 'BEML Limited',
    classRating: 'Heavy Motor Grader (130-170 HP Class)',
    metaTitle: 'BEML BG 605 & BG 511 Motor Grader Parts | MM Earthmovers',
    metaDescription: 'Buy quality replacement spare parts for BEML BG 605 & BG 511 motor graders. Differential cages, knuckles, yokes & brake parts. MM Earthmovers Kolkata.',
    alternateNames: [
      'BEML BG 605 Motor Grader Spare Parts',
      'BEML BG 511 Motor Grader Parts',
      'BEML BG605 Grader Spare Parts',
      'BEML BG511 Road Grader Parts',
      'BEML Motor Grader Spare Parts',
      'BEML Grader Replacement Parts',
      'BEML BG605-1 Motor Grader Parts',
      'BEML BG 605A Road Grader Parts',
      'BEML BG-605 Heavy Motor Grader Spares',
      'BEML BG-511 Road Construction Grader',
      'Bharat Earth Movers Grader Spare Parts',
      'Bharat Earth Movers Limited BG 605',
      'BEML 145 HP Motor Grader Spares',
      'BEML 130 HP Road Grader Parts',
      'BEML Road Grader Spare Parts India',
      'BEML Patrol Grader Replacement Parts',
      'BEML Tandem Drive Motor Grader Spares',
      'BEML Heavy Earth Moving Grader Spares',
    ],
    overview: 'BEML BG 605 and BG 511 motor graders are the benchmark heavy earthmoving equipment utilized across Indian road construction, mining haul road grading, and infrastructure projects. MM Earthmovers stocks over 18 dedicated replacement parts in Kolkata, including differential cage assemblies (P/N 23A2211250), steering knuckles (P/N 451AX11321), tandem drive axles (P/N 451AX11346), knuckle arms, drive yokes (P/N 451AX11516), circle drive worm wheels, wheel cylinders, and master cylinders with ready pan-India and export dispatch.',
    assemblies: [
      { title: 'Tandem Drive & Differential', desc: 'Differential cage assemblies (P/N 23A2211250), tandem drive axles (P/N 451AX11346), yokes (P/N 451AX11516), shafts, and companion flanges.' },
      { title: 'Front Axle & Steering Linkage', desc: 'Steering knuckles (P/N 451AX11321), knuckle arms (P/N 451AX11387), ball joints, and sockets.' },
      { title: 'Braking System', desc: 'Complete brake assemblies, wheel cylinders (P/N 451FD03111), and master cylinders for BG 605 and BG 511 platforms.' },
      { title: 'Circle Drive & Blade Adjustment', desc: 'Circle drive worm gears (P/N 451WA12896), gear adjusters, circle guides, and worm wheels.' },
    ],
    faqs: [
      {
        question: 'Where can I buy BEML BG 605 and BG 511 motor grader parts in India?',
        answer: 'MM Earthmovers supplies replacement spare parts for both BEML BG 605 and BG 511 motor graders directly from our warehouse at 1 Metcalf Lane, Esplanade, Kolkata.',
      },
      {
        question: 'Are parts interchangeable between BEML BG 605 and BG 511 graders?',
        answer: 'Many core circle drive, tandem axle, and braking components (including yokes P/N 451AX11516, wheel cylinders, master cylinders, and worm wheels) are shared across both models. Front steering knuckles and differential cages have specific model fitments. Contact us with your part number to confirm exact fitment.',
      },
      {
        question: 'Do you stock BEML BG 605 steering knuckles and knuckle arms?',
        answer: 'Yes, MM Earthmovers stocks steering knuckles (P/N 451AX11321) and knuckle arms (P/N 451AX11387) for BEML motor graders with immediate dispatch.',
      },
      {
        question: 'Do you supply BEML BG 511 differential cages?',
        answer: 'Yes, we stock differential cage assemblies (P/N 23A2211250) for BEML BG 511 motor graders in Kolkata.',
      },
    ],
    matchProduct: (p) => brandMatches(p.brand, /BEML|BG\s*605|BG\s*511/i),
  },
  {
    slug: 'tata-twl-3036',
    name: 'TATA TWL 3036',
    fullName: 'TATA TWL 3036 Wheel Loader',
    category: 'Loader',
    categorySlug: 'loader',
    brandName: 'TATA Motors / TWL',
    classRating: 'Heavy Wheel Loader',
    metaTitle: 'TATA TWL 3036 Wheel Loader Parts | MM Earthmovers',
    metaDescription: 'Buy replacement spare parts for TATA TWL 3036 wheel loaders. ZF gear pumps, pins, seal kits, friction plates & filters. MM Earthmovers Kolkata.',
    alternateNames: [
      'TATA TWL 3036 Wheel Loader Spare Parts',
      'Tata 3036 Wheel Loader Parts',
      'TATA TWL 3036 Loader Spare Parts',
      'Tata TWL 3036 Loader Parts',
      'TWL 3036 Loader Spares',
      'TWL3036 Loader Spare Parts',
      'TWL-3036 Wheel Loader Spares',
      'Tata TWL3036 Heavy Loader Parts',
      'Tata Hitachi TWL 3036 Loader Spares',
      'Tata Motors TWL 3036 Wheel Loader',
      'Tata 3036 Payloader Spare Parts',
      'Tata TWL 3036 Payloader Parts India',
      'Tata 3.5 Tonne Payload Wheel Loader',
      'TATA Heavy Front End Loader Parts',
      'Tata TWL 3036 Loader Replacement Spares',
    ],
    overview: 'The TATA TWL 3036 is a robust heavy wheel loader used in industrial material handling, ports, and stone crushing plants. MM Earthmovers maintains ready stock of ZF gear pumps (P/N 0501211877, 0501214894), transmission friction plates, pivot pins, and hydraulic cylinder seal kits.',
    assemblies: [
      { title: 'Hydraulic Pumps', desc: 'ZF hydraulic gear pumps (P/N 0501211877 / 0501214894) and steering pumps.' },
      { title: 'Transmission & Clutches', desc: 'ZF transmission friction plates, steel discs, and torque converter parts.' },
      { title: 'Chassis & G.E.T.', desc: 'Bucket pivot pins, bushings, adaptors, and tooth points.' },
    ],
    faqs: [
      {
        question: 'Where can I buy ZF gear pumps for TATA TWL 3036 loaders?',
        answer: 'MM Earthmovers supplies ZF gear pumps (P/N 0501211877, 0501214894) for TATA TWL 3036 loaders directly from Kolkata with pan-India and global courier dispatch.',
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
    metaTitle: 'JCB 430Z & 430ZX Wheel Loader Parts | MM Earthmovers',
    metaDescription: 'Replacement spare parts for JCB 430Z & 430ZX wheel loaders. Voltage regulators, ZF pumps, seal kits & discs. MM Earthmovers Kolkata.',
    alternateNames: [
      'JCB 430Z Wheel Loader Spare Parts',
      'JCB 430ZX Wheel Loader Parts',
      'JCB 430Z Loader Spare Parts',
      'JCB 430ZX Loader Parts',
      'JCB 430 Loader Spares',
      'JCB430 Loader Spare Parts',
      'JCB430Z Wheel Loader Spares',
      'JCB430ZX Heavy Loader Parts',
      'JCB 430 ZX Plus Wheel Loader',
      'JCB 430Z BS-III / BS-IV Wheel Loader',
      'JCB India 430ZX Loader Spares',
      'JCB 430 Payloader Spare Parts',
      'JCB 430ZX Payloader Parts India',
      'JCB 3-Tonne Payload Wheel Loader Spares',
      'JCB Z-Bar Linkage Wheel Loader Parts',
    ],
    overview: 'The JCB 430Z and 430ZX wheel loaders are versatile workhorses across Indian ready-mix concrete plants, quarries, and infrastructure contracts. MM Earthmovers stocks essential JCB 430 parts including Delco-type voltage regulators (P/N 1116408), ZF transmission pumps, pivot pins, and hydraulic seal kits.',
    assemblies: [
      { title: 'Electrical & Regulators', desc: 'Heavy-duty 24V voltage regulators (P/N 1116408), alternator components, and starter motors.' },
      { title: 'Hydraulics & Transmission', desc: 'ZF charging pumps (P/N 0501211877), hydraulic seal kits, and transmission plates.' },
      { title: 'Wear Parts & Linkage', desc: 'Z-bar linkage pins, hardened steel bushings, and bucket tooth points.' },
    ],
    faqs: [
      {
        question: 'Do you supply voltage regulators for JCB 430ZX loaders?',
        answer: 'Yes, MM Earthmovers stocks replacement voltage regulators (P/N 1116408) for JCB 430Z, 430ZX, and 432ZX loaders.',
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
    metaTitle: 'JCB 432ZX Wheel Loader Spare Parts | MM Earthmovers',
    metaDescription: 'Replacement spare parts for JCB 432ZX wheel loaders. Voltage regulators, seal kits, pivot pins & wear plates. MM Earthmovers Kolkata.',
    alternateNames: [
      'JCB 432ZX Wheel Loader Spare Parts',
      'JCB 432 Wheel Loader Parts',
      'JCB 432ZX Loader Spare Parts',
      'JCB 432 Loader Parts',
      'JCB 432 Loader Spares',
      'JCB432 Loader Spare Parts',
      'JCB432ZX Wheel Loader Spares',
      'JCB 432 ZX Plus Heavy Wheel Loader',
      'JCB 432ZX BS-IV CEV Loader Parts',
      'JCB 432ZX Payloader Spare Parts',
      'JCB 432 Heavy Payloader Spares India',
      'JCB 4WG Transmission Wheel Loader',
      'JCB 432 Front Shovel Loader Spares',
      'JCB High-Cycle Bulk Loading Machine Parts',
    ],
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
    name: 'LiuGong',
    fullName: 'LiuGong Wheel Loaders',
    category: 'Loader',
    categorySlug: 'loader',
    brandName: 'LiuGong',
    classRating: 'Chinese & Indian Joint Venture Loaders',
    metaTitle: 'LiuGong Wheel Loader Spare Parts | MM Earthmovers',
    metaDescription: 'Buy replacement spare parts for LiuGong wheel loaders. Cylinder seal kits, gear selectors, pins & tooth points. MM Earthmovers Kolkata.',
    alternateNames: [
      'LiuGong Wheel Loader Spare Parts',
      'LiuGong Wheel Loader Parts',
      'LiuGong Loader Spare Parts',
      'LiuGong Loader Parts',
      'LiuGong Loader Spares',
      'Liu Gong Loader Spare Parts',
      'Liugong Wheel Loader Spares India',
      'LiuGong CLG 835 Wheel Loader Parts',
      'LiuGong CLG835 Loader Spares',
      'LiuGong CLG 835H Loader Parts',
      'LiuGong CLG 836 Wheel Loader Spares',
      'LiuGong CLG 856 Heavy Wheel Loader',
      'LiuGong CLG856H Loader Spares',
      'LiuGong 816 Compact Wheel Loader',
      'LiuGong 835 BS-III / BS-IV Loader Spares',
      'LiuGong Payloader Spare Parts India',
      'Guangxi LiuGong Machinery Parts',
      'Chinese Wheel Loader Spare Parts LiuGong',
    ],
    overview: 'LiuGong wheel loaders are widely used in Indian quarrying, road projects, and coal yards. MM Earthmovers provides comprehensive replacement support for LiuGong components, including lift cylinder seal kits (P/N 81050506), tilt seal kits (P/N 81050531), steering seal kits (P/N 81050652), gear selectors (P/N 0501216205 / 46C0253), and bucket tooth points.',
    assemblies: [
      { title: 'Cylinder Seal Kits', desc: 'Lift cylinder kits (81050506), tilt cylinder kits (81050531), and steering cylinder kits (81050652).' },
      { title: 'Transmission & Gear Controls', desc: 'ZF-type gear selectors (P/N 0501216205 / 46C0253 / 08C0091) and shift controllers.' },
      { title: 'G.E.T. & Linkage', desc: 'Heavy-duty bucket tooth points (P/N 81002799 / WL10300C2830) and pivot pins.' },
    ],
    faqs: [
      {
        question: 'Do you supply cylinder seal kits for LiuGong loaders?',
        answer: 'Yes, MM Earthmovers stocks lift, tilt, and steering seal kits (P/N 81050506, 81050531, 81050652) with ready availability in Kolkata.',
      },
      {
        question: 'Where can I find LiuGong gear selectors (46C0253)?',
        answer: 'We stock transmission gear selector assemblies (P/N 0501216205, 46C0253) for LiuGong wheel loaders with pan-India courier delivery.',
      },
    ],
    matchProduct: (p) => brandMatches(p.brand, /LIUGONG/i),
  },
    {
    slug: 'xcmg-sdlg',
    name: 'XCMG & SDLG',
    fullName: 'XCMG & SDLG Wheel Loaders',
    category: 'Loader',
    categorySlug: 'loader',
    brandName: 'XCMG / SDLG',
    classRating: 'Heavy Chinese Wheel Loaders (5-Tonne Payload)',
    metaTitle: 'XCMG & SDLG Wheel Loader Parts | MM Earthmovers',
    metaDescription: 'Buy replacement spare parts for XCMG & SDLG wheel loaders. Air brake boosters, gear selectors, pins & wear parts. MM Earthmovers Kolkata.',
    alternateNames: [
      'XCMG Wheel Loader Spare Parts',
      'SDLG Wheel Loader Spare Parts',
      'XCMG Loader Spare Parts',
      'SDLG Loader Spare Parts',
      'XCMG Wheel Loader Parts',
      'SDLG Wheel Loader Parts',
      'XCMG ZL50GN Wheel Loader Spare Parts',
      'XCMG ZL 50 GN Loader Parts',
      'XCMG ZL50G Heavy Wheel Loader',
      'XCMG LW300FN / LW500FN Loader Spares',
      'SDLG LG956 Wheel Loader Parts',
      'SDLG LG 956 Loader Spares',
      'SDLG LG956L Heavy Wheel Loader',
      'SDLG LG958L Wheel Loader Spares',
      'SDLG L956F / L958F Loader Parts',
      'XCMG & SDLG 5-Tonne Payloader Spares',
      'Shandong Lingong Construction Machinery Spares',
      'Xuzhou Construction Machinery Group Spares',
    ],
    overview: 'XCMG and SDLG wheel loaders (such as the ZL50GN and LG956 series) are widely deployed across aggregate crushing plants, ports, and bulk material handling sites throughout India. MM Earthmovers supplies essential replacement components in Kolkata, including air-over-hydraulic brake booster assemblies (P/N 13C0157), electronic gear selectors (P/N 0501216205 / 46C0253), sun gears, planetary carriers, pivot pins, and bucket wear hardware with express dispatch across India.',
    assemblies: [
      { title: 'Braking Systems', desc: 'Pneumatic-over-hydraulic brake booster units (P/N 13C0157), master cylinders, and caliper overhaul components.' },
      { title: 'Transmission & Gear Controls', desc: 'ZF-type electronic gear selectors (P/N 0501216205 / 46C0253), sun gears, bevel gears, planetary carrier assemblies, and ring gears.' },
      { title: 'Bucket, Pins & G.E.T.', desc: 'Heavy-duty pivot pin assemblies, bushings, and bucket tooth points.' },
    ],
    faqs: [
      {
        question: 'Do you supply air brake boosters for XCMG and SDLG loaders?',
        answer: 'Yes, MM Earthmovers maintains ready stock of air-over-hydraulic brake booster assemblies (P/N 13C0157) compatible with both XCMG ZL50GN and SDLG 956 loaders.',
      },
      {
        question: 'Where can I find gear selectors for XCMG and SDLG loaders in India?',
        answer: 'We stock transmission gear selector assemblies (P/N 0501216205, 46C0253) for XCMG and joint-venture loaders directly in Kolkata with express courier dispatch.',
      },
      {
        question: 'How to order XCMG & SDLG parts from MM Earthmovers?',
        answer: 'Send us your part number or a photo of your required component via WhatsApp at +91 8334887009 for an instant price quote and availability check.',
      },
    ],
    matchProduct: (p) => brandMatches(p.brand, /XCMG|S[DL]LG/i),
  },
  {
    slug: 'other-wheel-loaders',
    name: 'Other Wheel Loaders',
    fullName: 'Other Wheel Loaders',
    category: 'Loader',
    categorySlug: 'loader',
    brandName: 'Wheel Loaders',
    classRating: 'Multi-Make Wheel Loaders',
    metaTitle: 'Other Wheel Loader Spare Parts | MM Earthmovers',
    metaDescription: 'Source replacement spare parts for various wheel loader makes and models on direct inquiry. MM Earthmovers Kolkata.',
    alternateNames: [
      'Caterpillar / CAT Wheel Loader Spare Parts (924, 938, 950, 966)',
      'Komatsu Wheel Loader Spare Parts (WA 200, WA 320, WA 380, WA 470)',
      'Volvo Wheel Loader Parts (L90, L120, L150)',
      'Hyundai Wheel Loader Parts (HL 770, HL 780)',
      'BEML Wheel Loader Spares (BL 200, BL 30)',
      'CAT 950H / 950GC Wheel Loader Spares',
      'CAT 966H / 966D Heavy Loader Parts',
      'Komatsu WA 200-5 / WA 380-6 Loader Parts',
      'Komatsu WA 470 Heavy Payloader Spares',
      'Volvo L90F / L120F / L120G Loader Spares',
      'Hyundai HL 770-9 Wheel Loader Parts',
      'Doosan / DISD SD 200 / SD 300 Loader Spares',
      'Kawasaki 80Z / 85Z Wheel Loader Parts',
      'Terex TL Series Wheel Loader Spares',
      'Lonking CDM 856 Wheel Loader Parts',
      'Multi-Make Payloader Spare Parts India',
      'Front End Loader Replacement Components',
      'Mining & Quarry Wheel Loader Fleet Spares',
    ],
    overview: 'We maintain ready warehouse stock and supply replacement components for various wheel loader makes and models on direct inquiry. Reach out to us directly with your required part number or component photo for ready availability.',
    assemblies: [
      { title: 'Transmission & Torque Converters', desc: 'Friction plates, steel discs, torque converter parts, charging pumps, and planetary gears for various loader makes.' },
      { title: 'Hydraulic Pumps & Control Valves', desc: 'Main hydraulic gear pumps, steering pumps, pilot valves, and cylinder seal kits.' },
      { title: 'Ground Engaging Tools (G.E.T.)', desc: 'Bucket tooth points, adapters, side cutters, and cutting edges.' },
      { title: 'Axles & Braking Components', desc: 'Brake booster units, master cylinders, brake friction discs, and differential parts.' },
    ],
    faqs: [
      {
        question: 'Can MM Earthmovers supply parts for wheel loader makes not listed online?',
        answer: 'Yes, MM Earthmovers maintains extensive ready stock and sourcing for various wheel loader makes and models not listed in our online catalog. Reach out to us directly on WhatsApp or call +91 8334887009 with your required part number or component photo for pricing and availability.',
      },
      {
        question: 'How do I enquire about parts not listed in the online catalog?',
        answer: 'Simply send a message to us directly on WhatsApp at +91 8334887009 with your machine make, model, part number, or a photo of the required part, and our team will confirm availability and price.',
      },
    ],
    matchProduct: () => false,
  },
  {
    slug: 'excavators',
    name: 'Hydraulic Excavators',
    fullName: 'Hydraulic Excavators',
    category: 'Excavator',
    categorySlug: 'excavator',
    brandName: 'Excavators',
    classRating: 'Tracked & Wheeled Hydraulic Excavators',
    metaTitle: 'Hydraulic Excavator Spare Parts | MM Earthmovers',
    metaDescription: 'Source replacement spare parts for Tata Hitachi, Komatsu, JCB, Hyundai, Volvo, and Kobelco excavators on inquiry. MM Earthmovers Kolkata.',
    alternateNames: [
      'Komatsu Excavator Spare Parts (PC 71, PC 130, PC 200, PC 210, PC 300)',
      'Caterpillar / CAT Excavator Spare Parts (320, 323, 336)',
      'Tata Hitachi Excavator Spare Parts (EX 70, EX 110, EX 200, EX 210, ZAXIS)',
      'JCB Excavator Spare Parts (JS 81, JS 140, JS 205)',
      'Hyundai Excavator Spare Parts (Robex R210, R215, R220)',
      'Tata Hitachi EX 200 / EX 210 Poclain Spares',
      'Tata Hitachi ZAXIS 200 / 210 / 220 / 330 Parts',
      'Tata Hitachi EX 70 / EX 110 Mini & Midi Excavator Spares',
      'Komatsu PC 200-6 / PC 200-8 / PC 210-10 Spares',
      'Komatsu PC 71 / PC 130 Utility Excavator Parts',
      'CAT 320D / 320D2 / 320GC Hydraulic Excavator Parts',
      'JCB JS 205 / JS 215 / NXT 205 Tracked Excavator Spares',
      'Hyundai Robex R 210-7 / R 215-9 Excavator Parts',
      'Volvo EC 210B / EC 210D / EC 240B Excavator Parts',
      'Kobelco SK 210 / SK 350 / SK 380 Excavator Parts',
      'Sany SY 215C / SY 220C Hydraulic Excavator Spares',
      'Tracked Excavator Replacement Spares India',
      'Crawler Excavator Spare Parts Kolkata',
      'Chain Poclain Machine Spare Parts India',
      '20-Ton Class Mining Excavator Replacement Spares',
    ],
    overview: 'MM Earthmovers supplies specialized hydraulic, undercarriage, and mechanical replacement spare parts for leading tracked and wheeled excavator models in India, including Tata Hitachi, Komatsu, JCB, Hyundai, and Volvo. Reach out directly for ready quotes.',
    assemblies: [
      { title: 'Hydraulic Pumps & Motors', desc: 'Main hydraulic pumps (Kawasaki K3V/K5V), swing motors, travel motors, and control valves.' },
      { title: 'Undercarriage Parts', desc: 'Track chains, track rollers, carrier rollers, front idlers, sprockets, and track shoes.' },
      { title: 'Pins, Bushings & Buckets', desc: 'Hardened bucket pins, bushings, bucket links, rock teeth, and adapters.' },
      { title: 'Cylinder Seal Kits', desc: 'Boom, arm, and bucket hydraulic cylinder seal kits.' },
    ],
    faqs: [
      {
        question: 'Do you supply spare parts for Tata Hitachi, Komatsu, and JCB excavators?',
        answer: 'Yes, we supply replacement parts for prominent excavator models including Tata Hitachi (EX 70/110/200/210, ZAXIS), Komatsu (PC 71/130/200/210/300), JCB (JS 81/140/205), Hyundai (Robex R210/R215), Volvo (EC 210/240), Kobelco, and Sany.',
      },
      {
        question: 'How can I get an excavator part quote from MM Earthmovers?',
        answer: 'Send your required part number, machine serial number, or photo of the part to +91 8334887009 on WhatsApp for rapid quotation and shipping estimates across India.',
      },
    ],
    matchProduct: () => false,
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
