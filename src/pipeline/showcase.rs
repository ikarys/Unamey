//! Showcase export: a generated screen framed as a browser window (desktop) or a phone (mobile)
//! on a soft gradient, screenshotted by headless Chromium.
//! The page is untrusted (LLM output): it runs in a sandboxed srcdoc iframe (scripts, no same origin)
//! and Chromium reaches only the Tailwind CDN and Google Fonts; everything else, loopback included,
//! goes to a dead proxy.

use crate::pipeline::capture;

const MAX_HTML: usize = 400 * 1024;
const LOCKDOWN: [&str; 2] =
    ["--proxy-server=http://127.0.0.1:9", "--proxy-bypass-list=cdn.tailwindcss.com;fonts.googleapis.com;fonts.gstatic.com;<-loopback>"];

// ponytail: one Chromium at a time for the whole server; a small pool if exports queue up.
static ONE: std::sync::Mutex<()> = std::sync::Mutex::new(());

fn escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '"' => out.push_str("&quot;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '\'' => out.push_str("&#39;"),
            _ => out.push(c),
        }
    }
    out
}

fn page(html: &str, mobile: bool) -> String {
    let esc = escape(html);
    if mobile {
        format!(
            r#"<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;overflow:hidden;width:1080px;height:1350px;background:linear-gradient(135deg,#eef0ff 0%,#f6efff 50%,#ffeef4 100%);display:flex;align-items:center;justify-content:center;">
  <div style="position:relative;width:390px;padding:14px;border-radius:58px;background:#111;box-shadow:0 40px 100px rgba(30,30,60,.28);transform:scale(1.3);">
    <div style="position:absolute;top:14px;left:50%;transform:translateX(-50%);width:120px;height:30px;background:#111;border-radius:0 0 18px 18px;"></div>
    <iframe sandbox="allow-scripts" srcdoc="{esc}" style="display:block;border:0;width:390px;height:844px;border-radius:44px;background:#fff"></iframe>
  </div>
</body>
</html>"#
        )
    } else {
        format!(
            r#"<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;overflow:hidden;width:1920px;height:1200px;background:linear-gradient(135deg,#eef0ff 0%,#f6efff 50%,#ffeef4 100%);display:flex;align-items:center;justify-content:center;">
  <div style="width:1440px;border-radius:14px;overflow:hidden;box-shadow:0 40px 100px rgba(30,30,60,.28);background:#fff;">
    <div style="height:40px;background:#f1f1f4;border-bottom:1px solid #e2e2e8;display:flex;align-items:center;padding-left:16px;gap:8px;">
      <span style="display:block;width:12px;height:12px;border-radius:50%;background:#ff5f57"></span>
      <span style="display:block;width:12px;height:12px;border-radius:50%;background:#febc2e"></span>
      <span style="display:block;width:12px;height:12px;border-radius:50%;background:#28c840"></span>
    </div>
    <iframe sandbox="allow-scripts" srcdoc="{esc}" style="display:block;border:0;width:1440px;height:860px;background:#fff"></iframe>
  </div>
</body>
</html>"#
        )
    }
}

pub fn render(html: &str, mobile: bool) -> Result<Vec<u8>, String> {
    if html.len() > MAX_HTML {
        return Err("page too large for a showcase".into());
    }
    let _guard = ONE.lock().unwrap_or_else(|e| e.into_inner());
    capture::screenshot(&page(html, mobile), if mobile { (1080, 1350) } else { (1920, 1200) }, &LOCKDOWN)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chromium_reaches_only_the_allowed_hosts() {
        assert_eq!(LOCKDOWN[0], "--proxy-server=http://127.0.0.1:9");
        assert_eq!(LOCKDOWN[1], "--proxy-bypass-list=cdn.tailwindcss.com;fonts.googleapis.com;fonts.gstatic.com;<-loopback>");
    }

    #[test]
    fn page_escapes_the_screen() {
        let desktop = page("<p class=\"x\">a & b</p></iframe><script>x</script>", false);
        assert!(desktop.contains("&lt;/iframe&gt;"));
        assert!(desktop.contains("&quot;x&quot;"));
        assert!(desktop.contains("&amp;"));
        assert_eq!(desktop.matches("</iframe>").count(), 1);

        let mobile = page("<p class=\"x\">a & b</p></iframe><script>x</script>", true);
        assert!(mobile.contains("390px"));
    }
}
