pub fn encode(blocks: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(blocks.len());
    let mut i = 0;

    while i < blocks.len() {
        let block_id = blocks[i];
        let mut run_len: usize = 1;

        while i + run_len < blocks.len()
            && blocks[i + run_len] == block_id
            && run_len < u16::MAX as usize
        {
            run_len += 1;
        }

        out.extend_from_slice(&(run_len as u16).to_le_bytes());
        out.push(block_id);

        i += run_len;
    }

    out
}
