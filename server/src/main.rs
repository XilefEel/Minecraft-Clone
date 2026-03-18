use axum::{
    Router,
    extract::ws::{WebSocket, WebSocketUpgrade},
    response::IntoResponse,
    routing::get,
};
use tokio::net::TcpListener;

use crate::{chunk::Chunk, protocol::ServerMessage};
mod chunk;
mod protocol;

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/health", get(health))
        .route("/ws", get(ws_handler));

    let listener = TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Server running on http://localhost:3000");

    axum::serve(listener, app).await.unwrap();
}

async fn health() -> &'static str {
    "ok"
}

async fn ws_handler(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(handle_socket)
}

async fn handle_socket(mut socket: WebSocket) {
    println!("Client connected!");

    let mut chunk = Chunk::new();
    chunk.fill_flat();

    let msg = ServerMessage::ChunkData {
        cx: 0,
        cz: 0,
        blocks: chunk.blocks,
    };

    let bytes = rmp_serde::to_vec_named(&msg).unwrap();

    socket
        .send(axum::extract::ws::Message::Binary(bytes.into()))
        .await
        .unwrap();

    println!("Chunk Sent!");
}
