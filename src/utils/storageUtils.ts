import { supabase } from '../lib/supabaseClient'

/**
 * Ensures that the required storage bucket exists, creates it if it doesn't
 */
export async function ensureStorageBucket(bucketName: string): Promise<boolean> {
  try {
    // First, check if the bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      return false
    }

    const bucketExists = buckets?.some(bucket => bucket.name === bucketName)
    
    if (bucketExists) {
      console.log(`✅ Bucket '${bucketName}' already exists`)
      return true
    }

    // Create the bucket if it doesn't exist
    console.log(`📦 Creating bucket '${bucketName}'...`)
    const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true, // Make bucket public so images can be accessed
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], // Restrict to image types
      fileSizeLimit: 5242880 // 5MB limit
    })

    if (createError) {
      console.error(`❌ Error creating bucket '${bucketName}':`, createError)
      return false
    }

    console.log(`✅ Successfully created bucket '${bucketName}'`)
    return true
  } catch (error) {
    console.error(`💥 Unexpected error ensuring bucket '${bucketName}':`, error)
    return false
  }
}

/**
 * Lists all available storage buckets for debugging
 */
export async function listStorageBuckets(): Promise<void> {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()
    
    if (error) {
      console.error('❌ Error listing buckets:', error)
      return
    }

    console.log('📦 Available storage buckets:')
    buckets?.forEach(bucket => {
      console.log(`  - ${bucket.name} (public: ${bucket.public})`)
    })
  } catch (error) {
    console.error('💥 Unexpected error listing buckets:', error)
  }
}
