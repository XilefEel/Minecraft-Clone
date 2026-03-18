pub const CHUNK_SIZE: i32 = 16;

pub struct Chunk {
    pub blocks: Vec<u8>,
}

fn get_index(x: i32, y: i32, z: i32) -> usize {
    (x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_SIZE) as usize
}

impl Chunk {
    pub fn new() -> Self {
        Self {
            blocks: vec![0; (CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE) as usize],
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

    pub fn fill_flat(&mut self) {
        for x in 0..CHUNK_SIZE {
            for z in 0..CHUNK_SIZE {
                self.set_block(x, 0, z, 4); // bedrock
                for y in 1..=4 {
                    self.set_block(x, y, z, 2); // stone
                }
                for y in 5..=6 {
                    self.set_block(x, y, z, 3); // dirt
                }
                self.set_block(x, 7, z, 1); // grass
            }
        }
    }
}
