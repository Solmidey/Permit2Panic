import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const allowances = sqliteTable(
  "allowances",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    chainId: integer("chain_id").notNull(),
    owner: text("owner").notNull(),
    token: text("token").notNull(),
    spender: text("spender").notNull(),
    amount: text("amount").notNull(),
    expiration: integer("expiration").notNull(),
    updatedAt: integer("updated_at").notNull(),
    lastSeen: integer("last_seen").notNull(),
  },
  (table) => ({
    uniqueAllowance: sql`unique(${table.chainId}, ${table.owner}, ${table.token}, ${table.spender})`,
  })
);

export const scanCursors = sqliteTable("scan_cursors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chainId: integer("chain_id").notNull(),
  owner: text("owner").notNull(),
  lastScannedBlock: integer("last_scanned_block").notNull(),
  lastScannedAt: integer("last_scanned_at").notNull(),
});

export const receipts = sqliteTable("receipts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  owner: text("owner").notNull(),
  chainId: integer("chain_id").notNull(),
  revoked: integer("revoked").notNull(),
  limited: integer("limited").notNull(),
  panicked: integer("panicked").notNull(),
  createdAt: integer("created_at").notNull(),
  summary: text("summary").notNull(),
});
