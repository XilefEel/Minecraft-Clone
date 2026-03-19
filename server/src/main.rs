use axum::{
    Router,
    extract::{
        State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::IntoResponse,
    routing::get,
};
use rmp_serde::from_slice;
use tokio::net::TcpListener;
use uuid::Uuid;

use crate::{
    protocol::{ClientMessage, ServerMessage},
    state::{GameState, SharedState},
};
mod chunk;
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

async fn handle_socket(mut socket: WebSocket, state: SharedState) {
    let id = Uuid::new_v4().to_string();
    println!("Player {} joined the world!", id);

    let mut rx = {
        let state = state.read().await;
        state.tx.subscribe()
    };

    {
        let mut state = state.write().await;
        state.players.insert(
            id.clone(),
            crate::state::PlayerState {
                x: 0.0,
                y: 0.0,
                z: 0.0,
            },
        );
    }

    {
        let state = state.read().await;
        let _ = state
            .tx
            .send(ServerMessage::PlayerJoined { id: id.clone() });
    }

    {
        let state = state.read().await;
        for ((cx, cz), chunk) in &state.world {
            let msg = ServerMessage::ChunkData {
                cx: *cx,
                cz: *cz,
                blocks: chunk.blocks.clone(),
            };

            let bytes = rmp_serde::to_vec_named(&msg).unwrap();
            if socket.send(Message::Binary(bytes.into())).await.is_err() {
                return;
            }
        }
    }

    // main loop
    loop {
        tokio::select! {
            // message from this client
            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Binary(data))) => {
                        println!("Received message from player {}: {} bytes", id, data.len());
                        if let Ok(client_msg) = from_slice::<ClientMessage>(&data) {
                            match client_msg {
                                ClientMessage::Move { x, y, z } => {
                                    {
                                        let mut state = state.write().await;
                                        if let Some(player) = state.players.get_mut(&id) {
                                            player.x = x;
                                            player.y = y;
                                            player.z = z;
                                        }
                                    }

                                    let state = state.read().await;
                                    let _ = state.tx.send(ServerMessage::PlayerPosition {
                                        id: id.clone(), x, y, z,
                                    });
                                }
                                ClientMessage::BlockBreak { x, y, z } => {
                                    {
                                        let mut state = state.write().await;
                                        let cx = x.div_euclid(16);
                                        let cz = z.div_euclid(16);

                                        let lx = x.rem_euclid(16) as i32;
                                        let ly = y as i32;
                                        let lz = z.rem_euclid(16) as i32;

                                        if let Some(chunk) = state.world.get_mut(&(cx, cz)) {
                                            chunk.set_block(lx, ly, lz, 0);
                                        }
                                    }

                                    let state = state.read().await;
                                    let _ = state.tx.send(ServerMessage::BlockUpdate { x, y, z, block_id: 0});
                                }
                            }
                        } else {
                            println!("Failed to parse client message from player {}: {:?}", id, data);
                        }
                    }
                    _ => break,
                }
            }

            msg = rx.recv() => {
                if let Ok(msg) = msg {
                    let skip = match &msg {
                        ServerMessage::PlayerPosition { id: moved_id, .. } => moved_id == &id,
                        ServerMessage::PlayerJoined { id: joined_id } => joined_id == &id,
                        _ => false,
                    };

                    if !skip {
                        let bytes = rmp_serde::to_vec_named(&msg).unwrap();
                        if socket.send(Message::Binary(bytes.into())).await.is_err() {
                            break;
                        }
                    }
                }
            }
        }
    }

    println!("Player {} left the game!", id);

    {
        let mut state = state.write().await;
        state.players.remove(&id);
    }

    {
        let state = state.read().await;
        let _ = state.tx.send(ServerMessage::PlayerLeft { id: id.clone() });
    }
}
