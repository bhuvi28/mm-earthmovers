import React from 'react'

interface ProductPlaceholderImageProps {
  category?: string
  title?: string
  partNumber?: string
  variant?: 'thumbnail' | 'card' | 'hero'
  className?: string
}

export default function ProductPlaceholderImage({
  category = 'loader',
  title,
  partNumber,
  variant = 'card',
  className = '',
}: ProductPlaceholderImageProps) {
  const isThumbnail = variant === 'thumbnail'
  const isHero = variant === 'hero'

  const catName = 
    category.toLowerCase().includes('grader') ? 'Motor Grader' :
    category.toLowerCase().includes('excavator') ? 'Excavator' :
    'Wheel Loader'

  // --- 1. Compact Thumbnail (Search Modal: 56px - 64px) ---
  if (isThumbnail) {
    return (
      <div 
        className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-slate-50 via-gray-100 to-slate-100 flex-shrink-0 overflow-hidden border border-slate-200/90 shadow-2xs flex flex-col items-center justify-center p-1 group-hover:scale-[1.02] transition-transform ${className}`}
        title="MM Earthmovers Genuine Spare Part"
      >
        {/* Crisp Isometric OEM Parts Box Icon */}
        <svg 
          viewBox="0 0 64 64" 
          className="w-8 h-8 sm:w-9 sm:h-9 drop-shadow-xs"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Ground Shadow */}
          <ellipse cx="32" cy="54" rx="20" ry="4" fill="#000000" fillOpacity="0.12" />

          {/* Isometric Box Top Face */}
          <polygon points="32,16 52,26 32,36 12,26" fill="#FDE68A" stroke="#D97706" strokeWidth="1" />
          {/* Amber Tape on Top */}
          <polygon points="32,16 38,19 26,33 20,30" fill="#D97706" fillOpacity="0.85" />

          {/* Left Face */}
          <polygon points="12,26 32,36 32,52 12,42" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
          {/* Barcode / Spec Label */}
          <rect x="16" y="32" width="10" height="6" rx="0.5" fill="#FFFFFF" fillOpacity="0.9" />
          <line x1="18" y1="34" x2="18" y2="36" stroke="#1E293B" strokeWidth="0.8" />
          <line x1="20" y1="34" x2="20" y2="36" stroke="#1E293B" strokeWidth="0.8" />
          <line x1="22" y1="34" x2="22" y2="36" stroke="#1E293B" strokeWidth="0.8" />
          <line x1="24" y1="34" x2="24" y2="36" stroke="#1E293B" strokeWidth="0.8" />

          {/* Right Face (Shadowed) */}
          <polygon points="32,36 52,26 52,42 32,52" fill="#D97706" stroke="#B45309" strokeWidth="1" />
          {/* Tape running down right */}
          <polygon points="38,33 44,30 44,46 38,49" fill="#B45309" fillOpacity="0.85" />
        </svg>

        {/* OEM SPEC Badge */}
        <span className="text-[7.5px] font-bold tracking-wider text-slate-600 uppercase mt-0.5 leading-none">
          OEM Part
        </span>
      </div>
    )
  }

  // --- 2. Product Detail Page Hero (360px - 440px) ---
  if (isHero) {
    const whatsappPhotoUrl = `https://wa.me/+918334887009?text=${encodeURIComponent(
      `Hi MM Earthmovers, I am looking at "${title || 'this part'}" (Part #${partNumber || 'N/A'}). Could you please share real warehouse photos of this part?`
    )}`

    return (
      <div className={`relative w-full min-h-[380px] sm:min-h-[420px] flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-slate-50 via-gray-100 to-slate-100 border border-slate-200/90 p-6 sm:p-8 overflow-hidden shadow-inner ${className}`}>
        {/* Subtle Engineering Grid Background */}
        <div 
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Machinery Watermark in Corner */}
        <div className="absolute right-4 bottom-4 text-xs font-mono font-semibold text-slate-300 uppercase tracking-widest pointer-events-none select-none">
          MM EARTHMOVERS • {catName}
        </div>

        {/* 2.5D Isometric Sealed Shipping Box Illustration */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <svg 
            viewBox="0 0 120 120" 
            className="w-28 h-28 sm:w-36 sm:h-36 drop-shadow-md mb-4"
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Ground Shadow */}
            <ellipse cx="60" cy="104" rx="42" ry="8" fill="#000000" fillOpacity="0.12" />

            {/* Box Top Face */}
            <polygon points="60,28 100,48 60,68 20,48" fill="#FDE68A" stroke="#D97706" strokeWidth="1.5" />
            {/* Amber MM Sealing Tape on Top */}
            <polygon points="60,28 72,34 48,62 36,56" fill="#D97706" fillOpacity="0.88" />

            {/* Box Left Face */}
            <polygon points="20,48 60,68 60,98 20,78" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
            {/* Barcode & OEM Specification Sticker */}
            <rect x="28" y="58" width="22" height="14" rx="1.5" fill="#FFFFFF" fillOpacity="0.95" stroke="#CBD5E1" strokeWidth="0.5" />
            <text x="31" y="64" fill="#0F172A" fontSize="3" fontWeight="bold" fontFamily="monospace">GENUINE PART</text>
            <line x1="31" y1="67" x2="31" y2="70" stroke="#0F172A" strokeWidth="1.2" />
            <line x1="34" y1="67" x2="34" y2="70" stroke="#0F172A" strokeWidth="0.8" />
            <line x1="36" y1="67" x2="36" y2="70" stroke="#0F172A" strokeWidth="1.5" />
            <line x1="39" y1="67" x2="39" y2="70" stroke="#0F172A" strokeWidth="0.8" />
            <line x1="42" y1="67" x2="42" y2="70" stroke="#0F172A" strokeWidth="1.2" />
            <line x1="45" y1="67" x2="45" y2="70" stroke="#0F172A" strokeWidth="1" />

            {/* Box Right Face */}
            <polygon points="60,68 100,48 100,78 60,98" fill="#D97706" stroke="#B45309" strokeWidth="1.5" />
            {/* Tape running down front */}
            <polygon points="72,62 84,56 84,86 72,92" fill="#B45309" fillOpacity="0.85" />
            {/* MM Stamp on Right Face */}
            <circle cx="86" cy="72" r="5" fill="#FFFFFF" fillOpacity="0.25" />
            <text x="83.5" y="74" fill="#FFFFFF" fontSize="4.5" fontWeight="900" fontFamily="sans-serif">MM</text>
          </svg>

          {/* Genuine Spare Part Header */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100/80 border border-amber-300/80 rounded-full text-amber-800 font-semibold text-xs mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Genuine Specification Spare Part</span>
          </div>

          <h3 className="text-gray-900 font-bold text-lg sm:text-xl mb-1">
            Sealed OEM / Replacement Packaging
          </h3>
          <p className="text-gray-600 text-xs sm:text-sm max-w-sm mb-5 leading-relaxed">
            This part is stocked in sealed manufacturer packaging and verified against OEM specifications before dispatch.
          </p>

          {/* Commercial Conversion Action: Request Real Photos */}
          <a
            href={whatsappPhotoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 border border-emerald-300 font-medium text-xs sm:text-sm rounded-xl shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current text-[#25D366]" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span>Request Real Photos on WhatsApp</span>
          </a>
        </div>
      </div>
    )
  }

  // --- 3. Catalog Grid Card (/products: ~220px height) ---
  return (
    <div className={`relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-gray-100/90 to-slate-100 p-4 overflow-hidden group-hover:from-amber-50/40 group-hover:to-slate-100 transition-colors duration-300 ${className}`}>
      {/* Subtle Engineering Dot Grid */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`,
          backgroundSize: '16px 16px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center transform transition-transform duration-500 group-hover:-translate-y-1">
        {/* Isometric OEM Parts Box Vector */}
        <svg 
          viewBox="0 0 80 80" 
          className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-xs mb-2 transition-transform duration-500 group-hover:scale-105" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ground Shadow */}
          <ellipse cx="40" cy="68" rx="26" ry="5" fill="#000000" fillOpacity="0.10" />

          {/* Top Face */}
          <polygon points="40,18 66,31 40,44 14,31" fill="#FDE68A" stroke="#D97706" strokeWidth="1" />
          {/* Amber Tape */}
          <polygon points="40,18 48,22 32,40 24,36" fill="#D97706" fillOpacity="0.88" />

          {/* Left Face */}
          <polygon points="14,31 40,44 40,64 14,51" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
          {/* Barcode Sticker */}
          <rect x="19" y="38" width="14" height="9" rx="1" fill="#FFFFFF" fillOpacity="0.95" stroke="#CBD5E1" strokeWidth="0.5" />
          <line x1="22" y1="41" x2="22" y2="44" stroke="#0F172A" strokeWidth="1" />
          <line x1="24" y1="41" x2="24" y2="44" stroke="#0F172A" strokeWidth="0.6" />
          <line x1="26" y1="41" x2="26" y2="44" stroke="#0F172A" strokeWidth="1.2" />
          <line x1="28" y1="41" x2="28" y2="44" stroke="#0F172A" strokeWidth="0.6" />
          <line x1="30" y1="41" x2="30" y2="44" stroke="#0F172A" strokeWidth="1" />

          {/* Right Face */}
          <polygon points="40,44 66,31 66,51 40,64" fill="#D97706" stroke="#B45309" strokeWidth="1" />
          {/* Tape */}
          <polygon points="48,40 56,36 56,56 48,60" fill="#B45309" fillOpacity="0.85" />
        </svg>

        {/* Crisp OEM Tag */}
        <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-[10px] font-semibold tracking-wider uppercase mb-1">
          Genuine OEM Part
        </span>

        <span className="text-[11px] font-medium text-slate-500 leading-tight">
          Sealed &amp; Ready to Ship
        </span>
      </div>
    </div>
  )
}
