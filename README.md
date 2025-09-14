# MM Earthmovers

A modern, responsive website for MM Earthmovers - a heavy equipment and construction services company.

## Features

- **Modern Design**: Clean, professional design with Tailwind CSS
- **Responsive**: Mobile-first design that works on all devices
- **Fast Performance**: Built with Next.js 14 and optimized for speed
- **TypeScript**: Full TypeScript support for better development experience
- **SEO Optimized**: Proper meta tags and semantic HTML structure

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Icons**: Heroicons (SVG)
- **Fonts**: Inter (Google Fonts)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mm-earthmovers
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
mm-earthmovers/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── Header.tsx         # Navigation header
│   ├── Hero.tsx           # Hero section
│   ├── Services.tsx       # Services section
│   ├── About.tsx          # About section
│   ├── Contact.tsx        # Contact form
│   └── Footer.tsx         # Footer
├── public/                # Static assets
├── styles/                # Additional styles
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions
└── lib/                   # Library configurations
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Customization

### Colors
The color scheme can be customized in `tailwind.config.js`. The current theme uses:
- Primary: Blue tones
- Secondary: Gray tones

### Content
Update the content in the respective component files:
- `components/Hero.tsx` - Main headline and description
- `components/Services.tsx` - Services offered
- `components/About.tsx` - Company information
- `components/Contact.tsx` - Contact form and information

## Deployment

The project can be deployed to any platform that supports Next.js:

- **Vercel** (recommended)
- **Netlify**
- **AWS Amplify**
- **Railway**

## License

This project is private and proprietary to MM Earthmovers.
