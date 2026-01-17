import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const { reset } = req.body || {};
      if (reset === true) {
        await kv.set('views', 0);
        return res.json({ views: 0 });
      }
    }

    const views = (await kv.get('views')) ?? 0;
    const newViews = await kv.incr('views');
    res.json({ views: newViews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
