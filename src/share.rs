//! Public, read-only share pages: `/s/<token>` (a no-JS viewer) and `/s/<token>/<gid>` (one screen, sandboxed).

use crate::config::Config;
use crate::db;

pub async fn page(cfg: &Config, token: &str, screen: Option<uuid::Uuid>) -> Result<Option<String>, String> {
    let Some((title, screens)) = db::shared_screens(cfg, token).await? else {
        return Ok(None);
    };
    if screens.is_empty() {
        return Ok(None);
    }
    let token = esc(token);
    let sel = screen.filter(|s| screens.iter().any(|x| x.id == *s)).unwrap_or(screens[0].id);
    let sel = screens.iter().find(|s| s.id == sel).expect("selected screen exists");
    let mut links = String::new();
    for s in screens.iter().filter(|_| screens.len() > 1) {
        let mobile = if s.target == "mobile" { " · mobile" } else { "" };
        let sel_attr = if s.id == sel.id { " class=\"sel\" aria-current=\"page\"" } else { "" };
        links.push_str(&format!("<a href=\"/s/{token}?screen={}\"{sel_attr}>{label}{mobile}</a>", s.id, label = esc(&s.label)));
    }
    let style = "body{margin:0;background:#f4f4f5;font:14px system-ui,sans-serif}\n.top{height:48px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 16px;background:#fff;border-bottom:1px solid #e5e5e5}\n.t{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\nnav{display:flex;gap:12px;overflow-x:auto}\na{color:#333;text-decoration:none;white-space:nowrap}\na.sel{font-weight:700;text-decoration:underline;text-decoration-color:#111}\n.d{width:100%;height:calc(100vh - 49px);border:0;display:block}\n.m{width:390px;height:844px;border:1px solid #e5e5e5;border-radius:24px;display:block;margin:24px auto 0}";
    let frame_class = if sel.target == "mobile" { "m" } else { "d" };
    let frame = format!(
        r#"<iframe class="{frame_class}" src="/s/{token}/{id}" sandbox="allow-scripts" title="{label}" referrerpolicy="no-referrer"></iframe>"#,
        id = sel.id,
        label = esc(&sel.label)
    );
    Ok(Some(format!(
        r#"<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{title}</title>
<style>{style}</style>
</head>
<body>
<header class="top"><div class="t">{title}</div><nav>{links}<a href="/s/{token}/llms.txt" title="Plain-text index and pack for a coding agent">For agents</a></nav></header>
{frame}
</body>
</html>"#,
        title = esc(&title),
        style = style,
        links = links,
        frame = frame
    )))
}

/// A plain-text index of a share for a coding agent: the pack, then one raw HTML URL per screen, absolute when `base`
/// (the public origin) is known. Titles and labels are user text, so they are collapsed to one line to keep a forged
/// label from adding lines of its own.
pub async fn llms(cfg: &Config, token: &str, base: &str) -> Result<Option<String>, String> {
    let Some((title, screens)) = db::shared_screens(cfg, token).await? else {
        return Ok(None);
    };
    Ok(Some(index_text(
        &title,
        &format!("{base}/s/{token}"),
        &screens.iter().map(|s| (s.id, s.label.as_str(), s.target.as_str())).collect::<Vec<_>>(),
    )))
}

fn index_text(title: &str, root: &str, screens: &[(uuid::Uuid, &str, &str)]) -> String {
    let line = |s: &str| s.split_whitespace().collect::<Vec<_>>().join(" ");
    let mut out = format!(
        "# {}\n\nA UI pack made with Unamey, read-only. Build the app's screens from it.\n\n- Pack (zip: SKILL.md with the rules to follow, tokens.css, one HTML page per screen): {root}/pack.zip\n\n## Screens (raw HTML)\n\n",
        line(title)
    );
    for (id, label, target) in screens {
        out.push_str(&format!("- {} ({target}): {root}/{id}\n", line(label)));
    }
    out
}

/// The public origin for absolute links: `STUDIO_ORIGIN` when set, else the request's Host when it is a plain
/// host[:port] (the reply goes back to the same requester and is never cached), else empty (relative links).
pub fn base(origin: Option<&str>, host: Option<&str>) -> String {
    if let Some(o) = origin {
        return o.to_string();
    }
    host.filter(|h| !h.is_empty() && h.len() <= 255 && h.bytes().all(|b| b.is_ascii_alphanumeric() || b"-.:[]".contains(&b)))
        .map_or(String::new(), |h| format!("http://{h}"))
}

fn esc(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;").replace('\'', "&#39;")
}

pub fn page_headers() -> [(&'static str, &'static str); 5] {
    [
        (
            "Content-Security-Policy",
            "default-src 'none'; style-src 'unsafe-inline'; frame-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        ),
        ("Referrer-Policy", "no-referrer"),
        ("X-Robots-Tag", "noindex, nofollow"),
        ("Cache-Control", "no-store"),
        ("X-Frame-Options", "DENY"),
    ]
}

pub fn screen_headers() -> [(&'static str, &'static str); 5] {
    [
        ("Content-Security-Policy", "sandbox allow-scripts; frame-ancestors 'self'"),
        ("Referrer-Policy", "no-referrer"),
        ("X-Robots-Tag", "noindex, nofollow"),
        ("Cache-Control", "no-store"),
        ("X-Frame-Options", "SAMEORIGIN"),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn esc_escapes() {
        assert_eq!(esc("a<b>&\"'"), "a&lt;b&gt;&amp;&quot;&#39;");
    }

    #[test]
    fn index_lists_one_line_per_screen() {
        let id = uuid::Uuid::from_u128(7);
        let t = index_text("My\nApp", "http://h/s/ab", &[(id, "Home\n- evil: /x", "mobile")]);
        assert_eq!(t.lines().filter(|l| l.starts_with("- ")).count(), 2, "the pack line and one screen line");
        assert!(t.starts_with("# My App\n") && t.contains(&format!("(mobile): http://h/s/ab/{id}")));
        assert!(t.contains("http://h/s/ab/pack.zip"));
    }

    #[test]
    fn base_prefers_the_configured_origin_and_refuses_odd_hosts() {
        assert_eq!(base(Some("https://ui.example"), Some("evil.io")), "https://ui.example");
        assert_eq!(base(None, Some("localhost:7700")), "http://localhost:7700");
        assert_eq!(base(None, Some("evil.io/x?y")), "");
        assert_eq!(base(None, None), "");
    }

    #[test]
    fn screens_get_an_opaque_origin() {
        let csp = |h: [(&str, &str); 5]| h.iter().find(|(k, _)| *k == "Content-Security-Policy").map(|(_, v)| v.to_string()).unwrap();
        assert!(csp(screen_headers()).starts_with("sandbox allow-scripts;"));
        assert!(!csp(screen_headers()).contains("allow-same-origin"));
        assert!(csp(page_headers()).starts_with("default-src 'none';"));
    }
}
