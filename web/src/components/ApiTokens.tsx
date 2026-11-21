import { useState } from "react";
import { api, type ApiToken } from "../api";
import { useAsync } from "../hooks/useAsync";
import { useApp } from "./AppContext";
import { Button, ErrorRow, SkeletonRows, confirmDialog, inputCls } from "./ui";
import { t, fmtDate, fmtAgo } from "../i18n";

export function ApiTokens() {
  const { toast } = useApp();
  const tokens = useAsync(api.apiTokens, []);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const revoke = async (token: ApiToken) => {
    const ok = await confirmDialog(
      t("tokens.revokeConfirm", { name: token.name }),
      t("tokens.revoke"),
    );
    if (!ok) return;
    try {
      await api.revokeApiToken(token.id);
      tokens.reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <>
      <form
        className="flex items-center gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const trimmed = name.trim();
          if (!trimmed || busy) return;
          setBusy(true);
          try {
            const res = await api.createApiToken(trimmed);
            setCreated(res.token);
            setName("");
            tokens.reload();
          } catch (err) {
            toast(err instanceof Error ? err.message : String(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          className={inputCls}
          maxLength={60}
          placeholder={t("tokens.namePlaceholder")}
          aria-label={t("tokens.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button primary type="submit" disabled={busy || name.trim() === ""}>
          {t("tokens.create")}
        </Button>
      </form>

      {created && (
        <div className="mt-4 rounded-md border border-line bg-raised p-3">
          <div className="text-[12px] text-ink-3">{t("tokens.copyOnce")}</div>
          <div className="mt-2 flex items-center gap-2">
            <input
              readOnly
              value={created}
              className={inputCls + " font-mono text-[12px]"}
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              onClick={() => {
                void navigator.clipboard
                  .writeText(created)
                  .then(() => toast(t("tokens.copied")))
                  .catch(() => undefined);
              }}
            >
              {t("tokens.copy")}
            </Button>
            <Button onClick={() => setCreated(null)}>{t("tokens.done")}</Button>
          </div>
          <div className="mt-3 text-[12px] text-ink-3">
            {t("tokens.mcpHint")}
          </div>
          <pre className="mt-1 rounded-sm border border-line bg-surface p-2 text-[11px] whitespace-pre-wrap break-all">
            {`claude mcp add --transport http unamey ${location.origin}/api/mcp --header "Authorization: Bearer ${created}"`}
          </pre>
        </div>
      )}

      {tokens.error ? (
        <ErrorRow message={tokens.error} onRetry={tokens.reload} />
      ) : tokens.loading && !tokens.data ? (
        <SkeletonRows n={2} />
      ) : tokens.data && tokens.data.length === 0 ? (
        <p className="mt-4 text-[13px] text-ink-3">{t("tokens.none")}</p>
      ) : tokens.data ? (
        <ul className="mt-4 divide-y divide-line">
          {tokens.data.map((token) => (
            <li key={token.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-ink">
                  {token.name}
                </div>
                <div className="mt-0.5 text-[12px] text-ink-3">
                  {token.last_used
                    ? t("tokens.lastUsed", { when: fmtAgo(token.last_used) })
                    : t("tokens.neverUsed")}{" "}
                  · {t("tokens.createdOn", { when: fmtDate(token.created_at) })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => revoke(token)}
                className="text-[13px] text-ink-3 hover:text-bad"
              >
                {t("tokens.revoke")}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
