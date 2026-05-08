-- In-app notification system. Single recipient per row — either a staff user
-- (user_id) OR a parent (parent_id), never both. Auto-deleted after 30 days.

CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES public.users(id)   ON DELETE CASCADE,
  parent_id   uuid        REFERENCES public.parents(id) ON DELETE CASCADE,
  type        text        NOT NULL,
  title       text        NOT NULL,
  body        text,
  link        text,
  data        jsonb,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_recipient_xor CHECK (
    (user_id IS NOT NULL AND parent_id IS NULL) OR
    (user_id IS NULL AND parent_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, read_at, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS notifications_parent_unread_idx
  ON public.notifications (parent_id, read_at, created_at DESC)
  WHERE parent_id IS NOT NULL;

-- Lightweight purge index for the 30-day cleanup
CREATE INDEX IF NOT EXISTS notifications_created_at_idx
  ON public.notifications (created_at);
