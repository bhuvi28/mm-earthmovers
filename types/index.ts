export interface Service {
  id: string
  title: string
  description: string
  icon: string
  features?: string[]
}

export interface ContactFormData {
  name: string
  email: string
  phone: string
  message: string
}

export interface Project {
  id: string
  title: string
  description: string
  image: string
  category: string
  completedAt: Date
}

export interface Testimonial {
  id: string
  name: string
  company: string
  content: string
  rating: number
}
