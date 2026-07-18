export type Arnia = {
  id: string
  nome: string
  note: string | null
}

export type Misura = {
  id: string
  created_at: string
  arnia_id: string
  peso_kg: number
  batteria_v: number
  temperatura_c: number | null
}

export interface Database {
  public: {
    Tables: {
      arnie: {
        Row: Arnia
        Insert: Partial<Arnia> & Pick<Arnia, 'id' | 'nome'>
        Update: Partial<Arnia>
        Relationships: []
      }
      misure: {
        Row: Misura
        Insert: Partial<Misura> & Pick<Misura, 'arnia_id' | 'peso_kg' | 'batteria_v'>
        Update: Partial<Misura>
        Relationships: [
          {
            foreignKeyName: 'misure_arnia_id_fkey'
            columns: ['arnia_id']
            referencedRelation: 'arnie'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
