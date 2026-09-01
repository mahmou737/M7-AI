import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export * from "./schema";

export interface ConvRecord {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MsgRecord {
  id: number;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface MemRecord {
  userId: string;
  key: string;
  value: string;
  label: string;
  updatedAt: Date;
}

const memoryDb = {
  conversations: new Map<string, ConvRecord>(),
  messages: [] as MsgRecord[],
  userMemory: new Map<string, MemRecord>(),
  msgIdCounter: 1,
};

let realDb: any = null;
export let pool: pg.Pool | null = null;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    realDb = drizzle(pool, { schema });
  } catch (e) {
    console.warn("[DB] Failed to initialize PostgreSQL pool, using in-memory store", e);
  }
}

function matchesCondition(row: any, condition: any): boolean {
  if (!condition) return true;
  // If condition is undefined or null
  if (typeof condition !== "object") return true;

  // Handle Drizzle eq binary expression
  if (condition.left && condition.right) {
    const colName = condition.left.name || condition.left.column?.name || (typeof condition.left === "string" ? condition.left : "");
    const expectedVal = condition.right.value !== undefined ? condition.right.value : condition.right;
    
    // Map column names to row properties
    let actualVal;
    if (colName === "user_id" || colName === "userId") actualVal = row.userId;
    else if (colName === "conversation_id" || colName === "conversationId") actualVal = row.conversationId;
    else if (colName === "created_at" || colName === "createdAt") actualVal = row.createdAt;
    else if (colName === "updated_at" || colName === "updatedAt") actualVal = row.updatedAt;
    else actualVal = row[colName];

    if (expectedVal !== undefined && actualVal !== undefined) {
      return String(actualVal) === String(expectedVal);
    }
  }

  // Handle and operator / array
  if (condition.operator === "and" || Array.isArray(condition.conditions)) {
    const list = condition.conditions || [condition.left, condition.right];
    return list.every((c: any) => matchesCondition(row, c));
  }

  return true;
}

function getTableName(table: any): string {
  if (!table) return "conversations";
  if (typeof table === "string") return table;
  if (table?._?.name) return table._.name;
  if (table === schema.conversationsTable) return "conversations";
  if (table === schema.messagesTable) return "messages";
  if (table === schema.userMemoryTable) return "user_memory";
  return table?.name || "conversations";
}

function createQueryBuilder(tableName: string) {
  let queryCondition: any = null;
  let queryOrders: any[] = [];
  let queryLimit: number | null = null;
  let queryOffset: number | null = null;

  const builder: any = {
    where: (cond: any) => {
      queryCondition = cond;
      return builder;
    },
    orderBy: (...orders: any[]) => {
      queryOrders = orders.flat();
      return builder;
    },
    limit: (n: number) => {
      queryLimit = typeof n === "number" ? n : null;
      return builder;
    },
    offset: (n: number) => {
      queryOffset = typeof n === "number" ? n : null;
      return builder;
    },
    then: (resolve: any, reject?: any) => {
      try {
        const results = executeSelect(tableName, queryCondition, queryOrders, queryLimit, queryOffset);
        return Promise.resolve(results).then(resolve, reject);
      } catch (err) {
        if (reject) return reject(err);
        throw err;
      }
    },
    catch: (reject: any) => {
      try {
        const results = executeSelect(tableName, queryCondition, queryOrders, queryLimit, queryOffset);
        return Promise.resolve(results).catch(reject);
      } catch (err) {
        return Promise.reject(err).catch(reject);
      }
    },
  };

  return builder;
}

function createInMemoryDb() {
  return {
    select: () => ({
      from: (table: any) => {
        const tableName = getTableName(table);
        return createQueryBuilder(tableName);
      },
    }),
    insert: (table: any) => ({
      values: (vals: any) => {
        const valArray = Array.isArray(vals) ? vals : [vals];
        const tableName = getTableName(table);
        const inserted = executeInsert(tableName, valArray);

        return {
          onConflictDoUpdate: (_opts: any) => ({
            returning: () => Promise.resolve(inserted),
            then: (resolve: any, reject?: any) => Promise.resolve(inserted).then(resolve, reject),
            catch: (reject: any) => Promise.resolve(inserted).catch(reject),
          }),
          returning: () => Promise.resolve(inserted),
          then: (resolve: any, reject?: any) => Promise.resolve(inserted).then(resolve, reject),
          catch: (reject: any) => Promise.resolve(inserted).catch(reject),
        };
      },
    }),
    delete: (table: any) => ({
      where: (condition: any) => {
        const tableName = getTableName(table);
        const deleted = executeDelete(tableName, condition);
        return {
          returning: () => Promise.resolve(deleted),
          then: (resolve: any, reject?: any) => Promise.resolve(deleted).then(resolve, reject),
          catch: (reject: any) => Promise.resolve(deleted).catch(reject),
        };
      },
    }),
    update: (table: any) => ({
      set: (updateValues: any) => ({
        where: (condition: any) => {
          const tableName = getTableName(table);
          const updated = executeUpdate(tableName, condition, updateValues);
          return {
            returning: () => Promise.resolve(updated),
            then: (resolve: any, reject?: any) => Promise.resolve(updated).then(resolve, reject),
            catch: (reject: any) => Promise.resolve(updated).catch(reject),
          };
        },
      }),
    }),
  };
}

function executeInsert(tableName: string, valArray: any[]): any[] {
  const inserted: any[] = [];
  for (const v of valArray) {
    if (tableName === "conversations") {
      const id = v.id || crypto.randomUUID();
      const record: ConvRecord = {
        id,
        userId: v.userId || "anonymous",
        title: v.title || "محادثة جديدة",
        createdAt: v.createdAt || new Date(),
        updatedAt: v.updatedAt || new Date(),
      };
      memoryDb.conversations.set(id, record);
      inserted.push(record);
    } else if (tableName === "messages") {
      const record: MsgRecord = {
        id: memoryDb.msgIdCounter++,
        conversationId: v.conversationId,
        role: v.role,
        content: v.content,
        createdAt: v.createdAt || new Date(),
      };
      memoryDb.messages.push(record);
      inserted.push(record);
    } else if (tableName === "user_memory") {
      const memKey = `${v.userId || "anonymous"}:${v.key}`;
      const record: MemRecord = {
        userId: v.userId || "anonymous",
        key: v.key,
        value: v.value,
        label: v.label,
        updatedAt: v.updatedAt || new Date(),
      };
      memoryDb.userMemory.set(memKey, record);
      inserted.push(record);
    }
  }
  return inserted;
}

function executeSelect(
  tableName: string,
  condition: any,
  orderClauses?: any[],
  limitCount?: number | null,
  offsetCount?: number | null
): any[] {
  let list: any[] = [];
  if (tableName === "conversations") {
    list = Array.from(memoryDb.conversations.values());
    if (condition) {
      list = list.filter((item) => matchesCondition(item, condition));
    }
    list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } else if (tableName === "messages") {
    list = [...memoryDb.messages];
    if (condition) {
      list = list.filter((item) => matchesCondition(item, condition));
    }
    list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  } else if (tableName === "user_memory") {
    list = Array.from(memoryDb.userMemory.values());
    if (condition) {
      list = list.filter((item) => matchesCondition(item, condition));
    }
    list.sort((a, b) => a.key.localeCompare(b.key));
  }

  if (offsetCount !== null && offsetCount !== undefined && offsetCount > 0) {
    list = list.slice(offsetCount);
  }
  if (limitCount !== null && limitCount !== undefined && limitCount >= 0) {
    list = list.slice(0, limitCount);
  }

  return list;
}

function executeDelete(tableName: string, condition: any): any[] {
  const deleted: any[] = [];
  if (tableName === "conversations") {
    for (const [id, conv] of memoryDb.conversations.entries()) {
      if (matchesCondition(conv, condition)) {
        memoryDb.conversations.delete(id);
        deleted.push(conv);
        memoryDb.messages = memoryDb.messages.filter((m) => m.conversationId !== id);
      }
    }
  } else if (tableName === "user_memory") {
    for (const [key, mem] of memoryDb.userMemory.entries()) {
      if (matchesCondition(mem, condition)) {
        memoryDb.userMemory.delete(key);
        deleted.push(mem);
      }
    }
  }
  return deleted;
}

function executeUpdate(tableName: string, condition: any, updateValues: any): any[] {
  const updated: any[] = [];
  if (tableName === "conversations") {
    for (const [id, conv] of memoryDb.conversations.entries()) {
      if (matchesCondition(conv, condition)) {
        const newConv = { ...conv, ...updateValues, updatedAt: new Date() };
        memoryDb.conversations.set(id, newConv);
        updated.push(newConv);
      }
    }
  }
  return updated;
}

export const db = realDb || createInMemoryDb();
