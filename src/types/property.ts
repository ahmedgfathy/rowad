export interface Property {
  id: number
  source_file?: string
  message_date: string
  sender_name: string
  sender_mobile: string
  raw_message: string
  is_starred?: boolean
  follow_up_status?: string | null
  follow_up_at?: string | null
  follow_up_tags?: string[] | null
  follow_up_notes?: string | null
  created_at: string
  updated_at: string
}