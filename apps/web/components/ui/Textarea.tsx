import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

/**
 * Textarea primitive (UI_GUIDELINES.md §7: 8px radius, matches Input).
 * Used for multi-line fields such as the profile bio.
 */
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 3, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(
      'flex w-full rounded-input border border-border bg-background px-space-3 py-space-2 text-body text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
