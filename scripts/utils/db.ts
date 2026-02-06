/**
 * Database Connection Utility
 * Provides Supabase client connections for migration and seeding scripts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../database/types'
import { Logger } from './logger'

// Environment configuration
interface DatabaseConfig {
  supabaseUrl: string
  supabaseServiceKey: string
  supabaseAnonKey?: string
}

// Connection options
interface ConnectionOptions {
  useServiceRole?: boolean
  schema?: string
}

/**
 * Get database configuration from environment variables
 */
export function getConfig(): DatabaseConfig {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error(
      'Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable',
    )
  }

  if (!supabaseServiceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable (required for migrations)',
    )
  }

  return {
    supabaseUrl,
    supabaseServiceKey,
    supabaseAnonKey,
  }
}

/**
 * Create a Supabase client for database operations
 */
export function createDbClient(
  options: ConnectionOptions = {},
): SupabaseClient<Database> {
  const config = getConfig()
  const { useServiceRole = true, schema = 'public' } = options

  const key = useServiceRole
    ? config.supabaseServiceKey
    : config.supabaseAnonKey

  if (!key) {
    throw new Error('No suitable API key available for database connection')
  }

  return createClient<Database>(config.supabaseUrl, key, {
    db: { schema },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Database client wrapper with helper methods
 */
export class DatabaseClient {
  private client: SupabaseClient<Database>
  private logger: Logger

  constructor(logger?: Logger) {
    this.client = createDbClient({ useServiceRole: true })
    this.logger = logger || new Logger({ prefix: '[DB]' })
  }

  /**
   * Get the underlying Supabase client
   */
  getClient(): SupabaseClient<Database> {
    return this.client
  }

  /**
   * Execute a raw SQL query (requires service role)
   */
  async executeSQL(
    sql: string,
  ): Promise<{ data: unknown; error: Error | null }> {
    try {
      const { data, error } = await this.client.rpc('exec_sql', {
        sql_query: sql,
      })
      if (error) {
        return { data: null, error: new Error(error.message) }
      }
      return { data, error: null }
    } catch (err) {
      // If exec_sql RPC doesn't exist, try using the REST API
      this.logger.warn('exec_sql RPC not available, attempting direct query')
      return { data: null, error: err as Error }
    }
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('information_schema.tables' as any)
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned"
      this.logger.error(`Error checking table existence: ${error.message}`)
    }

    return !!data
  }

  /**
   * Get row count for a table
   */
  async getRowCount(tableName: string): Promise<number> {
    const { count, error } = await this.client
      .from(tableName as any)
      .select('*', { count: 'exact', head: true })

    if (error) {
      this.logger.error(
        `Error getting row count for ${tableName}: ${error.message}`,
      )
      return 0
    }

    return count || 0
  }

  /**
   * Truncate a table (clear all data)
   */
  async truncateTable(
    tableName: string,
    cascade: boolean = false,
  ): Promise<void> {
    const cascadeClause = cascade ? ' CASCADE' : ''
    const { error } = await this.executeSQL(
      `TRUNCATE TABLE public.${tableName}${cascadeClause}`,
    )

    if (error) {
      throw new Error(`Failed to truncate ${tableName}: ${error.message}`)
    }

    this.logger.info(`Truncated table: ${tableName}`)
  }

  /**
   * Insert data into a table with upsert support
   */
  async upsert<T extends keyof Database['public']['Tables']>(
    table: T,
    data:
      | Database['public']['Tables'][T]['Insert']
      | Database['public']['Tables'][T]['Insert'][],
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ): Promise<{ data: unknown; error: Error | null }> {
    const records = Array.isArray(data) ? data : [data]

    const { data: result, error } = await this.client
      .from(table)
      .upsert(records as any, {
        onConflict: options?.onConflict,
        ignoreDuplicates: options?.ignoreDuplicates,
      })
      .select()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data: result, error: null }
  }

  /**
   * Batch insert with progress reporting
   */
  async batchInsert<T extends keyof Database['public']['Tables']>(
    table: T,
    records: Database['public']['Tables'][T]['Insert'][],
    options?: {
      batchSize?: number
      onProgress?: (completed: number, total: number) => void
    },
  ): Promise<{ inserted: number; errors: Error[] }> {
    const batchSize = options?.batchSize || 100
    const errors: Error[] = []
    let inserted = 0

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)

      const { error } = await this.client.from(table).insert(batch as any)

      if (error) {
        errors.push(
          new Error(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`),
        )
      } else {
        inserted += batch.length
      }

      if (options?.onProgress) {
        options.onProgress(
          Math.min(i + batchSize, records.length),
          records.length,
        )
      }
    }

    return { inserted, errors }
  }

  /**
   * Delete all records matching a condition
   */
  async deleteWhere<T extends keyof Database['public']['Tables']>(
    table: T,
    column: string,
    value: unknown,
  ): Promise<number> {
    const { data, error } = await this.client
      .from(table)
      .delete()
      .eq(column, value)
      .select()

    if (error) {
      throw new Error(`Failed to delete from ${table}: ${error.message}`)
    }

    return (data as unknown[])?.length || 0
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.client.from('series').select('id').limit(1)

      if (error && error.code !== 'PGRST116') {
        this.logger.error(`Connection test failed: ${error.message}`)
        return false
      }

      return true
    } catch (err) {
      this.logger.error(`Connection test error: ${(err as Error).message}`)
      return false
    }
  }
}

/**
 * Create a singleton database client instance
 */
let dbClientInstance: DatabaseClient | null = null

export function getDbClient(logger?: Logger): DatabaseClient {
  if (!dbClientInstance) {
    dbClientInstance = new DatabaseClient(logger)
  }
  return dbClientInstance
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetDbClient(): void {
  dbClientInstance = null
}

export default DatabaseClient
