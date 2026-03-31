use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(
    name = "minecraft-server",
    about = "A Minecraft clone server",
    long_about = None,
)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Command,
}

#[derive(Subcommand)]
pub enum Command {
    #[command(about = "List all saved worlds")]
    List,

    #[command(about = "Create a new world with a given name and seed")]
    Create {
        #[arg(help = "Name of the world")]
        world: String,
        #[arg(help = "Seed of the world")]
        seed: u64,
    },

    #[command(about = "Load an existing world and start the server")]
    Load {
        #[arg(help = "Name of the world")]
        world: String,
    },

    #[command(about = "Rename an existing world")]
    Rename {
        #[arg(help = "Current world name")]
        old: String,
        #[arg(help = "New world name")]
        new: String,
    },

    #[command(about = "Delete a world and its chunk data")]
    Delete {
        #[arg(help = "Name of the world")]
        world: String,
    },
}
