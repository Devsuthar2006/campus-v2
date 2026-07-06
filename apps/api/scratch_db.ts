import { db } from './src/db/client.js';
import { mediaRepository } from './src/repositories/mediaRepository.js';

async function run() {
  const ids = await mediaRepository.universityIdsForMedia('160bd6e4-f745-46c8-8a7f-c8272a8d4e23');
  console.log('universityIds:', ids);
  process.exit(0);
}
run().catch(console.error);
