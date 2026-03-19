use noise::{NoiseFn, Perlin};

pub const CHUNK_SIZE: i32 = 16;
pub const CHUNK_HEIGHT: i32 = 64;

pub struct Chunk {
    pub blocks: Vec<u8>,
}

fn get_index(x: i32, y: i32, z: i32) -> usize {
    (x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT) as usize
}

impl Chunk {
    pub fn new() -> Self {
        Self {
            blocks: vec![0; (CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE) as usize],
        }
    }

    pub fn get_block(&self, x: i32, y: i32, z: i32) -> u8 {
        let index = (get_index(x, y, z)) as usize;
        self.blocks[index]
    }

    pub fn set_block(&mut self, x: i32, y: i32, z: i32, block: u8) {
        let index = (get_index(x, y, z)) as usize;
        self.blocks[index] = block;
    }

    // pub fn fill_flat(&mut self) {
    //     for x in 0..CHUNK_SIZE {
    //         for z in 0..CHUNK_SIZE {
    //             self.set_block(x, 0, z, 4); // bedrock
    //             for y in 1..=4 {
    //                 self.set_block(x, y, z, 2); // stone
    //             }
    //             for y in 5..=6 {
    //                 self.set_block(x, y, z, 3); // dirt
    //             }
    //             self.set_block(x, 7, z, 1); // grass
    //         }
    //     }
    // }

    pub fn fill_noise(&mut self, cx: i32, cz: i32) {
        let perlin = Perlin::new(42); // seed

        for x in 0..CHUNK_SIZE {
            for z in 0..CHUNK_SIZE {
                let world_x = (cx * CHUNK_SIZE + x) as f64;
                let world_z = (cz * CHUNK_SIZE + z) as f64;

                let n1 = perlin.get([world_x / 100.0, world_z / 100.0]);
                let n2 = perlin.get([world_x / 30.0, world_z / 30.0]);
                let n3 = perlin.get([world_x / 10.0, world_z / 10.0]);

                let n = n1 * 0.6 + n2 * 0.3 + n3 * 0.1;
                let height = (n * 8.0 + 20.0) as i32;

                for y in 0..CHUNK_HEIGHT {
                    let block = if y == 0 {
                        4 // bedrock
                    } else if y < height.saturating_sub(4) {
                        2 // stone
                    } else if y < height {
                        3 // dirt
                    } else if y == height {
                        1 // grass
                    } else {
                        0 // air
                    };

                    self.set_block(x, y, z, block);
                }
            }
        }
    }
}
