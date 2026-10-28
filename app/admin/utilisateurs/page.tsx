import Link from "next/link";
import { Photo } from "@/components/ui/Photo";
import { PageHead, Pill, Table, Td } from "@/components/admin/AdminUI";
import { setUserRole } from "@/lib/actions";
import { chercherUtilisateurs, chiffresUtilisateurs, getAllVenues, type FiltresUtilisateurs } from "@/lib/queries";
import { group } from "@/lib/format";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";
export const metadata = { title: "Utilisateurs" };

const roles = [
  { value: "client", label: "Client" },
  { value: "manager", label: "Gérant" },
  { value: "seller", label: "Vendeur" },
  { value: "admin", label: "Admin" },
];

const periodes = [
  { value: "", label: "Depuis toujours" },
  { value: "24h", label: "Dernières 24 h" },
  { value: "7j", label: "7 derniers jours" },
  { value: "30j", label: "30 derniers jours" },
  { value: "90j", label: "90 derniers jours" },
];

const statuts = [
  { value: "", label: "Tous" },
  { value: "membre", label: "Abonnés actifs" },
  { value: "certifie", label: "Certifiés" },
  { value: "avatar", label: "Avec photo" },
  { value: "sans-avatar", label: "Sans photo" },
];

const tris = [
  { value: "", label: "Plus récents" },
  { value: "anciens", label: "Plus anciens" },
  { value: "points", label: "Plus de points" },
  { value: "nom", label: "Nom (A → Z)" },
];

const dateFr = (d: Date) =>
  d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Douala" });
const heureFr = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Douala" });

export default async function AdminUsers({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const filtres: FiltresUtilisateurs = {
    q: sp.q,
    role: sp.role,
    periode: sp.periode,
    du: sp.du,
    au: sp.au,
    salle: sp.salle,
    sexe: sp.sexe,
    statut: sp.statut,
    tri: sp.tri,
    page: Number(sp.page) || 1,
  };
  const [resultat, chiffres, venues] = await Promise.all([chercherUtilisateurs(filtres), chiffresUtilisateurs(), getAllVenues()]);
  const filtre = Object.entries(sp).some(([k, v]) => k !== "page" && k !== "tri" && v);

  // Les liens rapides et la pagination gardent les autres filtres.
  const lien = (changes: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, page: undefined, ...changes })) if (v) p.set(k, String(v));
    const s = p.toString();
    return `/admin/utilisateurs${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHead title="Utilisateurs" subtitle="Clients, gérants, vendeurs et administrateurs. Le rôle ouvre les accès." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Chiffre label="Utilisateurs" valeur={chiffres.total} fort />
        <Chiffre label="Nouveaux · 24 h" valeur={chiffres.jour} href={lien({ periode: "24h", du: undefined, au: undefined })} />
        <Chiffre label="Nouveaux · 7 jours" valeur={chiffres.semaine} href={lien({ periode: "7j", du: undefined, au: undefined })} />
        <Chiffre label="Nouveaux · 30 jours" valeur={chiffres.mois} href={lien({ periode: "30j", du: undefined, au: undefined })} />
        <Chiffre label="Abonnés actifs" valeur={chiffres.membres} href={lien({ statut: "membre" })} />
        <div className="flex flex-col justify-center gap-1.5 rounded-card border border-line p-4 text-[12px]">
          {[
            ["client", "Clients", chiffres.clients],
            ["manager", "Gérants", chiffres.gerants],
            ["seller", "Vendeurs", chiffres.vendeurs],
            ["admin", "Admins", chiffres.admins],
          ].map(([r, l, n]) => (
            <Link key={r} href={lien({ role: String(r) })} className="flex justify-between text-muted hover:text-ink">
              <span>{l}</span>
              <b className="text-ink tabular-nums">{group(Number(n))}</b>
            </Link>
          ))}
        </div>
      </div>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[11px] tracking-[0.14em] text-muted uppercase">Derniers inscrits</h2>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {chiffres.derniers.map((u) => (
            <Link
              key={u.id}
              href={lien({ q: u.phone, role: undefined, periode: undefined, du: undefined, au: undefined, salle: undefined, sexe: undefined, statut: undefined })}
              className="flex w-36 shrink-0 flex-col items-center gap-1.5 rounded-card border border-line p-3 text-center hover:border-gold/50"
            >
              <Avatar nom={u.name} avatar={u.avatar} taille={44} />
              <span className="w-full truncate text-[12.5px] font-semibold">{u.name}</span>
              <span className="text-[10.5px] text-muted">
                {dateFr(u.createdAt)} · {heureFr(u.createdAt)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <form method="get" className="grid gap-2.5 rounded-card border border-line p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-2">
          <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">Recherche</span>
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Nom, téléphone ou code" className={champ} />
        </label>
        <Choix label="Rôle" name="role" valeur={sp.role} options={[{ value: "", label: "Tous" }, ...roles]} />
        <Choix label="Inscription" name="periode" valeur={sp.periode} options={periodes} />
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">Du</span>
          <input type="date" name="du" defaultValue={sp.du ?? ""} className={champ} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">Au</span>
          <input type="date" name="au" defaultValue={sp.au ?? ""} className={champ} />
        </label>
        <Choix
          label="Salle"
          name="salle"
          valeur={sp.salle}
          options={[{ value: "", label: "Toutes" }, { value: "aucune", label: "Sans salle" }, ...venues.map((v) => ({ value: v.id, label: v.name }))]}
        />
        <Choix
          label="Sexe"
          name="sexe"
          valeur={sp.sexe}
          options={[
            { value: "", label: "Tous" },
            { value: "homme", label: "Hommes" },
            { value: "femme", label: "Femmes" },
            { value: "inconnu", label: "Non renseigné" },
          ]}
        />
        <Choix label="Statut" name="statut" valeur={sp.statut} options={statuts} />
        <Choix label="Trier par" name="tri" valeur={sp.tri} options={tris} />
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
          <button className="h-10 rounded-full bg-gold px-5 text-[12.5px] font-semibold text-gold-ink">Filtrer</button>
          {filtre ? (
            <Link href="/admin/utilisateurs" className="flex h-10 items-center rounded-full border border-line px-4 text-[12.5px] text-muted hover:text-ink">
              Tout effacer
            </Link>
          ) : null}
        </div>
      </form>

      <p className="text-[13px] text-muted">
        <b className="text-ink">{group(resultat.total)}</b> utilisateur{resultat.total > 1 ? "s" : ""}
        {filtre ? " correspondent aux filtres" : " au total"}
        {resultat.pages > 1 ? ` · page ${resultat.page} sur ${resultat.pages}` : ""}
      </p>

      <Table head={["Compte", "Téléphone", "Inscrit le", "Rôle", "Salle", "Points", "Changer le rôle"]}>
        {resultat.lignes.map((user) => (
          <tr key={user.id}>
            <Td>
              <span className="flex items-center gap-3">
                <Avatar nom={user.name} avatar={user.avatar} taille={36} />
                <span className="flex flex-col">
                  <span className="font-semibold">{user.name}</span>
                  <span className="text-[11px] text-muted">
                    code {user.code}
                    {user.certifie ? " · certifié" : ""}
                    {user.memberUntil && user.memberUntil > new Date() ? " · abonné" : ""}
                  </span>
                </span>
              </span>
            </Td>
            <Td className="text-muted">+237 {user.phone}</Td>
            <Td className="whitespace-nowrap text-muted">
              {dateFr(user.createdAt)}
              <span className="block text-[11px]">{heureFr(user.createdAt)}</span>
            </Td>
            <Td>
              <Pill tone={user.role === "admin" ? "jade" : user.role === "manager" ? "gold" : "neutral"}>
                {roles.find((r) => r.value === user.role)?.label ?? user.role}
              </Pill>
            </Td>
            <Td className="text-muted">{venues.find((v) => v.id === user.venueId)?.name ?? "—"}</Td>
            <Td>{user.role === "client" ? group(user.points) : "—"}</Td>
            <Td>
              <form action={setUserRole} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={user.id} />
                <select name="role" defaultValue={user.role} className="h-9 rounded-none border border-line bg-surface px-2 text-[12px] text-ink">
                  {roles.map((role) => (
                    <option key={role.value} value={role.value} className="bg-bg text-ink">
                      {role.label}
                    </option>
                  ))}
                </select>
                <select name="venueId" defaultValue={user.venueId ?? ""} className="h-9 rounded-none border border-line bg-surface px-2 text-[12px] text-ink">
                  <option value="" className="bg-bg text-ink">
                    Sans salle
                  </option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id} className="bg-bg text-ink">
                      {venue.name}
                    </option>
                  ))}
                </select>
                <button className="rounded-full bg-gold px-3 py-2 text-[11px] font-semibold text-gold-ink">OK</button>
              </form>
            </Td>
          </tr>
        ))}
      </Table>

      {resultat.lignes.length === 0 ? <p className="py-6 text-center text-[13px] text-muted">Aucun utilisateur ne correspond.</p> : null}

      {resultat.pages > 1 ? (
        <nav className="flex items-center justify-center gap-2" aria-label="Pages">
          <Page href={lien({ page: resultat.page - 1 })} desactive={resultat.page <= 1}>
            ← Précédente
          </Page>
          <span className="px-2 text-[12.5px] text-muted">
            {resultat.page} / {resultat.pages}
          </span>
          <Page href={lien({ page: resultat.page + 1 })} desactive={resultat.page >= resultat.pages}>
            Suivante →
          </Page>
        </nav>
      ) : null}
    </>
  );
}

const champ = "h-10 rounded-none border border-line bg-surface px-2.5 text-[13px] text-ink outline-none focus:border-gold";

function Choix({ label, name, valeur, options }: { label: string; name: string; valeur?: string; options: { value: string; label: string }[] }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">{label}</span>
      <select name={name} defaultValue={valeur ?? ""} className={champ}>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-bg text-ink">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Chiffre({ label, valeur, href, fort }: { label: string; valeur: number; href?: string; fort?: boolean }) {
  const contenu = (
    <>
      <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">{label}</span>
      <span className={cn("font-bold tabular-nums", fort ? "text-[30px] text-gold-text" : "text-[24px]")}>{group(valeur)}</span>
    </>
  );
  const classe = "flex flex-col gap-1 rounded-card border border-line p-4";
  return href ? (
    <Link href={href} className={cn(classe, "hover:border-gold/50")}>
      {contenu}
    </Link>
  ) : (
    <div className={classe}>{contenu}</div>
  );
}

function Avatar({ nom, avatar, taille }: { nom: string; avatar: string | null; taille: number }) {
  return avatar ? (
    <Photo src={avatar} alt={nom} width={taille} height={taille} className="shrink-0 rounded-full object-cover" style={{ width: taille, height: taille }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold" style={{ width: taille, height: taille }}>
      {nom.slice(0, 2).toUpperCase()}
    </span>
  );
}

function Page({ href, desactive, children }: { href: string; desactive: boolean; children: React.ReactNode }) {
  return desactive ? (
    <span className="rounded-full border border-line px-4 py-2 text-[12.5px] text-faint">{children}</span>
  ) : (
    <Link href={href} className="rounded-full border border-line px-4 py-2 text-[12.5px] hover:border-gold/50">
      {children}
    </Link>
  );
}
