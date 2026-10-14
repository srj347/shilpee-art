import mongoose from 'mongoose'
import { env } from './env'

// One connection per process, kept across hot reloads in development.
const g = globalThis as unknown as { __mongoose?: Promise<typeof mongoose> }

export function dbConnect(): Promise<typeof mongoose> {
  if (!g.__mongoose) {
    mongoose.set('strictQuery', true)
    g.__mongoose = mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 }).catch((err) => {
      g.__mongoose = undefined
      throw err
    })
  }
  return g.__mongoose
}
