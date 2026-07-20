export interface SeedPost {
  _id: string
  _type: 'post'
  title: string
  slug: { _type: 'slug'; current: string }
  excerpt: string
}

export declare function buildPosts(): SeedPost[]
