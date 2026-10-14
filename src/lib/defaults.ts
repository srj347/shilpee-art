import type { Settings } from './types'

// Used until the artist saves her own settings in Studio.
export const DEFAULT_SETTINGS: Settings = {
  artistName: 'Shilpee Maitra',
  statement: 'Abstract paintings in acrylic and watercolour, made in my studio in Hyderabad.',
  about: '',
  cv: [],
  studioImages: [],
  contact: {
    email: '',
    whatsapp: '',
    instagram: '',
    replyPromise: 'within two working days',
  },
  notifyEmails: [],
  defaults: {
    certificateNote: 'Signed certificate of authenticity with the work’s reference number.',
    shipsFrom: 'Hyderabad, India',
    packaging: 'Wrapped in acid-free paper, corner guards and a wooden crate for large canvases.',
    leadTimeDays: 7,
    printLeadTimeDays: 10,
    printNote:
      'Archival pigment print, made to order in Hyderabad and signed by Shilpee. Ships rolled in a tube unless framed.',
  },
  printPresets: [
    {
      name: 'Paper, A-sizes',
      variants: [
        { label: 'A4 · 21 × 29.7 cm, cotton paper', heightCm: 29.7, widthCm: 21, material: 'paper', substrate: 'Cotton rag 308 gsm', finish: 'matte', framed: false, priceInr: 3500, active: true },
        { label: 'A3 · 29.7 × 42 cm, cotton paper', heightCm: 42, widthCm: 29.7, material: 'paper', substrate: 'Cotton rag 308 gsm', finish: 'matte', framed: false, priceInr: 5500, active: true },
        { label: 'A2 · 42 × 59.4 cm, cotton paper', heightCm: 59.4, widthCm: 42, material: 'paper', substrate: 'Cotton rag 308 gsm', finish: 'matte', framed: false, priceInr: 8500, active: true },
      ],
    },
    {
      name: 'Canvas, stretched',
      variants: [
        { label: '45 × 60 cm, stretched canvas', heightCm: 45, widthCm: 60, material: 'canvas', substrate: 'Cotton canvas 380 gsm', finish: 'satin', framed: false, priceInr: 9500, active: true },
        { label: '60 × 80 cm, stretched canvas', heightCm: 60, widthCm: 80, material: 'canvas', substrate: 'Cotton canvas 380 gsm', finish: 'satin', framed: false, priceInr: 14500, active: true },
      ],
    },
  ],
}
