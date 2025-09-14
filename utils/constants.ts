export const COMPANY_INFO = {
  name: 'MM Earthmovers',
  tagline: 'Professional Heavy Equipment & Construction Services',
  phone: '(555) 123-4567',
  email: 'info@mmearthmovers.com',
  address: {
    street: '123 Construction Way',
    city: 'Building City',
    state: 'BC',
    zip: '12345',
  },
  hours: {
    weekdays: '7:00 AM - 6:00 PM',
    saturday: '8:00 AM - 4:00 PM',
    sunday: 'Closed',
  },
} as const

export const SOCIAL_LINKS = {
  facebook: '#',
  linkedin: '#',
  instagram: '#',
} as const

export const NAVIGATION_LINKS = [
  { name: 'Services', href: '#services' },
  { name: 'About', href: '#about' },
  { name: 'Contact', href: '#contact' },
] as const
