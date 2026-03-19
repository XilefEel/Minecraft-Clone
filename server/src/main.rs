use axum::{
    Router,
    extract::{State, ws::WebSocketUpgrade},
    response::IntoResponse,
    routing::get,
};
use tokio::net::TcpListener;

use crate::{
    handler::handle_socket,
    state::{GameState, SharedState},
};

mod chunk;
mod handler;
mod protocol;
mod state;

#[tokio::main]
async fn main() {
    let (shared_state, _) = GameState::new();

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
