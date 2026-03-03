const { createClient } = require('@supabase/supabase-js')

const OLD_PROJECT_URL = 'https://qpfklgguirkaesncwtfz.supabase.co'
const NEW_PROJECT_URL = 'https://kbzrdsxzzqzbxqgwpsuq.supabase.co'
const NEW_PROJECT_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtienJkc3h6enF6YnhxZ3dwc3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE1NDQyNywiZXhwIjoyMDg3NzMwNDI3fQ.DPULK10fmFBdhuoopiiN1jUTUdv1jQGwfTIRlLGuKP8'

// Objects to migrate (from source storage.objects table)
const oldObjects = [
  { bucket_id: 'project-photos', name: 'attendance/782ad162-d204-480e-8e82-4bd6a969b9a7/1770536258069-tndtyj.png', metadata: { mimetype: 'image/png', cacheControl: 'max-age=3600' } },
  { bucket_id: 'project-photos', name: 'attendance/782ad162-d204-480e-8e82-4bd6a969b9a7/1770545662450-44g5cg.png', metadata: { mimetype: 'image/png', cacheControl: 'max-age=3600' } },
  { bucket_id: 'project-photos', name: 'attendance/782ad162-d204-480e-8e82-4bd6a969b9a7/1770545668547-ss7l0z.png', metadata: { mimetype: 'image/png', cacheControl: 'max-age=3600' } },
  { bucket_id: 'project-photos', name: 'attendance/782ad162-d204-480e-8e82-4bd6a969b9a7/1770545676313-zeqhjt.png', metadata: { mimetype: 'image/png', cacheControl: 'max-age=3600' } },
  { bucket_id: 'project-photos', name: 'attendance/782ad162-d204-480e-8e82-4bd6a969b9a7/1770545746274-kgbe82.png', metadata: { mimetype: 'image/png', cacheControl: 'max-age=3600' } },
  { bucket_id: 'project-photos', name: 'attendance/782ad162-d204-480e-8e82-4bd6a969b9a7/1770545756867-h8hulx.png', metadata: { mimetype: 'image/png', cacheControl: 'max-age=3600' } },
  { bucket_id: 'project-photos', name: 'attendance/782ad162-d204-480e-8e82-4bd6a969b9a7/1770545890334-jklxf7.png', metadata: { mimetype: 'image/png', cacheControl: 'max-age=3600' } },
  { bucket_id: 'project-photos', name: 'attendance/782ad162-d204-480e-8e82-4bd6a969b9a7/1770545957822-z7w82f.png', metadata: { mimetype: 'image/png', cacheControl: 'max-age=3600' } },
  { bucket_id: 'project-photos', name: 'attendance/782ad162-d204-480e-8e82-4bd6a969b9a7/1770547658408-rudvlr.png', metadata: { mimetype: 'image/png', cacheControl: 'max-age=3600' } },
  { bucket_id: 'project-photos', name: 'attendance/782ad162-d204-480e-8e82-4bd6a969b9a7/1770547664086-l7ura4.png', metadata: { mimetype: 'image/png', cacheControl: 'max-age=3600' } },
  { bucket_id: 'project-photos', name: 'attendance/782ad162-d204-480e-8e82-4bd6a969b9a7/1770548188168-5rk7w4.png', metadata: { mimetype: 'image/png', cacheControl: 'max-age=3600' } },
  { bucket_id: 'project-photos', name: 'attendance/782ad162-d204-480e-8e82-4bd6a969b9a7/1770557645143-1gwdzw.png', metadata: { mimetype: 'image/png', cacheControl: 'max-age=3600' } },
  { bucket_id: 'project-photos', name: 'attendance/782ad162-d204-480e-8e82-4bd6a969b9a7/1770557915356-mrf953.png', metadata: { mimetype: 'image/png', cacheControl: 'max-age=3600' } },
  { bucket_id: 'project-photos', name: 'attendance/782ad162-d204-480e-8e82-4bd6a969b9a7/1770558123644-zkplbi.png', metadata: { mimetype: 'image/png', cacheControl: 'max-age=3600' } },
  { bucket_id: 'project-photos', name: 'attendance/782ad162-d204-480e-8e82-4bd6a969b9a7/1770712076052-zzaqw0.png', metadata: { mimetype: 'image/png', cacheControl: 'max-age=3600' } },
  { bucket_id: 'project-photos', name: 'attendance/782ad162-d204-480e-8e82-4bd6a969b9a7/1770712524315-7ezwqy.png', metadata: { mimetype: 'image/png', cacheControl: 'max-age=3600' } },
  { bucket_id: 'project-photos', name: 'attendance/782ad162-d204-480e-8e82-4bd6a969b9a7/1770713404629-hh88cr.png', metadata: { mimetype: 'image/png', cacheControl: 'max-age=3600' } },
  { bucket_id: 'project-photos', name: 'attendance/782ad162-d204-480e-8e82-4bd6a969b9a7/1770714848051-2piah1.png', metadata: { mimetype: 'image/png', cacheControl: 'max-age=3600' } },
]

;(async () => {
  const newSupabaseClient = createClient(NEW_PROJECT_URL, NEW_PROJECT_SERVICE_KEY)

  console.log(`Found ${oldObjects.length} objects to migrate`)

  let successCount = 0
  let errorCount = 0

  for (const objectData of oldObjects) {
    console.log(`Moving ${objectData.name}...`)
    try {
      // Download from public URL
      const publicUrl = `${OLD_PROJECT_URL}/storage/v1/object/public/${objectData.bucket_id}/${objectData.name}`
      const response = await fetch(publicUrl)
      if (!response.ok) throw new Error(`Failed to download: ${response.status}`)
      const data = await response.blob()

      const { error: uploadObjectError } = await newSupabaseClient.storage
        .from(objectData.bucket_id)
        .upload(objectData.name, data, {
          upsert: true,
          contentType: objectData.metadata?.mimetype || 'application/octet-stream',
          cacheControl: objectData.metadata?.cacheControl || 'max-age=3600',
        })
      if (uploadObjectError) throw uploadObjectError

      successCount++
      console.log(`  Success: ${objectData.name}`)
    } catch (err) {
      errorCount++
      console.log(`  Error moving ${objectData.name}:`, err.message)
    }
  }

  console.log('\n=== Migration Complete ===')
  console.log(`Successfully migrated: ${successCount}`)
  console.log(`Failed: ${errorCount}`)
})()
