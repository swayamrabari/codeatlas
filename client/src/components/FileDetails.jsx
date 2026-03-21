import { File } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SectionHeader } from '@/components/SectionHeader';
import { TintedBadge } from '@/components/TintedBadge';

export function FileDetails({ file }) {
  return (
    <div className="mx-auto max-w-5xl space-y-10 animate-in fade-in duration-300 p-10 md:p-16 lg:p-20">
      {/* HEADER */}
      <div className="space-y-3">
        <div className="text-3xl font-bold flex items-center gap-3 break-all ">
          <span className="p-2.5 bg-blue-500/20 rounded-lg">
            <File className="h-8 w-8 text-blue-500 " />
          </span>
          <div>
            <span>{file.path.split('/').pop()}</span>
            <p className="text-muted-foreground font-medium font-mono text-base">
              {file.path}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <TintedBadge label={file.type} type="type" />
          {file.category && (
            <TintedBadge label={file.category} type="category" />
          )}
          {file.role && <TintedBadge label={file.role} type="role" />}
          {file.behavior && (
            <TintedBadge label={file.behavior} type="behavior" />
          )}
        </div>
      </div>

      {/* ROUTES SECTION — prefer absoluteRoutes when available */}
      {((file.absoluteRoutes && file.absoluteRoutes.length > 0) ||
        (file.routes && file.routes.length > 0)) && (
        <section className="space-y-4">
          <SectionHeader
            title={
              file.mountPrefix
                ? `API Routes · ${file.mountPrefix}`
                : 'API Routes'
            }
          />
          <div className="space-y-2">
            {(file.absoluteRoutes && file.absoluteRoutes.length > 0
              ? file.absoluteRoutes
              : file.routes
            ).map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-1 border-border/40 last:border-0"
              >
                <TintedBadge label={r.method} type="method" />
                <span className="font-mono text-base text-foreground">
                  {r.path}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* THIRD-PARTY DEPENDENCIES */}
      {file.thirdPartyDeps && file.thirdPartyDeps.length > 0 && (
        <section className="space-y-3">
          <SectionHeader
            title={`Third-Party Dependencies (${file.thirdPartyDeps.length})`}
          />
          <div className="flex flex-wrap gap-2">
            {file.thirdPartyDeps.map((dep) => (
              <Badge
                key={dep}
                variant="secondary"
                className="text-xs font-mono px-2.5 py-1 rounded-md"
              >
                {dep}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* STATS & CONNECTIONS */}
      <section className="space-y-4">
        <SectionHeader title="Connections" />
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-muted-foreground">
              Imports
            </div>
            <div className="text-2xl font-bold">{file.imports?.count || 0}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-muted-foreground">
              Exports
            </div>
            <div className="text-2xl font-bold">{file.exportsCount || 0}</div>
          </div>
        </div>
      </section>

      {/* IMPORTS LIST */}
      {file.imports?.items?.length > 0 && (
        <section className="space-y-2">
          <SectionHeader title="Imports" />
          <div className="space-y-1.5 overflow-auto pb-3">
            {file.imports.items.map((imp, i) => {
              const names = Array.isArray(imp.imported)
                ? imp.imported.filter((n) => n && n !== '(default)')
                : imp.imported
                  ? [imp.imported]
                  : [];
              const hasNames = names.length > 0;

              return (
                <div
                  key={i}
                  className="flex items-center gap-2 text-base text-foreground cursor-pointer"
                >
                  {hasNames ? (
                    <>
                      <span className="font-mono text-foreground shrink-0">
                        {names.join(', ')}
                      </span>
                      <span className="text-muted-foreground shrink-0">-</span>
                      <span className="text-muted-foreground font-mono">
                        {imp.path}
                      </span>
                    </>
                  ) : (
                    <span className="font-mono text-muted-foreground">
                      {imp.path}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* EXPORTS LIST */}
      {file.exports && file.exports.length > 0 && (
        <section className="space-y-2">
          <SectionHeader title="Exports" />
          <div className="space-y-2">
            {file.exports.map((exp, i) => (
              <div key={i} className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className="text-[12px] h-5 min-w-12 justify-center px-2 font-mono text-muted-foreground/70 border-border/50 transition-colors"
                >
                  {exp.kind}
                </Badge>
                <span className="font-mono text-base truncate">{exp.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* IMPORTED BY */}
      {file.importedBy && file.importedBy.length > 0 && (
        <section className="space-y-2">
          <SectionHeader title="Imported By" />
          <div className="space-y-1">
            {file.importedBy.map((imp, i) => (
              <div
                key={i}
                className="font-mono text-base text-foreground truncate cursor-pointer"
              >
                {imp}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
