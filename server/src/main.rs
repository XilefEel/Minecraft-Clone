use axum::{
    Router,
    extract::{State, ws::WebSocketUpgrade},
    response::IntoResponse,
    routing::get,
};
use clap::Parser;
use tokio::net::TcpListener;

use crate::{
    cli::{Cli, Command},
    handler::handle_socket,
    state::{GameState, SharedState},
};

mod chunk;
mod cli;
mod handler;
mod protocol;
mod state;
mod world_registry;

use world_registry::{create, delete, list, load, rename};

#[tokio::main]
async fn main() {
    let cli = Cli::parse();

    let (world_name, seed) = match cli.command {
        Command::Create { world, seed } => {
            create(&world, seed);
            (world, seed)
        }
        Command::Load { world } => {
            let seed = load(&world);
            (world, seed)
        }
        Command::List => {
            list();
            std::process::exit(0);
        }
        Command::Delete { world } => {
            delete(&world);
            std::process::exit(0);
        }
        Command::Rename { old, new } => {
            rename(&old, &new);
            std::process::exit(0);
        }
    };

    let (shared_state, _) = GameState::new(&world_name, seed);

    let app = Router::new()
        .route("/health", get(health))
        .route("/ws", get(ws_handler))
        .with_state(shared_state);

    let listener = TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Server running on http://localhost:3000");

    axum::serve(listener, app).await.unwrap();
}

async fn health() -> &'static str {
    "ok"
}

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<SharedState>) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}
