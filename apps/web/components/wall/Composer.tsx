'use client';

import { useState, type ChangeEvent } from 'react';
import type { WallCategory, WallPost, CreatePostInput } from '@campusly/shared-types';
import { ImagePlus, BarChart3, X } from 'lucide-react';
import { wallApi } from '../../lib/wall';
import { mediaApi } from '../../lib/media';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';

/**
 * Wall post composer (PUBLIC_WALL.md §3): text, anonymous mode, category, an
 * optional poll, and a single image. Minimal and calm per UI guidelines.
 */
export function Composer({
  categories,
  onCreated,
}: {
  categories: WallCategory[];
  onCreated: (post: WallPost) => void;
}) {
  const [body, setBody] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [poll, setPoll] = useState(false);
  const [options, setOptions] = useState<string[]>(['', '']);
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const media = await mediaApi.upload(file, 'image');
      setMediaId(media.id);
    } catch {
      setError('Could not attach that image.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const input: CreatePostInput = {
        postType: poll ? 'poll' : 'text',
        body: body.trim() || undefined,
        isAnonymous: anonymous,
        categoryId: categoryId || undefined,
        mediaIds: mediaId ? [mediaId] : undefined,
        pollOptions: poll ? options.map((o) => o.trim()).filter(Boolean) : undefined,
      };
      const post = await wallApi.createPost(input);
      onCreated(post);
      setBody('');
      setAnonymous(false);
      setCategoryId('');
      setPoll(false);
      setOptions(['', '']);
      setMediaId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post.');
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    !busy &&
    (poll
      ? options.filter((o) => o.trim()).length >= 2
      : body.trim().length > 0 || Boolean(mediaId));

  return (
    <Card className="flex flex-col gap-space-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share something with your campus…"
        maxLength={5000}
        className="border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-muted/30"
      />

      {poll && (
        <div className="flex flex-col gap-space-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-space-2">
              <Input
                value={opt}
                onChange={(e) =>
                  setOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))
                }
                placeholder={`Option ${i + 1}`}
                maxLength={120}
              />
              {options.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Remove option"
                  onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOptions((prev) => [...prev, ''])}
            >
              Add option
            </Button>
          )}
        </div>
      )}

      {mediaId && <p className="text-small text-success">Image attached.</p>}
      {error && <p className="text-small text-danger">{error}</p>}

      <div className="flex flex-wrap items-center gap-space-2">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-9 rounded-input border border-border bg-background px-space-2 text-small text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center gap-space-1 text-small text-muted-foreground">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
          />
          Anonymous
        </label>

        <Button
          type="button"
          variant={poll ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setPoll((v) => !v)}
        >
          <BarChart3 className="h-4 w-4" />
          <span className="ml-space-1">Poll</span>
        </Button>

        {!poll && (
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void onImage(e)}
            />
            <span className="inline-flex h-9 items-center gap-space-1 rounded-button px-space-2 text-small text-muted-foreground hover:bg-surface">
              <ImagePlus className="h-4 w-4" /> Image
            </span>
          </label>
        )}

        <Button className="ml-auto" size="sm" disabled={!canSubmit} onClick={() => void submit()}>
          Post
        </Button>
      </div>
    </Card>
  );
}
