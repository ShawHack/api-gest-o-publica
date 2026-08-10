import { MongoClient, ObjectId, type Collection, type Db } from "mongodb";
import { loadRamais } from "@/lib/ramais";

export type RamalDoc = {
  _id: ObjectId;
  ramal: string;
  nomeSetor: string;
  createdAt: Date;
  updatedAt: Date;
};

export type RamalItem = {
  id: string;
  ramal: string;
  nomeSetor: string;
};

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://mongo:27017/apicemiterio?replicaSet=rs0";
const COLLECTION = "ferramentas_ramais";

let clientPromise: Promise<MongoClient> | null = null;
let seeded = false;

function getClient(): Promise<MongoClient> {
  if (!clientPromise) {
    clientPromise = MongoClient.connect(MONGODB_URI);
  }
  return clientPromise;
}

async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db();
}

async function getCollection(): Promise<Collection<RamalDoc>> {
  const db = await getDb();
  return db.collection<RamalDoc>(COLLECTION);
}

function toItem(doc: RamalDoc): RamalItem {
  return {
    id: String(doc._id),
    ramal: doc.ramal,
    nomeSetor: doc.nomeSetor,
  };
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  const col = await getCollection();
  const count = await col.countDocuments({}, { limit: 1 });
  if (count > 0) {
    seeded = true;
    return;
  }

  const seed = loadRamais();
  if (seed.length === 0) {
    seeded = true;
    return;
  }

  const now = new Date();
  await col.insertMany(
    seed.map((entry) => ({
      _id: new ObjectId(),
      ramal: entry.ramal,
      nomeSetor: entry.nomeSetor,
      createdAt: now,
      updatedAt: now,
    })),
    { ordered: false },
  );
  seeded = true;
}

export async function searchRamaisMongo(options: {
  ramal?: string;
  nomeSetor?: string;
}): Promise<RamalItem[]> {
  await ensureSeeded();
  const col = await getCollection();
  const docs = await col.find({}).sort({ ramal: 1, nomeSetor: 1 }).toArray();

  const ramalQuery = normalize(options.ramal ?? "");
  const nomeQuery = normalize(options.nomeSetor ?? "");

  if (!ramalQuery && !nomeQuery) {
    return docs.map(toItem);
  }

  return docs
    .filter((entry) => {
      const ramalOk = !ramalQuery || normalize(entry.ramal).includes(ramalQuery);
      const nomeOk = !nomeQuery || normalize(entry.nomeSetor).includes(nomeQuery);
      return ramalOk && nomeOk;
    })
    .map(toItem);
}

export async function createRamal(input: {
  ramal: string;
  nomeSetor: string;
}): Promise<RamalItem> {
  await ensureSeeded();
  const ramal = String(input.ramal || "").trim();
  const nomeSetor = String(input.nomeSetor || "").trim();
  if (!ramal || !nomeSetor) {
    const err = new Error("Informe ramal e nome/setor.");
    (err as any).status = 400;
    throw err;
  }

  const now = new Date();
  const doc: RamalDoc = {
    _id: new ObjectId(),
    ramal,
    nomeSetor,
    createdAt: now,
    updatedAt: now,
  };
  const col = await getCollection();
  await col.insertOne(doc);
  return toItem(doc);
}

export async function updateRamal(
  id: string,
  input: { ramal?: string; nomeSetor?: string },
): Promise<RamalItem> {
  await ensureSeeded();
  if (!ObjectId.isValid(id)) {
    const err = new Error("Ramal não encontrado.");
    (err as any).status = 404;
    throw err;
  }

  const patch: Partial<RamalDoc> = { updatedAt: new Date() };
  if (input.ramal !== undefined) {
    const ramal = String(input.ramal).trim();
    if (!ramal) {
      const err = new Error("Ramal inválido.");
      (err as any).status = 400;
      throw err;
    }
    patch.ramal = ramal;
  }
  if (input.nomeSetor !== undefined) {
    const nomeSetor = String(input.nomeSetor).trim();
    if (!nomeSetor) {
      const err = new Error("Nome/setor inválido.");
      (err as any).status = 400;
      throw err;
    }
    patch.nomeSetor = nomeSetor;
  }

  const col = await getCollection();
  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: patch },
    { returnDocument: "after" },
  );

  if (!result) {
    const err = new Error("Ramal não encontrado.");
    (err as any).status = 404;
    throw err;
  }
  return toItem(result);
}

export async function deleteRamal(id: string): Promise<void> {
  await ensureSeeded();
  if (!ObjectId.isValid(id)) {
    const err = new Error("Ramal não encontrado.");
    (err as any).status = 404;
    throw err;
  }
  const col = await getCollection();
  const result = await col.deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) {
    const err = new Error("Ramal não encontrado.");
    (err as any).status = 404;
    throw err;
  }
}
