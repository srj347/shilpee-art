import mongoose, { Schema, type Model, type SchemaDefinition, type SchemaOptions } from 'mongoose'

// Plain schema definitions keep type-checking fast; serialize.ts gives the real shapes.
function schema(def: Record<string, unknown>, opts?: SchemaOptions): Schema {
  return new Schema(def as SchemaDefinition, opts)
}

const ImageSchema = schema(
  {
    id: { type: String, required: true },
    role: { type: String, enum: ['main', 'view', 'detail', 'room', 'wip'], default: 'view' },
    alt: { type: String, default: '' },
    caption: String,
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    dominant: { type: String, default: '#EFEFEC' },
    lqip: { type: String, default: '' },
    onMount: { type: Boolean, default: false },
    isDigitalPreview: { type: Boolean, default: false },
  },
  { _id: false },
)

const VariantSchema = schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    heightCm: { type: Number, required: true },
    widthCm: { type: Number, required: true },
    material: { type: String, enum: ['paper', 'canvas'], required: true },
    substrate: { type: String, default: '' },
    finish: { type: String, enum: ['matte', 'satin'], default: 'matte' },
    framed: { type: Boolean, default: false },
    frameNote: String,
    priceInr: { type: Number, required: true, min: 0 },
    editionSize: Number,
    editionsSold: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { _id: false },
)

const ArtworkSchema = schema(
  {
    ref: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    isPublished: { type: Boolean, default: false },
    availability: { type: String, enum: ['available', 'reserved', 'sold', 'upcoming'], default: 'available' },
    year: { type: Number, required: true },
    medium: { type: String, default: '' },
    mediumTags: { type: [String], default: [] },
    support: { type: String, enum: ['canvas', 'paper', 'board'], default: 'canvas' },
    heightCm: { type: Number, required: true },
    widthCm: { type: Number, required: true },
    depthCm: Number,
    series: String,
    subjects: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    story: String,
    images: { type: [ImageSchema], default: [] },
    original: {
      forSale: { type: Boolean, default: true },
      price: {
        mode: { type: String, enum: ['fixed', 'on_request'], default: 'on_request' },
        amountInr: Number,
      },
      presentation: { type: String, enum: ['stretched', 'framed', 'rolled', 'unframed-paper'], default: 'stretched' },
      frameNote: String,
      readyToHang: { type: Boolean, default: true },
    },
    prints: {
      enabled: { type: Boolean, default: false },
      edition: { type: String, enum: ['open', 'limited'], default: 'open' },
      signed: { type: Boolean, default: true },
      variants: { type: [VariantSchema], default: [] },
    },
    certificate: {
      included: { type: Boolean, default: true },
      note: String,
    },
    shipping: {
      leadTimeDays: Number,
      packaging: String,
      international: Boolean,
    },
    upcoming: {
      expectedMonth: String,
      studioNote: String,
    },
    featured: { type: Boolean, default: false },
    isHero: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    seoDescription: String,
    publishedAt: Date,
    soldAt: Date,
    deletedAt: Date,
  },
  { timestamps: true },
)
ArtworkSchema.index({ isPublished: 1, availability: 1, sortOrder: 1 })
ArtworkSchema.index({ deletedAt: 1 })

const EnquirySchema = schema(
  {
    ref: { type: String, required: true, unique: true },
    type: { type: String, enum: ['original', 'print', 'commission', 'upcoming', 'general'], required: true },
    artwork: {
      id: String,
      ref: String,
      title: String,
      slug: String,
      availability: String,
      priceShown: String,
      thumbId: String,
    },
    print: { variantId: String, label: String, priceInr: Number },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    message: { type: String, default: '' },
    pageUrl: { type: String, default: '' },
    referrer: String,
    utmSource: String,
    status: { type: String, enum: ['new', 'replied', 'closed', 'spam'], default: 'new' },
    artistNote: String,
    mail: {
      toArtist: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
      toVisitor: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
      attempts: { type: Number, default: 0 },
      lastError: String,
    },
  },
  { timestamps: true },
)
EnquirySchema.index({ status: 1, createdAt: -1 })
EnquirySchema.index({ 'artwork.id': 1, type: 1 })

const SettingsSchema = schema(
  {
    key: { type: String, default: 'site', unique: true },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

const CounterSchema = schema({ _id: String, seq: { type: Number, default: 0 } })

const LoginTokenSchema = schema({
  email: { type: String, required: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  usedAt: Date,
})
LoginTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// A generic model<T>() helper makes tsc expand Mongoose's types until it runs out of memory,
// so models are typed loosely; serialize.ts gives the real shapes.
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyModel = Model<any>
function model(name: string, s: Schema): AnyModel {
  return (mongoose.models[name] as AnyModel) || mongoose.model(name, s)
}

export const ArtworkModel = model('Artwork', ArtworkSchema)
export const EnquiryModel = model('Enquiry', EnquirySchema)
export const SettingsModel = model('Settings', SettingsSchema)
export const CounterModel = model('Counter', CounterSchema)
export const LoginTokenModel = model('LoginToken', LoginTokenSchema)
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Next number in a named sequence, e.g. artwork refs per year. */
export async function nextSeq(name: string): Promise<number> {
  const doc = await CounterModel.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  ).lean()
  return (doc as { seq: number }).seq
}
