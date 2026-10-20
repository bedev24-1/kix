import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, profilsSpeciaux, users } from "@/db";
import { enVigueur, type TypeProfil } from "@/lib/profils";

/** Les profils spéciaux d'un compte, par type. */
export async function mesProfils(userId: string) {
  const lignes = await db.select().from(profilsSpeciaux).where(eq(profilsSpeciaux.userId, userId));
  return { pro: lignes.find((l) => l.type === "pro") ?? null, arbitre: lignes.find((l) => l.type === "arbitre") ?? null };
}

/** Ce compte a-t-il ce profil en vigueur ? */
export async function aLeProfil(userId: string, type: TypeProfil) {
  const p = (await db.select().from(profilsSpeciaux).where(and(eq(profilsSpeciaux.userId, userId), eq(profilsSpeciaux.type, type))).limit(1))[0];
  return enVigueur(p);
}

/** Les arbitres en vigueur : les seuls qu'un organisateur peut annoncer. */
export async function arbitresActifs() {
  const lignes = await db
    .select({ id: users.id, nom: users.name, phone: users.phone, avatar: users.avatar, status: profilsSpeciaux.status, actifJusqu: profilsSpeciaux.actifJusqu })
    .from(profilsSpeciaux)
    .innerJoin(users, eq(users.id, profilsSpeciaux.userId))
    .where(and(eq(profilsSpeciaux.type, "arbitre"), eq(profilsSpeciaux.status, "actif")))
    .orderBy(users.name);
  return lignes.filter(enVigueur);
}

/** Les comptes pro en vigueur, pour le badge. */
export async function idsPro(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const lignes = await db
    .select({ userId: profilsSpeciaux.userId, status: profilsSpeciaux.status, actifJusqu: profilsSpeciaux.actifJusqu })
    .from(profilsSpeciaux)
    .where(and(eq(profilsSpeciaux.type, "pro"), inArray(profilsSpeciaux.userId, userIds)));
  return new Set(lignes.filter(enVigueur).map((l) => l.userId));
}

/** Tout, pour l'administration : demandes d'abord. */
export async function profilsPourAdmin() {
  return db
    .select({ profil: profilsSpeciaux, user: { id: users.id, name: users.name, phone: users.phone, avatar: users.avatar } })
    .from(profilsSpeciaux)
    .innerJoin(users, eq(users.id, profilsSpeciaux.userId))
    .orderBy(desc(profilsSpeciaux.updatedAt));
}
