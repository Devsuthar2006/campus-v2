import 'dotenv/config';
import { db } from './src/db/client.js';
import { wallPosts, postMedia, users } from './src/db/schema.js';
import { desc, eq } from 'drizzle-orm';

async function main() {
  const posts = await db.select().from(wallPosts).orderBy(desc(wallPosts.createdAt)).limit(5);
  console.log(
    'Latest Posts:',
    posts.map((p) => ({ id: p.id, body: p.body, status: p.status, universityId: p.universityId })),
  );

  if (posts.length > 0) {
    const pm = await db.select().from(postMedia).where(eq(postMedia.postId, posts[0].id));
    console.log('Media for latest post:', pm);
  }

  process.exit(0);
}
main().catch(console.error);
