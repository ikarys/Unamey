//! Headless Chromium screenshots of an HTML page (used by the showcase export).

use crate::db::es;
use std::path::PathBuf;
use std::time::{Duration, Instant};

/// Screenshots the `html` page at `size` (width, height); `extra` are additional Chromium flags.
pub(crate) fn screenshot(html: &str, size: (u32, u32), extra: &[&str]) -> Result<Vec<u8>, String> {
    let nanos = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_or(0, |d| d.as_nanos());
    let dir: PathBuf = std::env::temp_dir().join(format!("studio-chromium-{}-{nanos}", std::process::id()));
    std::fs::create_dir_all(&dir).map_err(es)?;
    let out = dir.join("shot.png");
    let path = dir.join("page.html");
    let result =
        std::fs::write(&path, html).map_err(es).and_then(|()| run_chromium(&format!("file://{}", path.display()), size, &dir, &out, extra));
    let _ = std::fs::remove_dir_all(&dir);
    result
}

fn run_chromium(target: &str, size: (u32, u32), dir: &std::path::Path, out: &std::path::Path, extra: &[&str]) -> Result<Vec<u8>, String> {
    let mut child = std::process::Command::new("chromium")
        .arg("--headless")
        .arg(format!("--user-data-dir={}", dir.join("profile").display()))
        .arg(format!("--screenshot={}", out.display()))
        .args(["--hide-scrollbars", "--disable-gpu", "--no-first-run", "--virtual-time-budget=8000"])
        .arg(format!("--window-size={},{}", size.0, size.1))
        .args(extra)
        .arg(target)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| format!("cannot start chromium: {e}"))?;
    let deadline = Instant::now() + Duration::from_secs(60);
    loop {
        if child.try_wait().map_err(es)?.is_some() {
            break;
        }
        if Instant::now() > deadline {
            let _ = child.kill();
            let _ = child.wait();
            return Err("chromium timed out after 60 s".into());
        }
        std::thread::sleep(Duration::from_millis(200));
    }
    std::fs::read(out).map_err(|_| "chromium produced no screenshot".to_string())
}
