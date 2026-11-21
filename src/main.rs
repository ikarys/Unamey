mod authz;
mod cache;
mod config;
mod db;
mod http;
mod jobs;
mod llm;
mod mcp;
mod models;
mod pipeline;
mod share;
mod sql;

use std::sync::Arc;

fn usage() -> ! {
    eprintln!(
        "usage: studio serve [--port 7700]   (DATABASE_URL: a PostgreSQL URL, or unset for sqlite://studio.db; PORT and STUDIO_BIND also set the address)"
    );
    std::process::exit(2);
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args.first().map(String::as_str) != Some("serve") {
        usage();
    }
    let mut port = std::env::var("PORT").ok().map(|p| p.parse().unwrap_or_else(|_| usage())).unwrap_or(7700u16);
    let mut it = args[1..].iter();
    while let Some(flag) = it.next() {
        let value = it.next().unwrap_or_else(|| usage());
        match flag.as_str() {
            "--port" => port = value.parse().unwrap_or_else(|_| usage()),
            _ => usage(),
        }
    }
    if let Err(e) = start(port).await {
        eprintln!("error: {e}");
        std::process::exit(1);
    }
}

async fn start(port: u16) -> Result<(), String> {
    let url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://studio.db".into());
    let pool = sql::Db::connect(&url).await?;
    if let sql::Db::Sqlite { pool: p, .. } = &pool {
        sql::restrict_mode(&url)?;
        sql::migrate_sqlite(p).await?;
    }
    let cfg = Arc::new(config::Config::new(pool, tokio::runtime::Handle::current(), port));
    db::load_llm_settings(&cfg).await?;
    // Bind before mark_stale: a second instance that cannot bind must not fail the first one's jobs.
    let listener = http::bind(&cfg).await?;
    jobs::mark_stale(&cfg).await?;
    http::serve(cfg, listener).await
}
