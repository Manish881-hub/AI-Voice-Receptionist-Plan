-- Future PostgreSQL schema for the reservation backend.
-- The JSON-file service (src/services/reservation.service.ts) implements the same
-- semantics; when ready, swap the service internals to this table and keep the
-- tool signatures unchanged.

CREATE TABLE IF NOT EXISTS reservations (
  confirmation_code TEXT PRIMARY KEY CHECK (confirmation_code ~ '^BOOK-[0-9]{5}$'),
  guest_name        TEXT NOT NULL CHECK (char_length(guest_name) >= 2),
  phone             TEXT NOT NULL DEFAULT '',
  check_in          DATE NOT NULL,
  check_out         DATE NOT NULL CHECK (check_out > check_in),
  room_type         TEXT NOT NULL CHECK (room_type IN ('deluxe', 'suite', 'villa')),
  guests            INTEGER NOT NULL CHECK (guests BETWEEN 1 AND 6),
  nights            INTEGER NOT NULL CHECK (nights BETWEEN 1 AND 60),
  total_price       INTEGER NOT NULL CHECK (total_price >= 0),
  status            TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservations_dates
  ON reservations (room_type, status, check_in, check_out);

-- Inventory (matches src/config/hotel.ts ROOM_TYPES):
--   deluxe 12 rooms, suite 5 rooms, villa 3 rooms (20 total).
-- Enforce capacity in the service layer with:
--   SELECT count(*) FROM reservations
--    WHERE room_type = $1 AND status = 'confirmed'
--      AND check_in <= $night AND $night < check_out;
