import { pgTable, uuid, text, timestamp, integer, boolean, pgEnum, customType } from 'drizzle-orm/pg-core';

// Custom type para soportar pgvector de forma segura
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value) {
    return JSON.stringify(value);
  },
});

export const userRoleEnum = pgEnum('user_role', ['founder', 'client', 'admin']);
export const productStatusEnum = pgEnum('product_status', ['draft', 'pending_review', 'approved', 'rejected']);
export const pricingModelEnum = pgEnum('pricing_model', ['saas', 'transactional', 'custom']);
export const leadStatusEnum = pgEnum('lead_status', ['initiated', 'contacted', 'closed']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  role: userRoleEnum('role').default('client').notNull(),
  companyName: text('company_name'),
  linkedinUrl: text('linkedin_url'),
  isVerified: boolean('is_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  founderId: uuid('founder_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  tagline: text('tagline').notNull(),
  descriptionPain: text('description_pain').notNull(),
  pricingModel: pricingModelEnum('pricing_model').notNull(),
  status: productStatusEnum('status').default('draft').notNull(),
  url: text('url'),
  launchedAt: timestamp('launched_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const productEmbeddings = pgTable('product_embeddings', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  embedding: vector('embedding'),
});

export const endorsements = pgTable('endorsements', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  weight: integer('weight').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const leads = pgTable('leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  clientId: uuid('client_id').references(() => users.id).notNull(),
  intentQuery: text('intent_query'),
  status: leadStatusEnum('status').default('initiated').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
